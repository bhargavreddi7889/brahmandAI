"use client"

import React, { useState, useRef } from 'react';
import { ArrowPathIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
];

const Translator: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [isIndianLanguagePair, setIsIndianLanguagePair] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // References for speech synthesis
  const synth = useRef<SpeechSynthesis | null>(null);
  const speechUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech synthesis on component mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
    }
    
    // Cleanup function
    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);

  const translate = async () => {
    if (!sourceText.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setModelUsed(null);

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: languages.find(lang => lang.code === sourceLang)?.name || 'English',
          targetLang: languages.find(lang => lang.code === targetLang)?.name || 'Hindi',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate text');
      }

      const data = await response.json();
      setTranslatedText(data.translation);
      
      // Set additional information if available
      if (data.model_used) {
        setModelUsed(data.model_used);
      }
      
      if (data.is_indian_language_pair !== undefined) {
        setIsIndianLanguagePair(data.is_indian_language_pair);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate text');
    } finally {
      setLoading(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setModelUsed(null);
  };
  
  const speakText = (text: string, lang: string) => {
    if (!synth.current) return;
    
    // Stop any ongoing speech
    synth.current.cancel();
    
    // Create utterance
    speechUtterance.current = new SpeechSynthesisUtterance(text);
    
    // Set language
    switch(lang) {
      case 'hi':
        speechUtterance.current.lang = 'hi-IN';
        break;
      case 'bn':
        speechUtterance.current.lang = 'bn-IN';
        break;
      case 'ta':
        speechUtterance.current.lang = 'ta-IN';
        break;
      case 'te':
        speechUtterance.current.lang = 'te-IN';
        break;
      case 'ml':
        speechUtterance.current.lang = 'ml-IN';
        break;
      case 'kn':
        speechUtterance.current.lang = 'kn-IN';
        break;
      default:
        speechUtterance.current.lang = 'en-US';
    }
    
    // Event handlers
    speechUtterance.current.onstart = () => setIsSpeaking(true);
    speechUtterance.current.onend = () => setIsSpeaking(false);
    speechUtterance.current.onerror = () => setIsSpeaking(false);
    
    // Speak the text
    synth.current.speak(speechUtterance.current);
  };
  
  const stopSpeaking = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Text Translator</h2>
        
        {isIndianLanguagePair && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md text-blue-800 text-sm">
            <p className="font-semibold">🇮🇳 Indian Language Translation</p>
            <p>Enhanced translation support is available for this language pair.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-48 p-3 border rounded-md"
            />
            {sourceText && (
              <button 
                onClick={() => speakText(sourceText, sourceLang)}
                disabled={isSpeaking}
                className="absolute bottom-3 right-3 p-2 text-gray-500 hover:text-blue-500 bg-white rounded-full shadow-sm border"
                title="Listen to source text"
              >
                <SpeakerWaveIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              value={translatedText}
              readOnly
              placeholder="Translation will appear here..."
              className="w-full h-48 p-3 border rounded-md bg-gray-50"
            />
            {translatedText && (
              <button 
                onClick={() => speakText(translatedText, targetLang)}
                disabled={isSpeaking}
                className="absolute bottom-3 right-3 p-2 text-gray-500 hover:text-blue-500 bg-white rounded-full shadow-sm border"
                title="Listen to translated text"
              >
                <SpeakerWaveIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={translate}
            disabled={loading || !sourceText.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Translating...' : 'Translate'}
          </button>
          <button
            onClick={swapLanguages}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            title="Swap languages"
          >
            <ArrowPathIcon className="h-6 w-6" />
          </button>
        </div>
        
        {modelUsed && (
          <div className="text-xs text-gray-500 text-center mb-4">
            Translation powered by: {modelUsed.replace('Helsinki-NLP/', '').replace('facebook/', '').replace('ai4bharat/', '')}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {isSpeaking && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-pulse">
              <SpeakerWaveIcon className="h-5 w-5" />
            </div>
            <span>Speaking...</span>
            <button 
              onClick={stopSpeaking}
              className="ml-2 bg-white bg-opacity-20 rounded-full p-1 hover:bg-opacity-30"
              title="Stop speaking"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Translator; 