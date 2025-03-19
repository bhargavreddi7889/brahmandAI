import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse/lib/pdf-parse';
import axios from 'axios';

// Force dynamic rendering, no caching
export const dynamic = 'force-dynamic';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  console.warn('Warning: HUGGINGFACE_API_KEY is not set');
}

// More advanced text cleaning for PDFs
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  // Remove excessive whitespace and normalize line breaks
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Remove page numbers that appear alone on a line (common in PDFs)
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  cleaned = cleaned.replace(/^Page\s+\d+\s*$/gim, '');
  
  // Remove orphaned headers/footers often found in PDFs
  cleaned = cleaned.replace(/^\s*(?:[A-Z][a-z]+\s*)+\s*\|\s*\d+\s*$/gm, '');
  
  // Fix hyphenated words that get split across lines
  cleaned = cleaned.replace(/(\w+)-\s+(\w+)/g, '$1$2');
  
  // Fix broken sentences (when paragraphs are split across pages)
  cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
  
  // Remove common PDF artifacts
  cleaned = cleaned.replace(/^\s*\[\s*\d+\s*\]\s*$/gm, ''); // Reference brackets
  cleaned = cleaned.replace(/https?:\/\/\S+/g, ''); // Remove URLs that might distract
  
  return cleaned.trim();
}

// Improved function to split text into chunks that respects paragraph boundaries
function splitTextIntoChunks(text: string, maxChunkLength: number = 1000): string[] {
  // First split by double line breaks (paragraphs)
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max length, start a new chunk
    if (currentChunk.length + paragraph.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      // Otherwise add to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  // Add the final chunk if it's not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Extract key entities and terms from text
async function extractKeyEntities(text: string): Promise<string[]> {
  try {
    if (!apiKey) return [];
    
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/dslim/bert-base-NER',
      { inputs: text.slice(0, 5000) }, // Use just the first part to identify main entities
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );
    
    // Process entities, removing duplicates
    const entities = new Set<string>();
    if (Array.isArray(response.data)) {
      response.data.forEach((item: any) => {
        if (item.entity_group && item.word && 
            ['PER', 'ORG', 'LOC'].includes(item.entity_group)) {
          entities.add(item.word.replace(/^#/, ''));
        }
      });
    }
    
    return Array.from(entities);
  } catch (error) {
    console.warn('Entity extraction failed:', error);
    return [];
  }
}

// Choose the best model based on content type and length
function selectSummarizationModel(text: string, entities: string[]): string {
  // For scientific or technical documents (heuristic detection)
  const hasScientificTerms = /(?:analysis|experiment|methodology|hypothesis|algorithm|statistical|framework|neural|network)/i.test(text);
  const hasCodeBlocks = /(?:function|const|var|let|if \(|for \(|while \(|class |import |from )/i.test(text);
  
  if (text.length > 10000) {
    // For very long documents, use models optimized for longer inputs
    return 'facebook/bart-large-cnn';
  } else if (hasScientificTerms) {
    // Better for scientific content
    return 'sshleifer/distilbart-cnn-12-6';
  } else if (hasCodeBlocks) {
    // Better for code/technical content
    return 'google/pegasus-xsum';
  } else {
    // Default model with good general performance
    return 'facebook/bart-large-cnn';
  }
}

export async function POST(req: NextRequest) {
  console.log('PDF summarization endpoint called');
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
  
  try {
    // First check for valid API key
    if (!apiKey) {
      return NextResponse.json({
        error: 'API key not configured',
        summary: "Error: Hugging Face API key is not configured. Please add your HUGGINGFACE_API_KEY to .env.local file."
      }, { status: 400, headers });
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

    // Check file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Uploaded file must be a PDF' }, { status: 400, headers });
    }

    // Get the PDF file as a buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    console.log(`Parsing PDF: ${file.name}, size: ${fileBuffer.length} bytes`);
    
    // Parse the PDF
    const pdfData = await pdfParse(fileBuffer);
    
    // Enhanced PDF text extraction and cleaning
    const extractedText = cleanExtractedText(pdfData.text);
    console.log(`Extracted ${extractedText.length} characters of text`);
    
    // If document is empty or too short for meaningful summary
    if (extractedText.length < 100) {
      return NextResponse.json({ 
        summary: "The PDF appears to be empty or contains very little text content.",
        metadata: {
          title: file.name,
          pageCount: pdfData.numpages || 0,
          wordCount: 0,
          author: pdfData.info?.Author || 'Unknown',
          creationDate: pdfData.info?.CreationDate || 'Unknown'
        }
      }, { headers });
    }

    // Extract key entities to improve summarization context
    const entities = await extractKeyEntities(extractedText);
    console.log('Extracted key entities:', entities);
    
    // Choose the best model for this content
    const modelName = selectSummarizationModel(extractedText, entities);
    console.log(`Selected summarization model: ${modelName}`);
    
    // Smart chunking for better paragraph cohesion
    const textChunks = extractedText.length > 4000 
      ? splitTextIntoChunks(extractedText, 4000)
      : [extractedText];
    
    console.log(`Document split into ${textChunks.length} chunks for processing`);
    
    // Build a comprehensive summary
    let finalSummary = '';
    let summaryPromises = [];
    
    // Limit to first few chunks for very large documents
    const chunksToProcess = textChunks.length > 3 ? textChunks.slice(0, 3) : textChunks;
    
    // Process chunks in parallel for speed
    for (const chunk of chunksToProcess) {
      summaryPromises.push(
        axios.post(
          `https://api-inference.huggingface.co/models/${modelName}`,
          {
            inputs: chunk,
            parameters: {
              max_length: 200,
              min_length: 50,
              do_sample: false,
              temperature: 1.0
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout
          }
        ).catch(error => {
          console.error('Error from Hugging Face API:', error);
          return { data: null, error };
        })
      );
    }
    
    // Wait for all summaries to be generated
    const summaryResults = await Promise.all(summaryPromises);
    
    // Combine the results
    for (let i = 0; i < summaryResults.length; i++) {
      const result = summaryResults[i];
      
      if (result.data) {
        const summaryText = Array.isArray(result.data) 
          ? result.data[0]?.summary_text || ''
          : result.data.summary_text || '';
          
        finalSummary += (i > 0 ? "\n\n" : "") + summaryText;
      } else {
        finalSummary += (i > 0 ? "\n\n" : "") + "Failed to generate summary for this section.";
      }
    }
    
    // Trim and clean up the final summary
    finalSummary = finalSummary.trim();
    
    // For very large documents, add a note
    if (textChunks.length > chunksToProcess.length) {
      finalSummary += "\n\n[Note: This summary covers only the first portion of the document due to its length.]";
    }
    
    // Add document metadata to the response
    const wordCount = extractedText.split(/\s+/).length;
    
    const response = {
      summary: finalSummary,
      metadata: {
        title: file.name,
        pageCount: pdfData.numpages,
        wordCount: wordCount,
        author: pdfData.info?.Author || 'Unknown',
        creationDate: pdfData.info?.CreationDate || 'Unknown'
      },
      entities: entities.length > 0 ? entities : undefined
    };
    
    return NextResponse.json(response, { headers });
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

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 