"use client"

import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon, StopIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Enhanced built-in responses for common queries
const BUILT_IN_RESPONSES: Record<string, string> = {
  // Greetings
  'hello': 'Hello! How can I assist you today?',
  'hi': 'Hi there! How can I help you?',
  'hey': 'Hey! What can I do for you?',
  'how are you': "I'm doing well, thank you! How can I help you?",
  
  // Help and capabilities
  'what can you do': 'I can help with various tasks including: answering questions, checking weather, searching information, providing news updates, analyzing sentiment, and translating text. Just ask what you need!',
  'help': 'I can assist with various tasks. Try asking about the weather, news, or just chat with me about any topic!',
  
  // Time inquiries
  'what time is it': `It's currently ${new Date().toLocaleTimeString()}.`,
  'what day is it': `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}.`,
  'what is the date': `Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`,
  
  // About inquiries
  'who are you': "I'm your AI voice assistant, designed to help you with various tasks through voice commands or text input.",
  'what is your name': "I'm your AI assistant, designed to make your life easier through voice and text interaction.",
  
  // Weather patterns - would connect to real API in production
  'what is the weather': "I'd need to know your location to provide accurate weather information. You can say something like 'What's the weather in London?'",
  
  // Jokes
  'tell me a joke': "Why don't scientists trust atoms? Because they make up everything!",
  'another joke': "What do you call a fake noodle? An impasta!",
  
  // Thank you responses
  'thank you': "You're welcome! Is there anything else I can help you with?",
  'thanks': "No problem at all! Let me know if you need anything else.",
};

// Fuzzy match helper for finding the closest built-in response
function findBestMatch(input: string): string | null {
  const normalizedInput = input.toLowerCase().trim();
  
  // Exact match
  if (BUILT_IN_RESPONSES[normalizedInput]) {
    return BUILT_IN_RESPONSES[normalizedInput];
  }
  
  // Check for partial matches
  for (const key of Object.keys(BUILT_IN_RESPONSES)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      return BUILT_IN_RESPONSES[key];
    }
  }
  
  // Check for semantic similarity - simple implementation
  for (const key of Object.keys(BUILT_IN_RESPONSES)) {
    const keyWords = key.split(' ');
    const inputWords = normalizedInput.split(' ');
    
    // Check for overlapping words
    const overlap = keyWords.filter(word => inputWords.includes(word));
    if (overlap.length > 0 && overlap.length >= keyWords.length / 2) {
      return BUILT_IN_RESPONSES[key];
    }
  }
  
  return null;
}

// Enhanced general-purpose answers for common questions
const generalAnswers = [
  "Based on my knowledge, ",
  "I believe ",
  "As far as I understand, ",
  "From what I know, "
];

// Common question patterns and answers
const COMMON_QUESTIONS: Record<string, string> = {
  'what is the capital of france': 'The capital of France is Paris.',
  'how tall is mount everest': 'Mount Everest is approximately 29,032 feet (8,849 meters) tall, making it the highest mountain on Earth.',
  'who wrote romeo and juliet': 'Romeo and Juliet was written by William Shakespeare.',
  'what is the largest planet': 'Jupiter is the largest planet in our solar system.',
  'when was the declaration of independence signed': 'The Declaration of Independence was signed on July 4, 1776.',
  'how many continents are there': 'There are seven continents: Africa, Antarctica, Asia, Europe, North America, Australia/Oceania, and South America.',
  'what is the speed of light': 'The speed of light in a vacuum is approximately 299,792,458 meters per second (about 186,282 miles per second).',
  'who invented the telephone': 'Alexander Graham Bell is credited with inventing the first practical telephone in 1876.',
  'what is the chemical symbol for gold': 'The chemical symbol for gold is Au (from the Latin word "aurum").',
  'how many elements are in the periodic table': 'There are 118 elements in the modern periodic table.'
};

const VoiceAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState('idle');
  const [lastAPICallTime, setLastAPICallTime] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition on component mount
  useEffect(() => {
    // Define web speech recognition with browser compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setRecognitionStatus('listening');
        console.log("Voice recognition started");
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log("Heard:", transcript);
        setInputText(transcript);
        
        // Process the voice input
        processVoiceInput(transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error("Recognition error:", event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
        setRecognitionStatus('error');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        setRecognitionStatus('idle');
        console.log("Voice recognition ended");
      };
      
      recognitionRef.current = recognition;
    } else {
      setError("Sorry, your browser doesn't support speech recognition.");
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition:", e);
        }
      }
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      addAssistantMessage("Hello! I'm your voice assistant. You can click the microphone button and speak, or type your message below.");
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not available");
      return;
    }
    
    try {
      setError(null);
      setInputText('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setError("Failed to start speech recognition. Please try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    setIsListening(false);
  };

  // Check if a question matches a common question pattern
  const checkCommonQuestion = (text: string): string | null => {
    const normalizedText = text.toLowerCase().trim();
    
    // Direct match
    if (COMMON_QUESTIONS[normalizedText]) {
      return COMMON_QUESTIONS[normalizedText];
    }
    
    // Fuzzy match for common questions
    for (const [question, answer] of Object.entries(COMMON_QUESTIONS)) {
      if (normalizedText.includes(question) || 
          question.includes(normalizedText) || 
          calculateSimilarity(normalizedText, question) > 0.7) {
        return answer;
      }
    }
    
    return null;
  };
  
  // Simple similarity calculation between two strings
  const calculateSimilarity = (a: string, b: string): number => {
    const aWords = a.toLowerCase().split(' ');
    const bWords = b.toLowerCase().split(' ');
    
    const commonWords = aWords.filter(word => bWords.includes(word));
    const totalUniqueWords = new Set([...aWords, ...bWords]).size;
    
    return commonWords.length / totalUniqueWords;
  };

  // Process voice input and determine the best response method
  const processVoiceInput = (text: string) => {
    // Add user message to the chat
    addUserMessage(text);
    
    // Check for built-in responses
    const builtInResponse = findBestMatch(text);
    if (builtInResponse) {
      setTimeout(() => {
        addAssistantMessage(builtInResponse);
        speakText(builtInResponse);
      }, 300);
      return;
    }
    
    // Check for common questions
    const commonAnswer = checkCommonQuestion(text);
    if (commonAnswer) {
      const prefix = generalAnswers[Math.floor(Math.random() * generalAnswers.length)];
      const fullAnswer = text.toLowerCase().startsWith('what') || text.toLowerCase().startsWith('who') || 
                         text.toLowerCase().startsWith('when') || text.toLowerCase().startsWith('how') ? 
                         commonAnswer : prefix + commonAnswer.toLowerCase();
      
      setTimeout(() => {
        addAssistantMessage(fullAnswer);
        speakText(fullAnswer);
      }, 300);
      return;
    }
    
    // Otherwise, send to API
    sendMessageToAPI(text);
  };

  // Add a user message to the chat
  const addUserMessage = (content: string) => {
    const message: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, message]);
  };

  // Add an assistant message to the chat
  const addAssistantMessage = (content: string) => {
    const message: Message = {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, message]);
  };

  // Throttle API calls to prevent overuse
  const isThrottled = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastAPICallTime;
    return timeSinceLastCall < 1000; // 1 second throttle
  };

  // Send a message to the API
  const sendMessageToAPI = async (text: string) => {
    setIsProcessing(true);
    
    // Prevent API overuse
    if (isThrottled()) {
      setTimeout(() => sendMessageToAPI(text), 1000);
      return;
    }
    
    setLastAPICallTime(Date.now());
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text,
          // Include recent conversation for context
          history: messages.slice(-6).map(msg => 
            `${msg.role === 'user' ? 'Human' : 'AI'}: ${msg.content}`
          )
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if we got a valid response
      if (data.response && typeof data.response === 'string') {
        addAssistantMessage(data.response);
        speakText(data.response);
      } else {
        // Fallback to a generic response with the key query terms
        const keywords = extractKeywords(text);
        const fallback = generateFallbackResponse(keywords, text);
        addAssistantMessage(fallback);
        speakText(fallback);
      }
    } catch (err) {
      console.error("API error:", err);
      
      // Create a smart fallback based on the query
      const keywords = extractKeywords(text);
      const fallback = generateFallbackResponse(keywords, text);
      
      addAssistantMessage(fallback);
      speakText(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract important keywords from the text
  const extractKeywords = (text: string): string[] => {
    // Remove common stop words
    const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
                      'to', 'of', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 
                      'about', 'against', 'between', 'into', 'through', 'during', 'before', 
                      'after', 'above', 'below', 'from', 'up', 'down', 'i', 'you', 'he', 
                      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word));
  };

  // Generate a fallback response based on keywords
  const generateFallbackResponse = (keywords: string[], originalText: string): string => {
    if (keywords.length === 0) {
      return "I'm not sure how to respond to that. Could you rephrase your question?";
    }
    
    // Check if it's a question
    const isQuestion = originalText.endsWith('?') || 
                     originalText.toLowerCase().startsWith('what') || 
                     originalText.toLowerCase().startsWith('how') ||
                     originalText.toLowerCase().startsWith('why') ||
                     originalText.toLowerCase().startsWith('when') ||
                     originalText.toLowerCase().startsWith('where') ||
                     originalText.toLowerCase().startsWith('which') ||
                     originalText.toLowerCase().startsWith('who') ||
                     originalText.toLowerCase().startsWith('can');
    
    if (isQuestion) {
      return `I'd be happy to help with information about ${keywords.slice(0, 3).join(', ')}. Could you provide more specific details about what you'd like to know?`;
    } else {
      return `I understand you're interested in ${keywords.slice(0, 3).join(', ')}. Let me know if you'd like more specific information about this topic.`;
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    addUserMessage(inputText);
    const text = inputText;
    setInputText('');
    
    // First check for built-in responses
    const builtInResponse = findBestMatch(text.toLowerCase());
    if (builtInResponse) {
      setTimeout(() => {
        addAssistantMessage(builtInResponse);
        speakText(builtInResponse);
      }, 300);
      return;
    }
    
    // Check for common questions
    const commonAnswer = checkCommonQuestion(text);
    if (commonAnswer) {
      const prefix = generalAnswers[Math.floor(Math.random() * generalAnswers.length)];
      const fullAnswer = text.toLowerCase().startsWith('what') || text.toLowerCase().startsWith('who') ? 
                        commonAnswer : prefix + commonAnswer.toLowerCase();
      
      setTimeout(() => {
        addAssistantMessage(fullAnswer);
        speakText(fullAnswer);
      }, 300);
      return;
    }
    
    // Otherwise send to API
    sendMessageToAPI(text);
  };

  // Speak text using the speech synthesis API
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a female voice
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Google') ||
      voice.name.includes('Samantha')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Voice Assistant</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`p-3 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <StopIcon className="h-5 w-5" />
              ) : (
                <MicrophoneIcon className="h-5 w-5" />
              )}
            </button>
            
            {isSpeaking ? (
              <button
                onClick={stopSpeaking}
                className="p-3 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-full hover:bg-gray-300"
                title="Stop speaking"
              >
                <SpeakerXMarkIcon className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        {recognitionStatus === 'listening' && (
          <div className="p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg flex items-center">
            <div className="mr-2 h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Listening... Speak now</span>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6 h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-center py-3">
              <div className="dot-typing"></div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or press the mic to speak..."
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isProcessing || isListening}
          />
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim() || isListening}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
        
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Try saying: "Hello", "What can you do?", "Help", "What time is it", or ask any question
        </div>
      </div>
      
      <style jsx>{`
        .dot-typing {
          position: relative;
          left: -9999px;
          width: 6px;
          height: 6px;
          border-radius: 5px;
          background-color: #3b82f6;
          color: #3b82f6;
          box-shadow: 9984px 0 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          animation: dotTyping 1.5s infinite linear;
        }

        @keyframes dotTyping {
          0% {
            box-shadow: 9984px 0 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          }
          16.667% {
            box-shadow: 9984px -10px 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          }
          33.333% {
            box-shadow: 9984px 0 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          }
          50% {
            box-shadow: 9984px 0 0 0 #3b82f6, 9999px -10px 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          }
          66.667% {
            box-shadow: 9984px 0 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          }
          83.333% {
            box-shadow: 9984px 0 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px -10px 0 0 #3b82f6;
          }
          100% {
            box-shadow: 9984px 0 0 0 #3b82f6, 9999px 0 0 0 #3b82f6, 10014px 0 0 0 #3b82f6;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistant; 