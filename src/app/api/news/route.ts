import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines';

// Check if API key is available
if (!NEWS_API_KEY) {
  console.error('Error: NEWS_API_KEY is not set in environment variables');
}

export async function GET(req: NextRequest) {
  try {
    // Check for valid API key
    if (!NEWS_API_KEY) {
      return NextResponse.json(
        { 
          error: 'API key not configured',
          message: "News API key is not configured. Please add your NEWS_API_KEY to .env.local file."
        },
        { status: 400 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category') || 'general';
    const country = searchParams.get('country') || 'us';

    console.log(`Fetching news for category: ${category}, country: ${country}`);

    try {
      const response = await axios.get(NEWS_API_URL, {
        params: {
          country,
          category,
          apiKey: NEWS_API_KEY,
        },
      });

      console.log(`Retrieved ${response.data.articles?.length || 0} articles from News API`);
      return NextResponse.json(response.data);
    } catch (error) {
      const apiError = error as AxiosError;
      console.error('News API error:', apiError.response?.status, apiError.response?.data || apiError.message);
      
      // Handle specific News API errors
      if (apiError.response?.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid API key',
            message: "Your News API key is invalid or expired. Please check your API key."
          },
          { status: 401 }
        );
      } else if (apiError.response?.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: "You have exceeded the rate limit for the News API. Please try again later."
          },
          { status: 429 }
        );
      }
      
      throw apiError; // Re-throw to be caught by outer try/catch
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch news',
        message: "An error occurred while fetching news. Please try again later.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 