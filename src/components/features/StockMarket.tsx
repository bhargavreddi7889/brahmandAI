'use client';

import React, { useState, useEffect } from 'react';
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
import { FaSearch, FaArrowUp, FaArrowDown, FaInfoCircle } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const popularStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa' },
  { symbol: 'WMT', name: 'Walmart' },
];

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  sentiment: string;
  sentimentScore: number;
  historicalData: {
    date: string;
    price: number;
  }[];
}

const StockMarket: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/stocks?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      const data = await response.json();
      setStockData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData(selectedStock);
  }, [selectedStock]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedStock(searchQuery.trim().toUpperCase());
    }
  };

  const chartData = stockData ? {
    labels: stockData.historicalData.map(d => d.date),
    datasets: [
      {
        label: `${selectedStock} Stock Price`,
        data: stockData.historicalData.map(d => d.price),
        borderColor: stockData.change >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: stockData.change >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a stock symbol (e.g., AAPL)"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <FaSearch />
            </button>
          </div>
        </form>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {popularStocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => setSelectedStock(stock.symbol)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selectedStock === stock.symbol
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {stock.symbol}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          {error}
        </div>
      ) : stockData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">{selectedStock} Stock Price</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">${stockData.price.toFixed(2)}</span>
                <span className={`flex items-center gap-1 ${
                  stockData.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {stockData.change >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                  <span className="text-lg">
                    {Math.abs(stockData.change).toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Market Sentiment</h3>
              <div className="flex items-center gap-2">
                <span className={`text-lg ${
                  stockData.sentiment === 'Positive' ? 'text-green-500' :
                  stockData.sentiment === 'Negative' ? 'text-red-500' :
                  'text-yellow-500'
                }`}>
                  {stockData.sentiment}
                </span>
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stockData.sentiment === 'Positive' ? 'bg-green-500' :
                      stockData.sentiment === 'Negative' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${(stockData.sentimentScore + 1) * 50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Price History</h3>
            {chartData && (
              <div className="h-64">
                <Line data={chartData} options={chartOptions} />
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <FaInfoCircle />
              <span>Data provided by Alpha Vantage API</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StockMarket; 