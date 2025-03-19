# AI Tool Dashboard

A comprehensive AI-powered dashboard with various features including PDF analysis, news updates, weather information, stock market data, sentiment analysis, voice commands, and multilingual support.

## Features

- PDF Upload and Summarization
- Real-time News Updates
- Weather Information
- Live Stock Market Data
- Sentiment Analysis
- Voice Commands
- Multilingual Text Translation
- Modern, Responsive Dashboard Interface

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- API keys for:
  - OpenAI (for GPT-4)
  - News API
  - OpenWeather API
  - Alpha Vantage API

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-tool
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with your API keys:
```env
OPENAI_API_KEY=your_openai_api_key_here
NEWS_API_KEY=your_news_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── features/         # Feature-specific components
│   └── Dashboard.tsx     # Main dashboard component
└── types/                # TypeScript type definitions
```

## Technologies Used

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- OpenAI API
- Chart.js
- React Speech Recognition
- i18next
- Socket.io Client

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## API Keys

### Hugging Face API Key
The application now uses Hugging Face models for:
- PDF summarization
- Translation
- Sentiment analysis

To get your Hugging Face API key:
1. Create an account at https://huggingface.co/
2. Go to https://huggingface.co/settings/tokens
3. Create a new token with "read" access
4. Copy the token and add it to your `.env.local` file

## Troubleshooting

If you encounter any issues with the AI features:

1. Check that your Hugging Face API key is correctly set in the `.env.local` file
2. Make sure you've restarted the development server after adding the API key
3. Check the browser console for any error messages
4. The first request to a Hugging Face model might be slow as the model needs to load

## Development

This project is built with:

- Next.js
- React
- Tailwind CSS
- Hugging Face models for AI features
