# Hey Krrish - AI Voice Assistant

A modern AI voice assistant with speech recognition, text-to-speech, and intelligent conversations powered by Google Gemini AI. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎤 **Voice Recognition**: Wake word detection ("Hey Krrish") with continuous listening
- 🗣️ **Text-to-Speech**: Natural voice responses with multiple language support
- 🤖 **AI Conversations**: Powered by Google Gemini AI for intelligent responses
- 🌐 **Multi-language Support**: English, Telugu, Hindi, Kannada, and Tamil
- 💾 **Conversation History**: Save and manage chat conversations
- 📱 **PWA Ready**: Install as a Progressive Web App
- 🎨 **Modern UI**: Beautiful neon-themed interface with responsive design
- 🔄 **Offline Support**: Basic offline functionality with service worker

## Prerequisites

- Node.js 18+ 
- npm or pnpm
- Google Generative AI API key

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hey-krrish-voice-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   # Required: Google Generative AI API Key
   # Get your API key from: https://makersuite.google.com/app/apikey
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key_here
   
   # Optional: Brave Search API Key (for web search functionality)
   # Get your API key from: https://api.search.brave.com/
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Voice Commands**: Say "Hey Krrish" or "Krrish" followed by your question
2. **Text Input**: Click the message icon to type your questions
3. **Language Selection**: Use the language selector to change the interface language
4. **Conversation History**: Access previous conversations from the sidebar

## Supported Languages

- 🇮🇳 **English (India)** - Primary language
- 🇮🇳 **తెలుగు (Telugu)** - Telugu language support
- 🇮🇳 **हिंदी (Hindi)** - Hindi language support  
- 🇮🇳 **ಕನ್ನಡ (Kannada)** - Kannada language support
- 🇮🇳 **தமிழ் (Tamil)** - Tamil language support

## Browser Compatibility

- Chrome/Chromium (recommended for best speech recognition)
- Firefox
- Safari
- Edge

**Note**: Speech recognition works best in Chrome-based browsers.

## API Endpoints

- `POST /api/chat` - Main chat endpoint for AI conversations

## Project Structure

```
hey-krrish-voice-assistant/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── install-prompt.tsx # PWA install prompt
│   └── theme-provider.tsx # Theme provider
├── lib/                   # Utility libraries
│   ├── chat-storage.ts    # Local storage for conversations
│   └── utils.ts          # Utility functions
├── public/               # Static assets
├── types/                # TypeScript type definitions
└── styles/               # Additional styles
```

## Technologies Used

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **AI**: Google Generative AI (Gemini)
- **Speech**: Web Speech API
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Storage**: Local Storage

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

This project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Conventional commits for commit messages

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Troubleshooting

### Common Issues

1. **Speech Recognition Not Working**
   - Ensure you're using a supported browser (Chrome recommended)
   - Check microphone permissions
   - Try refreshing the page

2. **API Key Errors**
   - Verify your Google Generative AI API key is correct
   - Check that the environment variable is properly set
   - Ensure the API key has the necessary permissions

3. **Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript errors with `npm run lint`
   - Ensure all environment variables are set

4. **Performance Issues**
   - Check browser console for errors
   - Verify network connectivity
   - Clear browser cache and storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the browser compatibility notes

## Acknowledgments

- Google for the Generative AI API
- Next.js team for the amazing framework
- shadcn/ui for the beautiful components
- The open source community for various libraries used
