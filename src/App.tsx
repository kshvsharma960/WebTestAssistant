import React, { useState, useEffect } from 'react';
import { Play, Square, Activity, CheckCircle, XCircle, Clock, Zap, Bot, Globe, Monitor, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface TestStatus {
  status: string;
  logs: string[];
  currentTest: string | null;
  browserScreenshot: string | null;
  browserUrl: string;
  cdpPort: number;
}

interface HealthStatus {
  status: string;
  service: string;
  browser_use_available: boolean;
  gemini_api_configured: boolean;
}

function App() {
  const [testSteps, setTestSteps] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({
    status: 'idle',
    logs: [],
    currentTest: null,
    browserScreenshot: null,
    browserUrl: '',
    cdpPort: 9222
  });
  const [error, setError] = useState('');
  const [browserExpanded, setBrowserExpanded] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);

  // Backend URL configuration
  const BACKEND_URL = 'http://localhost:5000';

  // Check health status on component mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/health`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        setHealthStatus(response.data);
        setBackendConnected(true);
        setError(''); // Clear any previous errors
      } catch (err: any) {
        console.error('Failed to check health status:', err);
        setBackendConnected(false);
        
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          setError('Backend server is not running. Please run "npm run start" or "npm run backend" to start the server.');
        } else if (err.code === 'ENOTFOUND') {
          setError('Cannot resolve backend server address. Please check if the backend is running on localhost:5000.');
        } else if (err.code === 'ETIMEDOUT') {
          setError('Connection to backend server timed out. Please check if the server is responding.');
        } else {
          setError(`Failed to connect to backend: ${err.message || 'Unknown error'}`);
        }
      }
    };
    
    checkHealth();
    
    // Retry connection every 10 seconds if not connected
    const retryInterval = setInterval(() => {
      if (!backendConnected) {
        checkHealth();
      }
    }, 10000);
    
    return () => clearInterval(retryInterval);
  }, [backendConnected]);

  // Poll for test status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && backendConnected) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${BACKEND_URL}/api/test-status`, {
            timeout: 5000
          });
          setTestStatus(response.data);
          
          if (response.data.status === 'completed' || response.data.status === 'error' || response.data.status === 'stopped') {
            setIsRunning(false);
          }
        } catch (err: any) {
          console.error('Failed to fetch test status:', err);
          if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
            setError('Lost connection to backend server');
            setBackendConnected(false);
          }
          setIsRunning(false);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, backendConnected]);

  const handleRunTest = async () => {
    if (!testSteps.trim()) {
      setError('Please enter test steps before running');
      return;
    }

    if (!backendConnected) {
      setError('Backend server is not connected. Please start the backend server first.');
      return;
    }

    setError('');
    setIsRunning(true);
    
    try {
      await axios.post(`${BACKEND_URL}/api/run-test`, {
        testSteps: testSteps
      }, {
        timeout: 10000
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start test';
      setError(errorMessage);
      setIsRunning(false);
      
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setBackendConnected(false);
      }
    }
  };

  const handleStopTest = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/stop-test`, {}, {
        timeout: 5000
      });
      setIsRunning(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to stop test';
      setError(errorMessage);
      
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setBackendConnected(false);
      }
    }
  };

  const getStatusIcon = () => {
    switch (testStatus.status) {
      case 'running':
      case 'initializing':
        return <Activity className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'stopped':
        return <Square className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (testStatus.status) {
      case 'running':
      case 'initializing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'stopped':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const renderHealthWarnings = () => {
    if (!backendConnected) {
      return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-800">Backend Connection Error</h3>
          </div>
          <p className="text-sm text-red-700 mb-2">
            Cannot connect to the backend server. Please ensure the backend is running.
          </p>
          <div className="text-xs text-red-600 bg-red-100 p-2 rounded font-mono">
            <p>To start the backend server, run one of these commands:</p>
            <p className="mt-1">• npm run start (starts both frontend and backend)</p>
            <p>• npm run backend (starts only the backend)</p>
          </div>
        </div>
      );
    }

    if (!healthStatus) return null;

    const warnings = [];
    
    if (!healthStatus.gemini_api_configured) {
      warnings.push('Gemini API key is not configured');
    }
    
    if (!healthStatus.browser_use_available) {
      warnings.push('browser-use library is not installed');
    }

    if (warnings.length === 0) return null;

    return (
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <h3 className="font-medium text-yellow-800">Configuration Issues</h3>
        </div>
        <ul className="text-sm text-yellow-700 space-y-1">
          {warnings.map((warning, index) => (
            <li key={index}>• {warning}</li>
          ))}
        </ul>
        {!healthStatus.gemini_api_configured && (
          <p className="text-xs text-yellow-600 mt-2">
            Please set your GEMINI_API_KEY in backend/.env file
          </p>
        )}
        {!healthStatus.browser_use_available && (
          <p className="text-xs text-yellow-600 mt-2">
            Run: pip install browser-use
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bot className="w-8 h-8 text-indigo-600" />
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                  backendConnected && healthStatus?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  WebTestAssistant
                </h1>
                <p className="text-sm text-gray-600">BrowserUse Agentic AI Solution with Live Browser View</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Globe className="w-4 h-4" />
                <span>Powered by Gemini AI</span>
              </div>
              <div className={`flex items-center space-x-2 text-sm px-3 py-1 rounded-full ${
                backendConnected ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{backendConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {testStatus.browserUrl && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <Monitor className="w-4 h-4" />
                  <span className="max-w-48 truncate">{testStatus.browserUrl}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderHealthWarnings()}
        
        <div className={`grid gap-8 transition-all duration-500 ${browserExpanded ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          {/* Test Input Section */}
          <div className={`${browserExpanded ? 'lg:col-span-1' : ''}`}>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Test Case Configuration</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="testSteps" className="block text-sm font-medium text-gray-700 mb-3">
                    Test Steps
                    <span className="text-gray-500 font-normal ml-1">(Enter each step as a bullet point)</span>
                  </label>
                  <textarea
                    id="testSteps"
                    value={testSteps}
                    onChange={(e) => setTestSteps(e.target.value)}
                    placeholder="Enter your test steps here, for example:&#10;• Navigate to https://example.com&#10;• Click on the login button&#10;• Enter username and password&#10;• Verify successful login&#10;• Take a screenshot of the dashboard"
                    className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm font-mono leading-relaxed bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 ${browserExpanded ? 'h-40' : 'h-80'}`}
                    disabled={isRunning}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={handleRunTest}
                    disabled={isRunning || !testSteps.trim() || !backendConnected || !healthStatus?.gemini_api_configured || !healthStatus?.browser_use_available}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-md"
                  >
                    <Play className="w-5 h-5" />
                    <span>{isRunning ? 'Test Running...' : 'Run Test Case'}</span>
                  </button>
                  
                  {isRunning && (
                    <button
                      onClick={handleStopTest}
                      className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      <Square className="w-4 h-4" />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status and Logs Section - Only show when browser is expanded */}
            {browserExpanded && (
              <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Test Status & Logs</h3>
                  {getStatusIcon()}
                </div>
                
                <div className={`px-4 py-3 rounded-lg border mb-4 ${getStatusColor()}`}>
                  <div className="font-medium capitalize">{testStatus.status}</div>
                  <div className="text-sm opacity-75 mt-1">
                    {testStatus.status === 'idle' && 'Ready to run tests'}
                    {testStatus.status === 'initializing' && 'Setting up browser...'}
                    {testStatus.status === 'running' && 'AI agent is executing steps...'}
                    {testStatus.status === 'completed' && 'Test completed successfully'}
                    {testStatus.status === 'error' && 'Test encountered an error'}
                    {testStatus.status === 'stopped' && 'Test was stopped'}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 h-40 overflow-y-auto font-mono text-sm">
                  {testStatus.logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      No logs yet. Start a test to see execution details.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {testStatus.logs.map((log, index) => (
                        <div key={index} className="text-green-400 flex items-start space-x-2">
                          <span className="text-gray-500 text-xs mt-1 flex-shrink-0">
                            {new Date().toLocaleTimeString()}
                          </span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Browser View Section */}
          <div className={`${browserExpanded ? 'fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl' : ''}`}>
            <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 ${browserExpanded ? 'h-full flex flex-col' : 'h-fit'}`}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Monitor className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Live Browser View</h3>
                </div>
                <button
                  onClick={() => setBrowserExpanded(!browserExpanded)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {browserExpanded ? (
                    <Minimize2 className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Maximize2 className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
              
              <div className={`p-6 ${browserExpanded ? 'flex-1 flex flex-col' : ''}`}>
                <div className={`bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center ${browserExpanded ? 'flex-1' : 'h-96'}`}>
                  {testStatus.browserScreenshot ? (
                    <div className="w-full h-full relative">
                      <img
                        src={`data:image/png;base64,${testStatus.browserScreenshot}`}
                        alt="Live browser view"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        Live View
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">
                        {isRunning ? 'Initializing browser view...' : 'Browser view will appear here during test execution'}
                      </p>
                      <p className="text-gray-500 text-sm mt-2">
                        {isRunning ? 'Please wait while the browser starts up' : 'Start a test to see live browser automation'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status and Logs Section - Only show when browser is not expanded */}
          {!browserExpanded && (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Test Status</h3>
                  {getStatusIcon()}
                </div>
                
                <div className={`px-4 py-3 rounded-lg border ${getStatusColor()}`}>
                  <div className="font-medium capitalize">{testStatus.status}</div>
                  <div className="text-sm opacity-75 mt-1">
                    {testStatus.status === 'idle' && 'Ready to run tests'}
                    {testStatus.status === 'initializing' && 'Setting up browser...'}
                    {testStatus.status === 'running' && 'AI agent is executing steps...'}
                    {testStatus.status === 'completed' && 'Test completed successfully'}
                    {testStatus.status === 'error' && 'Test encountered an error'}
                    {testStatus.status === 'stopped' && 'Test was stopped'}
                  </div>
                </div>
              </div>

              {/* Logs Section */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Execution Logs</h3>
                
                <div className="bg-gray-900 rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm">
                  {testStatus.logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      No logs yet. Start a test to see execution details.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {testStatus.logs.map((log, index) => (
                        <div key={index} className="text-green-400 flex items-start space-x-2">
                          <span className="text-gray-500 text-xs mt-1 flex-shrink-0">
                            {new Date().toLocaleTimeString()}
                          </span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600 bg-white/50 rounded-full px-4 py-2 backdrop-blur-sm">
            <Bot className="w-4 h-4" />
            <span>Built with Bolt.New</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;