import { NextRequest, NextResponse } from 'next/server';
import { default as pdfParse } from 'pdf-parse';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  console.warn('Warning: HUGGINGFACE_API_KEY is not set');
}

// Config for App Router in Next.js, using proper export syntax
export const dynamic = 'force-dynamic'; // No caching
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  console.log('PDF summarize API called');
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers, status: 204 });
  }
  
  try {
    // First check for valid API key
    if (!apiKey) {
      console.log('Using mock data due to missing API key');
      return NextResponse.json({
        summary: "This is a mock summary of your PDF. The document appears to contain text content that would normally be analyzed by our AI to provide a concise summary. To get actual summaries, please configure your Hugging Face API key in the .env.local file.",
        mockData: true,
        message: "Using mock data. Please add your HUGGINGFACE_API_KEY to .env.local file."
      }, { headers });
    }

    // Get form data with error handling
    let formData;
    try {
      console.log('Attempting to parse form data');
      formData = await req.formData();
      console.log('Form data parsed successfully');
    } catch (error) {
      console.error('Error parsing form data:', error);
      return NextResponse.json(
        { 
          error: 'Failed to parse form data',
          summary: "Error: Could not parse the uploaded file data."
        },
        { status: 400, headers }
      );
    }

    const file = formData.get('file') as File;
    console.log('File from form data:', file ? `${file.name} (${file.size} bytes)` : 'No file found');

    if (!file) {
      return NextResponse.json(
        { 
          error: 'No file provided',
          summary: "Error: No PDF file was uploaded."
        },
        { status: 400, headers }
      );
    }

    // Create a mock summary for testing
    const useMockSummary = true; // Set to true to bypass PDF parsing and API call
    if (useMockSummary) {
      return NextResponse.json({
        summary: "This is a mock summary generated directly from the API route. It is intended for testing purposes when the PDF parsing or Hugging Face API is not working properly. In a real scenario, this text would contain a concise summary of the key points from your PDF document, making it easier to understand the content without reading the entire text.",
        mockData: true
      }, { headers });
    }

    // Convert File to Buffer with error handling
    let buffer;
    try {
      console.log('Converting file to buffer');
      buffer = Buffer.from(await file.arrayBuffer());
      console.log('Buffer created, size:', buffer.length);
    } catch (error) {
      console.error('Error converting file to buffer:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process file',
          summary: "Error: Could not process the uploaded file."
        },
        { status: 400, headers }
      );
    }
    
    // Parse PDF with error handling
    let text;
    try {
      console.log('Parsing PDF with pdf-parse');
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
      console.log('PDF parsed successfully, text length:', text.length);
      
      if (!text || text.trim().length === 0) {
        console.log('PDF has no extractable text');
        return NextResponse.json(
          { 
            error: 'PDF has no extractable text',
            summary: "Error: No text could be extracted from the PDF. The file might be empty, scanned, or protected."
          },
          { status: 400, headers }
        );
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return NextResponse.json(
        { 
          error: 'Failed to parse PDF',
          summary: "Error: Could not extract text from the PDF. Please make sure it's a valid PDF file."
        },
        { status: 400, headers }
      );
    }

    // Truncate the text if it's too long (Hugging Face models typically have token limits)
    const maxLength = 1024; // Set an appropriate limit based on the model
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "..."
      : text;

    console.log('Generating summary with Hugging Face API');
    
    try {
      // Call Hugging Face API for summarization
      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json" 
          },
          method: "POST",
          body: JSON.stringify({
            inputs: truncatedText,
            parameters: {
              max_length: 150,
              min_length: 30,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API error:", response.status, errorText);
        throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Summary generated successfully');
      
      let summary;
      if (Array.isArray(result) && result.length > 0) {
        summary = result[0].summary_text || result[0].generated_text || "No summary could be generated";
      } else {
        summary = result.summary_text || result.generated_text || "No summary could be generated";
      }

      return NextResponse.json({ summary }, { headers });
    } catch (apiError) {
      console.error('Error calling Hugging Face API:', apiError);
      
      // Provide a mock summary as fallback when the API fails
      return NextResponse.json({
        summary: "API error fallback summary: " + truncatedText.substring(0, 200) + "...",
        error: apiError instanceof Error ? apiError.message : String(apiError),
        mockData: true
      }, { headers });
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    // Provide a more detailed error message
    const errorDetails = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDF',
        summary: `Error: ${errorDetails}`,
        details: errorDetails
      },
      { status: 500, headers }
    );
  }
} 