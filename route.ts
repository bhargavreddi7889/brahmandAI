import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;

export async function GET(req: NextRequest) {
  try {
    // Get environment information
    const environmentInfo = {
      huggingfaceApiKey: apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 'Not set',
      huggingfaceApiKeyLength: apiKey?.length || 0,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      timeChecked: new Date().toISOString(),
    };

    // Check if Hugging Face API is accessible
    let huggingFaceStatus = 'Unchecked';
    let modelInfo = null;

    if (apiKey) {
      try {
        // Try to access the model info endpoint
        const response = await fetch(
          "https://api-inference.huggingface.co/models/facebook/bart-large-cnn", 
          {
            method: 'HEAD',
            headers: { Authorization: `Bearer ${apiKey}` }
          }
        );

        huggingFaceStatus = response.ok ? 'Accessible' : `Error: ${response.status} ${response.statusText}`;
        
        // If accessible, try to get model info
        if (response.ok) {
          const modelResponse = await fetch(
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            {
              method: 'POST',
              headers: { 
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json" 
              },
              body: JSON.stringify({
                inputs: "Hello, this is a test message to check if the Hugging Face API is working properly. Please summarize this text.",
                parameters: {
                  max_length: 30,
                  min_length: 10,
                }
              }),
            }
          );

          if (modelResponse.ok) {
            modelInfo = await modelResponse.json();
          } else {
            modelInfo = {
              error: `${modelResponse.status} ${modelResponse.statusText}`,
              message: await modelResponse.text()
            };
          }
        }
      } catch (error) {
        huggingFaceStatus = `Error checking API: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Debug information for Hugging Face API',
      environmentInfo,
      huggingFaceStatus,
      modelInfo,
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Error getting debug information',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 