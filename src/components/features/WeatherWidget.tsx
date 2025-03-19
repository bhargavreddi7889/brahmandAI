"use client"

import React, { useEffect, useState } from 'react';
import { CloudIcon, SunIcon, MoonIcon, MapPinIcon, ArrowTrendingUpIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';

interface WeatherData {
  temperature: number;
  feelsLike?: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  location: string;
  country?: string;
  forecast?: ForecastItem[];
}

interface ForecastItem {
  date: string;
  temperature: number;
  description: string;
  icon: string;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [useCurrent, setUseCurrent] = useState(true);

  // Get weather based on user's geolocation
  useEffect(() => {
    if (useCurrent) {
      if (navigator.geolocation) {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
          },
          (err) => {
            setError("Unable to access location. Please enter a city name.");
            setLoading(false);
            setUseCurrent(false);
          }
        );
      } else {
        setError("Geolocation is not supported by your browser. Please enter a city name.");
        setLoading(false);
        setUseCurrent(false);
      }
    }
  }, [useCurrent]);

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      const data = await response.json();
      setWeather(data);
      if (data.location) {
        setLocation(data.location);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    if (!location.trim()) {
      setError("Please enter a location");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      const data = await response.json();
      setWeather(data);
      setUseCurrent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (iconCode: string, size = 10) => {
    // Map the OpenWeather icon codes to Heroicons
    const iconMap: Record<string, React.ReactElement> = {
      '01d': <SunIcon className={`h-${size} w-${size} text-yellow-500`} />,
      '01n': <MoonIcon className={`h-${size} w-${size} text-gray-500`} />,
      '02d': <CloudIcon className={`h-${size} w-${size} text-gray-400`} />,
      '02n': <CloudIcon className={`h-${size} w-${size} text-gray-400`} />,
      '03d': <CloudIcon className={`h-${size} w-${size} text-gray-500`} />,
      '03n': <CloudIcon className={`h-${size} w-${size} text-gray-500`} />,
      '04d': <CloudIcon className={`h-${size} w-${size} text-gray-600`} />,
      '04n': <CloudIcon className={`h-${size} w-${size} text-gray-600`} />,
      '09d': <CloudArrowDownIcon className={`h-${size} w-${size} text-blue-500`} />,
      '09n': <CloudArrowDownIcon className={`h-${size} w-${size} text-blue-500`} />,
      '10d': <CloudArrowDownIcon className={`h-${size} w-${size} text-blue-400`} />,
      '10n': <CloudArrowDownIcon className={`h-${size} w-${size} text-blue-400`} />,
      '11d': <CloudArrowDownIcon className={`h-${size} w-${size} text-purple-500`} />,
      '11n': <CloudArrowDownIcon className={`h-${size} w-${size} text-purple-500`} />,
      'default': <CloudIcon className={`h-${size} w-${size} text-gray-400`} />,
    };
    
    return iconMap[iconCode] || iconMap['default'];
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchWeather();
    }
  };

  // Format the day from a date string
  const formatDay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="w-full mx-auto">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Weather Forecast</h2>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter city name"
                className="pl-10 pr-4 py-2 w-full rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <MapPinIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={fetchWeather}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:bg-gray-400 flex-shrink-0"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            {!useCurrent && (
              <button
                onClick={() => setUseCurrent(true)}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors flex-shrink-0 text-sm"
                title="Use current location"
              >
                📍 Current
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">Fetching weather data...</p>
          </div>
        )}

        {error && (
          <div className="p-4 my-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {!loading && !error && weather && (
          <div>
            {/* Current weather */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="mr-4">
                    {getWeatherIcon(weather.icon, 16)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {weather.location}
                      {weather.country && <span className="text-gray-500 ml-2 text-lg">{weather.country}</span>}
                    </h3>
                    <p className="text-gray-600 capitalize">{weather.description}</p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-5xl font-bold text-gray-800">{Math.round(weather.temperature)}°C</p>
                  {weather.feelsLike && (
                    <p className="text-sm text-gray-500">Feels like {Math.round(weather.feelsLike)}°C</p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full mr-3">
                    <CloudIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Humidity</p>
                    <p className="font-semibold">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full mr-3">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wind Speed</p>
                    <p className="font-semibold">{weather.windSpeed} m/s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">5-Day Forecast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {weather.forecast.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow">
                      <p className="font-semibold text-gray-700">{formatDay(item.date)}</p>
                      <div className="my-2 flex justify-center">
                        {getWeatherIcon(item.icon, 8)}
                      </div>
                      <p className="text-lg font-bold">{Math.round(item.temperature)}°C</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!weather && !loading && !error && (
          <div className="text-center py-12 text-gray-500">
            <CloudIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p>Enter a location to get weather information</p>
            <p className="text-sm mt-2">Or click "Current" to use your current location</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget; 