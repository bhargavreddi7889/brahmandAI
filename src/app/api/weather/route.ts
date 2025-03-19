import { NextRequest, NextResponse } from 'next/server';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  console.warn('Warning: HUGGINGFACE_API_KEY is not set');
}

// Latitude and longitude for major cities
const cityCoordinates: Record<string, { lat: number; lon: number; country: string }> = {
  'new york': { lat: 40.7128, lon: -74.0060, country: 'US' },
  'london': { lat: 51.5074, lon: -0.1278, country: 'UK' },
  'paris': { lat: 48.8566, lon: 2.3522, country: 'FR' },
  'tokyo': { lat: 35.6762, lon: 139.6503, country: 'JP' },
  'sydney': { lat: -33.8688, lon: 151.2093, country: 'AU' },
  'mumbai': { lat: 19.0760, lon: 72.8777, country: 'IN' },
  'beijing': { lat: 39.9042, lon: 116.4074, country: 'CN' },
  'cairo': { lat: 30.0444, lon: 31.2357, country: 'EG' },
  'moscow': { lat: 55.7558, lon: 37.6173, country: 'RU' },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729, country: 'BR' },
  'delhi': { lat: 28.6139, lon: 77.2090, country: 'IN' },
  'berlin': { lat: 52.5200, lon: 13.4050, country: 'DE' },
  'mexico city': { lat: 19.4326, lon: -99.1332, country: 'MX' },
  'toronto': { lat: 43.6532, lon: -79.3832, country: 'CA' },
  'madrid': { lat: 40.4168, lon: -3.7038, country: 'ES' },
  'rome': { lat: 41.9028, lon: 12.4964, country: 'IT' }
};

// Weather icons based on conditions
const weatherIcons: Record<string, string> = {
  'sunny': '01d',
  'clear': '01d',
  'cloudy': '03d',
  'partly cloudy': '02d',
  'overcast': '04d',
  'rain': '10d',
  'light rain': '09d',
  'heavy rain': '09d',
  'thunderstorm': '11d',
  'snow': '13d',
  'mist': '50d',
  'fog': '50d'
};

