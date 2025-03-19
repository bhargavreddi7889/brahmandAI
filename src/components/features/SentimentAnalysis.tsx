"use client"

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SentimentData {
  text: string;
  sentiment: number;
  confidence: number;
  timestamp: string;
}

const SentimentAnalysis: React.FC = () => {
  const [text, setText] = useState('');
  const [sentimentHistory, setSentimentHistory] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeSentiment = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }

      const data = await response.json();
      const newSentiment: SentimentData = {
        text,
        sentiment: data.sentiment,
        confidence: data.confidence,
        timestamp: new Date().toISOString(),
      };

      setSentimentHistory((prev) => [...prev, newSentiment].slice(-10));
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: sentimentHistory.map((d) => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Sentiment Score',
        data: sentimentHistory.map((d) => d.sentiment),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Sentiment Analysis History',
      },
    },
    scales: {
      y: {
        min: -1,
        max: 1,
      },
    },
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.2) return 'text-green-600';
    if (sentiment < -0.2) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.2) return 'Positive';
    if (sentiment < -0.2) return 'Negative';
    return 'Neutral';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Sentiment Analysis</h2>

        <div className="mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to analyze sentiment..."
            className="w-full h-32 p-3 border rounded-lg mb-2"
          />
          <button
            onClick={analyzeSentiment}
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Analyzing...' : 'Analyze Sentiment'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}

        {sentimentHistory.length > 0 && (
          <div className="space-y-6">
            <div className="h-64">
              <Line options={chartOptions} data={chartData} />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Analysis History</h3>
              {sentimentHistory.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <p className="text-gray-700">{item.text}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className={`font-semibold ${getSentimentColor(item.sentiment)}`}>
                      {getSentimentLabel(item.sentiment)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Confidence: {(item.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysis; 