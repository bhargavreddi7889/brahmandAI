"use client"

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MagnifyingGlassIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'general', label: 'General' },
    { id: 'business', label: 'Business' },
    { id: 'technology', label: 'Technology' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'health', label: 'Health' },
    { id: 'science', label: 'Science' },
    { id: 'sports', label: 'Sports' },
  ];

  const fetchNews = async (selectedCategory: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching news for category: ${selectedCategory}`);
      
      // Make an actual API call instead of using mock data
      const response = await fetch(`/api/news?category=${selectedCategory}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data.articles?.length || 0} news articles`);
      
      // Set the news articles from the API response
      if (data.articles && Array.isArray(data.articles)) {
        setNews(data.articles);
        setFilteredNews(data.articles);
      } else {
        // If no articles or invalid response, set empty array
        setNews([]);
        setFilteredNews([]);
        setError('No news articles available for this category');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Use useEffect to ensure these are only executed on the client
  useEffect(() => {
    fetchNews(category);
  }, [category]);

  // Filter news based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNews(news);
      return;
    }

    const lowercasedSearch = searchQuery.toLowerCase();
    const filtered = news.filter(
      (item) =>
        item.title.toLowerCase().includes(lowercasedSearch) ||
        (item.description && item.description.toLowerCase().includes(lowercasedSearch)) ||
        item.source.name.toLowerCase().includes(lowercasedSearch)
    );
    setFilteredNews(filtered);
  }, [searchQuery, news]);

  // Get placeholder image for news without images
  const getImageUrl = (item: NewsItem) => {
    if (item.urlToImage && !item.urlToImage.includes('null')) {
      return item.urlToImage;
    }
    
    // Return placeholder image based on category
    const categoryImages: {[key: string]: string} = {
      general: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c',
      business: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa',
      technology: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b',
      entertainment: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852',
      health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528',
      science: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31',
      sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211'
    };
    
    return categoryImages[category] || categoryImages.general;
  };

  const handleCategoryChange = (categoryId: string) => {
    console.log(`Changing category to: ${categoryId}`);
    setCategory(categoryId);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Latest News</h2>
        <div className="relative max-w-md w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news..."
            className="pl-10 pr-4 py-2 w-full rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                fetchNews(category);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                category === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* News List */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No news found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNews.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 overflow-hidden">
                <img 
                  src={getImageUrl(item)} 
                  alt={item.title} 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?ixlib=rb-4.0.3&auto=format&fit=crop&w=2370&q=80';
                  }}
                />
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-2 flex items-center justify-between">
                  <span>{item.source.name}</span>
                  <span>{format(new Date(item.publishedAt), 'MMM d, yyyy')}</span>
                </p>
                <h3 className="text-xl font-bold mb-2 text-gray-800">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.description || "No description available"}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                >
                  Read full article
                  <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeed; 