export async function GET(req: NextRequest) {
  try {
    // Check for valid API key
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'API key not configured',
          message: 'Hugging Face API key is not configured. Please add your HUGGINGFACE_API_KEY to .env.local file.'
        },
        { status: 400 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    let location = searchParams.get('location');
    let lat = searchParams.get('lat');
    let lon = searchParams.get('lon');
    
    // If no location or coordinates provided, default to New York
    if (!location && (!lat || !lon)) {
      location = 'new york';
    }
    
    // Get coordinates from city name if provided
    if (location) {
      const normalizedLocation = location.toLowerCase();
      const city = cityCoordinates[normalizedLocation] || cityCoordinates['new york'];
      lat = city.lat.toString();
      lon = city.lon.toString();
      location = normalizedLocation.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    // Generate weather data based on location and date
    const temperature = generateTemperature(parseFloat(lat!), new Date());
    const humidity = generateHumidity(parseFloat(lat!), parseFloat(lon!));
    const windSpeed = generateWindSpeed();
    
    // Use Hugging Face to generate a weather description
    const weatherDescription = await generateWeatherDescription(parseFloat(lat!), parseFloat(lon!), temperature);
    
    // Determine weather icon from description
    const icon = getWeatherIcon(weatherDescription);
    
    // Generate a 5-day forecast
    const forecast = generateForecast(parseFloat(lat!), parseFloat(lon!), new Date());
    
    // Prepare the response data
    const weatherData = {
      temperature,
      feelsLike: temperature + (humidity > 70 ? 2 : -1),
      humidity,
      description: weatherDescription,
      icon,
      windSpeed,
      location: location || 'Unknown Location',
      country: getCountryFromCoordinates(parseFloat(lat!), parseFloat(lon!)),
      forecast,
    };

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Error generating weather data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate weather data';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a realistic temperature based on latitude and date
 */
function generateTemperature(lat: number, date: Date): number {
  // Factor in the season for the hemisphere
  const month = date.getMonth(); // 0-11
  const isNorthernHemisphere = lat > 0;
  const isSummer = isNorthernHemisphere ? (month >= 5 && month <= 8) : (month <= 2 || month >= 9);
  
  // Base temperature depends on latitude (closer to equator = warmer)
  const equatorFactor = 1 - Math.abs(lat) / 90;
  const baseTemp = 5 + (equatorFactor * 30); // 5°C to 35°C range
  
  // Seasonal adjustment
  const seasonalAdjustment = isSummer ? 10 : -10;
  
  // Random daily fluctuation
  const dailyFluctuation = (Math.random() - 0.5) * 5;
  
  return Math.round((baseTemp + seasonalAdjustment + dailyFluctuation) * 10) / 10;
}

/**
 * Generate humidity based on location
 */
function generateHumidity(lat: number, lon: number): number {
  // Base humidity (higher near equator and coastal areas)
  const equatorFactor = 1 - Math.abs(lat) / 90;
  const baseHumidity = 50 + (equatorFactor * 30);
  
  // Random fluctuation
  const fluctuation = (Math.random() - 0.5) * 20;
  
  return Math.round(Math.min(Math.max(baseHumidity + fluctuation, 30), 95));
}

/**
 * Generate wind speed
 */
function generateWindSpeed(): number {
  // Generate a realistic wind speed (0.5 to 10 m/s)
  return Math.round((0.5 + Math.random() * 9.5) * 10) / 10;
}

/**
 * Get country code from coordinates
 */
function getCountryFromCoordinates(lat: number, lon: number): string {
  // Find the closest city in our database
  let closestCity = 'US';
  let minDistance = Number.MAX_VALUE;
  
  for (const city in cityCoordinates) {
    const coords = cityCoordinates[city];
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = coords.country;
    }
  }
  
  return closestCity;
}

/**
 * Generate a weather description using Hugging Face
 */
async function generateWeatherDescription(lat: number, lon: number, temperature: number): Promise<string> {
  if (!apiKey) {
    return "partly cloudy";
  }
  
  try {
    // Use model to generate a weather description
    const modelName = "google/flan-t5-base";
    const prompt = `Generate a short weather description (2-3 words) for a location with temperature ${temperature}°C.`;
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelName}`,
      {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json" 
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Extract generated text
    let description = "";
    if (typeof result === "string") {
      description = result;
    } else if (result.generated_text) {
      description = result.generated_text;
    } else {
      description = "partly cloudy";
    }
    
    // Clean up the description - remove quotes, periods, etc.
    description = description.replace(/["'.]/g, '').toLowerCase().trim();
    
    // Make sure it's not too long
    if (description.split(' ').length > 4) {
      const words = description.split(' ').slice(0, 3);
      description = words.join(' ');
    }
    
    return description;
  } catch (error) {
    console.error('Error generating weather description:', error);
    
    // Fallback descriptions based on temperature
    if (temperature > 30) return "sunny";
    if (temperature > 20) return "partly cloudy";
    if (temperature > 10) return "cloudy";
    return "overcast";
  }
}

/**
 * Get a weather icon based on description
 */
function getWeatherIcon(description: string): string {
  // Check for keywords in the description
  for (const keyword in weatherIcons) {
    if (description.includes(keyword)) {
      return weatherIcons[keyword];
    }
  }
  
  // Default icon if no match found
  return "03d"; // Scattered clouds
}

/**
 * Generate a forecast for the next 5 days
 */
function generateForecast(lat: number, lon: number, startDate: Date) {
  const forecast = [];
  
  for (let i = 1; i <= 5; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(startDate.getDate() + i);
    
    const temperature = generateTemperature(lat, forecastDate);
    
    // Simple description based on temperature
    let description = "partly cloudy";
    if (temperature > 30) description = "sunny";
    else if (temperature > 25) description = "clear";
    else if (temperature > 20) description = "partly cloudy";
    else if (temperature > 15) description = "cloudy";
    else if (temperature > 10) description = "overcast";
    else if (temperature > 5) description = "light rain";
    else description = "rain";
    
    forecast.push({
      date: forecastDate.toISOString(),
      temperature,
      description,
      icon: getWeatherIcon(description)
    });
  }
  
  return forecast;
} 