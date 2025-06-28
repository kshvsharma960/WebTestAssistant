# WebTestAssistant - BrowserUse Agentic AI Solution with Embedded Browser

A beautiful, production-ready fullstack application that automates web testing using BrowserUse AI agents powered by Google's Gemini AI, featuring a **live embedded browser view** that lets you watch the AI automation in real-time.

## Features

- 🤖 **AI-Powered Testing**: Uses Google Gemini AI to intelligently execute test steps
- 🌐 **Browser Automation**: Leverages BrowserUse for real browser interactions
- 📺 **Live Browser View**: Watch the AI agent work in real-time with embedded browser screenshots
- 📱 **Responsive Design**: Beautiful, modern UI that works on all devices
- 🔄 **Real-time Updates**: Live status updates and execution logs
- 🖼️ **Expandable Browser View**: Full-screen browser view for detailed monitoring
- ⚡ **Fast & Reliable**: Built with Flask backend and React frontend
- 🎯 **Easy to Use**: Simply write test steps and let AI handle the rest

## Prerequisites

- Python 3.8+
- Node.js 16+
- Chrome or Edge browser
- Google Gemini API key

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy it to your `.env` file

### 4. Run the Application

```bash
# Start both frontend and backend
npm run start

# Or run them separately:
# Backend: npm run backend
# Frontend: npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Chrome Debug Port: 9222 (for embedded browser view)

## How to Use

1. **Enter Test Steps**: Write your test steps in the large text area using bullet points
2. **Run Test**: Click "Run Test Case" to start the AI-powered browser automation
3. **Watch Live**: See the browser automation happen in real-time in the embedded browser view
4. **Expand View**: Click the maximize button to get a full-screen view of the browser
5. **Monitor Progress**: Watch real-time logs and status updates
6. **Review Results**: See execution logs and final status

### Example Test Steps

```
• Navigate to https://example.com
• Click on the login button
• Enter username: testuser@example.com
• Enter password: testpassword123
• Click the submit button
• Verify the dashboard is displayed
• Take a screenshot
• Logout from the application
```

## New Features in This Version

### 🖥️ Embedded Browser View
- **Live Screenshots**: Real-time browser screenshots updated every 2 seconds during test execution
- **Current URL Display**: See which page the AI agent is currently on
- **Expandable Interface**: Click the maximize button for full-screen browser monitoring
- **Responsive Layout**: The interface adapts when the browser view is expanded

### 🔧 Enhanced Backend
- **Chrome Debug Protocol**: Integrated CDP for live browser monitoring
- **Screenshot Capture**: Automatic screenshot capture during test execution
- **URL Tracking**: Real-time URL monitoring and display
- **Improved Error Handling**: Better error management for browser operations

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/run-test` - Start test execution
- `GET /api/test-status` - Get current test status, logs, and browser state
- `POST /api/stop-test` - Stop running test

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, and Axios
- **Backend**: Flask with CORS support and Chrome Debug Protocol integration
- **AI Engine**: Google Gemini 2.0 Flash
- **Browser Automation**: BrowserUse library with embedded view support
- **Live Monitoring**: Real-time screenshot capture and URL tracking
- **Styling**: Modern gradient design with glassmorphism effects

## Browser Integration Details

The embedded browser view works by:
1. Starting Chrome with remote debugging enabled on port 9222
2. Capturing screenshots every 2 seconds during test execution
3. Encoding screenshots as base64 and sending them to the frontend
4. Displaying live browser state in a responsive, expandable interface

## Security Notes

- API keys are stored securely in environment variables
- CORS is configured for development (update for production)
- Browser instances are properly cleaned up after execution
- Chrome debug port is only accessible locally

## Troubleshooting

1. **GEMINI_API_KEY not set**: Make sure you've created the `.env` file with your API key
2. **Browser won't open**: Ensure Chrome/Edge is installed and accessible
3. **Connection refused**: Check that both frontend and backend servers are running
4. **CORS errors**: Verify the backend is running on port 5000
5. **No browser view**: Check that Chrome debug port 9222 is not blocked by firewall
6. **Screenshot not updating**: Ensure the browser automation is running and the page is loaded

## Production Deployment

For production deployment:

1. Update CORS settings in `app.py`
2. Set production environment variables
3. Configure firewall rules for Chrome debug port (if needed)
4. Build the frontend: `npm run build`
5. Use a production WSGI server like Gunicorn
6. Configure reverse proxy (nginx recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially the browser embedding features)
5. Submit a pull request

## License

MIT License - feel free to use this for your projects!