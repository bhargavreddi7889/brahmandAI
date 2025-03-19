import { NextRequest, NextResponse } from 'next/server';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  console.warn('Warning: HUGGINGFACE_API_KEY is not set');
}

// Define chat command patterns for specific actions
const COMMAND_PATTERNS = {
  weather: /(?:what's|what is|how's|how is) the weather(?: like)?(?: in| at)? ([a-zA-Z ]+)/i,
  stockPrice: /(?:what's|what is|how's|how is) (?:the )?(?:stock|price)(?: (?:of|for))? ([A-Z]{1,5})/i,
  news: /(?:show|get|fetch|tell) (?:me )?(?:the )?news(?: about| on| for)? ?([a-zA-Z ]*)/i,
  translate: /(?:translate|convert) ["'](.+?)["'] (?:to|into) ([a-zA-Z]+)/i,
  addTodo: /(?:add|create|make) (?:a )?(?:new )?(?:todo|task|reminder) (?:to|about|for)? (.+)/i,
  sentiment: /(?:analyze|check) (?:sentiment|feeling|emotion) (?:for|of|about) ["'](.+?)["']/i,
  help: /(?:help|assist|guidance|commands|what can you do)/i,
  time: /(?:what|tell me)(?: is)? the (?:current )?time/i,
  date: /(?:what|tell me)(?: is)? (?:today's|the current) date/i,
  joke: /(?:tell|say)(?:me)? a joke/i
};

// Command handlers to generate appropriate responses
const commandHandlers = {
  help: async (): Promise<string> => {
    return `I can help you with several tasks through voice commands:
1. Get weather: "What's the weather in London?"
2. Check stocks: "What's the stock price of AAPL?"
3. Read news: "Show me news about technology"
4. Translate text: "Translate 'Hello world' to Spanish"
5. Analyze sentiment: "Analyze sentiment for 'I love this product'"
6. Ask about the time: "What is the current time?"
7. Ask about the date: "What is today's date?"
8. Request a joke: "Tell me a joke"
9. Chat about any topic you'd like to discuss
What would you like to do?`;
  },
  time: async (): Promise<string> => {
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  },
  date: async (): Promise<string> => {
    return `Today's date is ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}.`;
  },
  joke: async (): Promise<string> => {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "What do you call a fake noodle? An impasta!",
      "Why did the scarecrow win an award? Because he was outstanding in his field!",
      "Why don't eggs tell jokes? They'd crack each other up!",
      "What's the best thing about Switzerland? I don't know, but the flag is a big plus!",
      "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
      "Why was the math book sad? It had too many problems.",
      "What's orange and sounds like a parrot? A carrot!",
      "How do you organize a space party? You planet!",
      "Why did the bicycle fall over? Because it was two-tired!"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
};

// Context tracking for improved conversations
interface ConversationContext {
  previousTopic?: string;
  recentEntities?: string[];
  messageCount: number;
  lastCommand?: string;
}

// Function to detect commands from natural language input
function detectCommands(text: string): { command: string | null; params: string[] } {
  // Check for help command first
  if (COMMAND_PATTERNS.help.test(text)) {
    return { command: 'help', params: [] };
  }
  
  // Check for time command
  if (COMMAND_PATTERNS.time.test(text)) {
    return { command: 'time', params: [] };
  }
  
  // Check for date command
  if (COMMAND_PATTERNS.date.test(text)) {
    return { command: 'date', params: [] };
  }
  
  // Check for joke command
  if (COMMAND_PATTERNS.joke.test(text)) {
    return { command: 'joke', params: [] };
  }
  
  // Check for weather command
  const weatherMatch = text.match(COMMAND_PATTERNS.weather);
  if (weatherMatch && weatherMatch[1]) {
    return { command: 'weather', params: [weatherMatch[1].trim()] };
  }
  
  // Check for stock price command
  const stockMatch = text.match(COMMAND_PATTERNS.stockPrice);
  if (stockMatch && stockMatch[1]) {
    return { command: 'stock', params: [stockMatch[1].trim()] };
  }
  
  // Check for news command
  const newsMatch = text.match(COMMAND_PATTERNS.news);
  if (newsMatch) {
    return { command: 'news', params: newsMatch[1] ? [newsMatch[1].trim()] : ['general'] };
  }
  
  // Check for translation command
  const translateMatch = text.match(COMMAND_PATTERNS.translate);
  if (translateMatch && translateMatch[1] && translateMatch[2]) {
    return { command: 'translate', params: [translateMatch[1].trim(), translateMatch[2].trim()] };
  }
  
  // Check for sentiment analysis command
  const sentimentMatch = text.match(COMMAND_PATTERNS.sentiment);
  if (sentimentMatch && sentimentMatch[1]) {
    return { command: 'sentiment', params: [sentimentMatch[1].trim()] };
  }
  
  // No specific command found, treat as general chat
  return { command: null, params: [] };
}

// Execute a command with its parameters
async function executeCommand(command: string, params: string[]): Promise<string> {
  if (command === 'help') {
    return await commandHandlers.help();
  }
  
  if (command === 'time') {
    return await commandHandlers.time();
  }
  
  if (command === 'date') {
    return await commandHandlers.date();
  }
  
  if (command === 'joke') {
    return await commandHandlers.joke();
  }
  
  // In a real implementation, you would add handlers for other commands here
  return `I recognized your ${command} command with parameters: ${params.join(', ')}. This feature will be implemented soon.`;
}

// Fallback answers for when the model fails to respond
const fallbackResponses = [
  "I'm still learning, but I'd be happy to help you with that if you could rephrase your question.",
  "I'm not sure I understood correctly. Could you please try asking in a different way?",
  "That's an interesting question. Let me think about it and get back to you.",
  "I'm having trouble processing that request. Could we try something else?",
  "I'd like to help with that, but I'm not sure I have the right information. Could you provide more details?"
];

// Main API handler
export async function POST(req: NextRequest) {
  try {
    // Check for valid API key
    if (!apiKey) {
      return NextResponse.json(
        { 
          response: "I'm sorry, but the Hugging Face API key is not configured. Please add your HUGGINGFACE_API_KEY to the .env.local file to enable me to respond to your messages.",
          error: 'API key not configured'
        },
        { status: 400 }
      );
    }
    
    // Parse request body
    let message;
    let context: ConversationContext = { messageCount: 0 };
    let conversationHistory: string[] = [];
    
    try {
      const body = await req.json();
      message = body.message;
      context = body.context || { messageCount: 0 };
      conversationHistory = body.history || [];
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          response: 'Error: Could not parse request body.'
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { 
          error: 'Message is required',
          response: 'Error: No message provided.'
        },
        { status: 400 }
      );
    }

    console.log('User message:', message);
    
    // Check if message contains a command
    const { command, params } = detectCommands(message);
    
    // If command detected, execute it
    if (command) {
      const response = await executeCommand(command, params);
      
      // Update context
      context.lastCommand = command;
      context.messageCount++;
      
      return NextResponse.json({ 
        response,
        context,
        detected_command: command,
        command_params: params
      });
    }
    
    // For general conversation, use Hugging Face model
    console.log('Generating chat response with Hugging Face API');
    
    try {
      // Build conversation history for context-aware responses
      let promptText = '';
      
      // Include up to 10 recent messages for context
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10); // Last 10 exchanges
        promptText = recentHistory.join('\n') + '\n';
      }
      
      // Add current message
      promptText += `Human: ${message}\nAI:`;
      
      // Try with flan-t5-xl first for better conversational responses
      const primaryModel = "google/flan-t5-xl";
      const backupModel = "facebook/bart-large"; // More reliable fallback model
      
      let aiResponse = '';
      let modelUsed = '';
      
      // First attempt with primary model
      try {
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${primaryModel}`,
          {
            headers: { 
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json" 
            },
            method: "POST",
            body: JSON.stringify({
              inputs: promptText,
              parameters: {
                max_length: 250,
                temperature: 0.7,
                top_p: 0.9,
                do_sample: true,
                repetition_penalty: 1.2,
              }
            }),
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        );

        if (!response.ok) {
          throw new Error(`Hugging Face API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (Array.isArray(result) && result.length > 0) {
          aiResponse = result[0].generated_text || "";
        } else if (typeof result === 'object' && result.generated_text) {
          aiResponse = result.generated_text || "";
        }
        
        modelUsed = primaryModel;
      } catch (primaryError) {
        console.warn(`Primary model error: ${primaryError}. Falling back to backup model.`);
        
        // Fall back to secondary model
        try {
          const response = await fetch(
            `https://api-inference.huggingface.co/models/${backupModel}`,
            {
              headers: { 
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json" 
              },
              method: "POST",
              body: JSON.stringify({
                inputs: promptText,
                parameters: {
                  max_length: 250,
                  temperature: 0.7,
                }
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Backup model error: ${response.status}`);
          }

          const result = await response.json();
          
          if (Array.isArray(result) && result.length > 0) {
            aiResponse = result[0].generated_text || "";
          } else if (typeof result === 'object' && result.generated_text) {
            aiResponse = result.generated_text || "";
          }
          
          modelUsed = backupModel;
        } catch (backupError) {
          console.error(`Backup model error: ${backupError}`);
          throw backupError;
        }
      }
      
      // If no valid response from either model, use fallback
      if (!aiResponse) {
        aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        modelUsed = "fallback";
      }
      
      // Clean up the response - remove the prompt part if it's included
      if (aiResponse.includes("AI:")) {
        aiResponse = aiResponse.split("AI:")[1].trim();
      } else if (aiResponse.includes("Human:")) {
        // If the model repeated the prompt, extract just the answer part
        const parts = aiResponse.split("Human:");
        if (parts.length > 1) {
          aiResponse = parts[0].trim();
        }
      }
      
      // If response is empty or too short, use fallback
      if (!aiResponse || aiResponse.length < 5) {
        aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        modelUsed = "fallback";
      }
      
      // Update context
      context.messageCount++;
      
      console.log('Response generated successfully using model:', modelUsed);
      return NextResponse.json({ 
        response: aiResponse,
        context,
        detected_command: null,
        model_used: modelUsed
      });
    } catch (apiError) {
      console.error('Error calling Hugging Face API:', apiError);
      
      // Use a random fallback response
      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      return NextResponse.json(
        { 
          error: 'API processing failed',
          response: fallbackResponse,
          details: apiError instanceof Error ? apiError.message : String(apiError)
        },
        { status: 200 } // Still return 200 to avoid client-side errors
      );
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    // Use a random fallback response for general errors too
    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        response: fallbackResponse,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 200 } // Still return 200 to avoid client-side errors
    );
  }
} 