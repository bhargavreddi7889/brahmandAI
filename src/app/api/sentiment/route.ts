import { NextRequest, NextResponse } from 'next/server';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  console.warn('Warning: HUGGINGFACE_API_KEY is not set');
}

export async function POST(req: NextRequest) {
  try {
    // Check for valid API key
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'API key not configured',
          message: 'Hugging Face API key is not configured. Please add your HUGGINGFACE_API_KEY to .env.local file.'
        },
        { status: 400 }
      );
    }
    
    // Parse request body
    let text;
    try {
      const body = await req.json();
      text = body.text;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          sentiment: 0,
          confidence: 0,
        },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { 
          error: 'Text is required',
          sentiment: 0,
          confidence: 0,
        },
        { status: 400 }
      );
    }

    console.log('Analyzing sentiment with Hugging Face API');
    
    // Use distilbert-base-uncased-finetuned-sst-2-english for sentiment analysis
    const modelName = "distilbert-base-uncased-finetuned-sst-2-english";
    
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${modelName}`,
        {
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json" 
          },
          method: "POST",
          body: JSON.stringify({ inputs: text }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API error:", response.status, errorText);
        throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Sentiment analysis result:', result);
      
      // Map the Hugging Face result to our expected format
      // The model returns an array of labels with scores
      if (Array.isArray(result) && result.length > 0) {
        const labels = result[0];
        
        // Extract the positive and negative scores
        let positiveScore = 0;
        let negativeScore = 0;
        let highestConfidence = 0;
        
        for (const item of labels) {
          if (item.label === "POSITIVE") {
            positiveScore = item.score;
          } else if (item.label === "NEGATIVE") {
            negativeScore = item.score;
          }
          
          if (item.score > highestConfidence) {
            highestConfidence = item.score;
          }
        }
        
        // Map to -1 to 1 scale
        // If positive score > negative score, result is positive (0 to 1)
        // If negative score > positive score, result is negative (-1 to 0)
        let sentimentValue = 0;
        if (positiveScore > negativeScore) {
          sentimentValue = positiveScore;
        } else {
          sentimentValue = -negativeScore;
        }
        
        return NextResponse.json({
          sentiment: sentimentValue,
          confidence: highestConfidence
        });
      } else {
        console.error('Unexpected response format from Hugging Face API:', result);
        return NextResponse.json({
          sentiment: 0,
          confidence: 0,
          error: 'Unexpected response format from sentiment analysis API'
        });
      }
    } catch (error) {
      console.error('Error from sentiment analysis model:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Provide a more detailed error message
    const errorDetails = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze sentiment',
        sentiment: 0,
        confidence: 0,
        details: errorDetails
      },
      { status: 500 }
    );
  }
} 