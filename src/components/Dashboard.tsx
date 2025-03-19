"use client"

import React, { useState, useEffect } from 'react';
import PDFUploader from './features/PDFUploader';
import NewsFeed from './features/NewsFeed';
import WeatherWidget from './features/WeatherWidget';
import SentimentAnalysis from './features/SentimentAnalysis';
import VoiceAssistant from './features/VoiceAssistant';
import Translator from './features/Translator';
import StockMarket from './features/StockMarket';

// Placeholder component for any missing features
const PlaceholderFeature: React.FC<{name: string}> = ({name}) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="bg-blue-50 rounded-full p-6 mb-4">
      <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold mb-2">{name} Coming Soon</h3>
    <p className="text-gray-500 text-center max-w-md">
      This feature is currently under development. Please check back later.
    </p>
  </div>
);

const Dashboard: React.FC = () => {
  // Start with a loading state
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState('news');
  const [pdfSummary, setPdfSummary] = useState<string | null>(null);

  // Use effect to set client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  const tabs = [
    { id: 'news', label: 'News', icon: '📰' },
    { id: 'weather', label: 'Weather', icon: '🌤️' },
    { id: 'stocks', label: 'Stocks', icon: '📈' },
    { id: 'pdf', label: 'PDF Analysis', icon: '📄' },
    { id: 'sentiment', label: 'Sentiment', icon: '🔍' },
    { id: 'translate', label: 'Translator', icon: '🌐' },
    { id: 'voice', label: 'Voice Assistant', icon: '🎤' },
  ];

  const handlePdfSummary = (summary: string) => {
    console.log("PDF summary received in Dashboard:", summary.substring(0, 50) + "...");
    setPdfSummary(summary);
  };

  const renderContent = () => {
    if (!isClient) {
      return <div className="p-8 text-center text-gray-500">Loading...</div>;
    }
    
    try {
      switch (activeTab) {
        case 'news':
          return <NewsFeed />;
        case 'weather':
          return <WeatherWidget />;
        case 'stocks':
          return <StockMarket />;
        case 'pdf':
          return <PDFUploader onSummaryGenerated={handlePdfSummary} />;
        case 'sentiment':
          return <SentimentAnalysis />;
        case 'translate':
          return <Translator />;
        case 'voice':
          return <VoiceAssistant />;
        default:
          return <div>Select a feature from the tabs above</div>;
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div className="p-8 text-center text-red-500">
          An error occurred while loading this feature. Please try again later.
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Brahmand AI Dashboard</h1>
            <p className="text-sm text-gray-500">Powered by Hugging Face</p>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Access multiple AI-powered features from a single dashboard
          </p>
        </header>

        {/* Tab navigation */}
        {isClient && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 flex items-center border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content area */}
        <main>{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard; 