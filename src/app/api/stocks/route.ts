import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const HUGGING_FACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Mock data generator for fallback
function generateMockStockData(symbol: string) {
  const basePrice = Math.random() * 1000 + 50;
  const change = (Math.random() * 20) - 10;
  const changePercent = (change / basePrice) * 100;
  
  // Generate 30 days of historical data
  const historicalData = [];
  let currentPrice = basePrice - (change * 15); // Start 15 days ago from current price trend
  
  for (let i = 30; i > 0; i--) {
    // Add some randomness to the price movement
    const dailyChange = (Math.random() * 2 - 1) * (basePrice * 0.02);
    currentPrice += dailyChange;
    
    // Don't allow negative prices
    if (currentPrice < 1) currentPrice = 1;
    
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    historicalData.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(currentPrice.toFixed(2))
    });
  }
  
  return {
    symbol,
    price: parseFloat(basePrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    sentiment: Math.random() > 0.5 ? 'Positive' : (Math.random() > 0.5 ? 'Neutral' : 'Negative'),
    sentimentScore: Math.random() * 2 - 1,
    historicalData
  };
}

async function getStockData(symbol: string) {
  try {
    console.log(`Fetching stock data for: ${symbol}`);
    console.log(`Alpha Vantage API key available: ${!!ALPHA_VANTAGE_API_KEY}`);
    
    // Fetch real-time stock data
    const quoteResponse = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    console.log(`Quote API response status: ${quoteResponse.status}`);
    console.log(`Quote API response data keys: ${Object.keys(quoteResponse.data).join(', ')}`);

    // Check if we got rate limited or other API issues
    if (quoteResponse.data?.Note || quoteResponse.data?.['Error Message'] || !quoteResponse.data?.['Global Quote'] || Object.keys(quoteResponse.data['Global Quote']).length === 0) {
      console.warn('Alpha Vantage API returned an error or empty response:', quoteResponse.data);
      console.log('Falling back to mock data');
      return generateMockStockData(symbol);
    }

    // Fetch historical data
    const historicalResponse = await axios.get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    console.log(`Historical API response status: ${historicalResponse.status}`);
    console.log(`Historical API response data keys: ${Object.keys(historicalResponse.data).join(', ')}`);

    // Check if historical data has issues
    if (historicalResponse.data?.Note || historicalResponse.data?.['Error Message'] || !historicalResponse.data?.['Time Series (Daily)']) {
      console.warn('Alpha Vantage historical data API returned an error:', historicalResponse.data);
      console.log('Falling back to mock data');
      return generateMockStockData(symbol);
    }

    const quoteData = quoteResponse.data['Global Quote'];
    const historicalData = historicalResponse.data['Time Series (Daily)'];

    // Process historical data
    const historicalPrices = Object.entries(historicalData)
      .slice(0, 30) // Get last 30 days
      .map(([date, data]: [string, any]) => ({
        date,
        price: parseFloat(data['4. close']),
      }))
      .reverse();

    // If we don't have 30 days of data, fall back to mock
    if (historicalPrices.length < 15) {
      console.warn('Not enough historical data points, falling back to mock data');
      return generateMockStockData(symbol);
    }

    try {
      // Calculate sentiment using Hugging Face API
      const sentimentResponse = await axios.post(
        'https://api-inference.huggingface.co/models/finiteautomata/bertweet-base-sentiment-analysis',
        {
          inputs: `The stock price of ${symbol} is ${quoteData['05. price']} with a change of ${quoteData['09. change']} (${quoteData['10. change percent']}).`,
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          },
          timeout: 5000 // 5 second timeout
        }
      );

      const sentiment = sentimentResponse.data[0];
      const sentimentScore = sentiment.label === 'POS' ? 1 : sentiment.label === 'NEG' ? -1 : 0;
      const sentimentText = sentiment.label === 'POS' ? 'Positive' : sentiment.label === 'NEG' ? 'Negative' : 'Neutral';

      return {
        symbol,
        price: parseFloat(quoteData['05. price']),
        change: parseFloat(quoteData['09. change']),
        changePercent: parseFloat(quoteData['10. change percent']),
        sentiment: sentimentText,
        sentimentScore,
        historicalData: historicalPrices,
      };
    } catch (sentimentError) {
      console.error('Error getting sentiment:', sentimentError);
      
      // Return data with default sentiment if Hugging Face fails
      return {
        symbol,
        price: parseFloat(quoteData['05. price']),
        change: parseFloat(quoteData['09. change']),
        changePercent: parseFloat(quoteData['10. change percent']),
        sentiment: 'Neutral',
        sentimentScore: 0,
        historicalData: historicalPrices,
      };
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    console.log('Falling back to mock data due to error');
    return generateMockStockData(symbol);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || 'AAPL';
  
  try {
    // Always attempt to get stock data, with fallbacks in place
    const stockData = await getStockData(symbol);
    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Error in stocks API:', error);
    // Final fallback - generate mock data for the frontend
    const mockData = generateMockStockData(symbol);
    return NextResponse.json(mockData);
  }
} 