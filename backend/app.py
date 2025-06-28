import asyncio
import os
import threading
import base64
import time
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr
import logging

try:
    from browser_use import Agent, Controller
    from browser_use.browser.browser import Browser, BrowserConfig
    BROWSER_USE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: browser-use not available: {e}")
    BROWSER_USE_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)

# Global variables to track test execution
current_test = None
test_status = "idle"
test_logs = []
browser_screenshot = None
browser_url = ""
cdp_port = 9222

class TestRunner:
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError('GEMINI_API_KEY is not set in environment variables')
        
        try:
            self.llm = ChatGoogleGenerativeAI(
                model='gemini-2.0-flash-exp', 
                api_key=SecretStr(self.api_key)
            )
            logger.info("Gemini AI initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini AI: {e}")
            raise
        
        self.browser = None
        if BROWSER_USE_AVAILABLE:
            self.controller = Controller()
        else:
            self.controller = None
    
    async def run_test(self, test_steps):
        global test_status, test_logs, browser_screenshot, browser_url
        
        try:
            test_status = "initializing"
            test_logs.append("Starting WebTestAssistant...")
            
            if not BROWSER_USE_AVAILABLE:
                test_logs.append("Error: browser-use library not available")
                test_status = "error"
                return
            
            test_logs.append("Initializing browser with remote debugging...")
            
            # Initialize browser with remote debugging enabled
            try:
                self.browser = Browser(
                    config=BrowserConfig(
                        headless=False,
                    )
                )
                test_logs.append("Browser initialized successfully")
            except Exception as e:
                test_logs.append(f"Browser initialization failed: {str(e)}")
                test_status = "error"
                return
            
            test_status = "running"
            test_logs.append("Starting AI agent...")
            test_logs.append("Browser view will be available shortly...")
            
            # Create and run agent
            try:
                agent = Agent(
                    task=f"Execute the following test steps:\n{test_steps}",
                    llm=self.llm,
                    browser=self.browser,
                    controller=self.controller,
                )
                test_logs.append("AI agent created successfully")
            except Exception as e:
                test_logs.append(f"Failed to create AI agent: {str(e)}")
                test_status = "error"
                return
            
            test_logs.append("Running test automation...")
            
            # Start screenshot capture in background
            screenshot_task = asyncio.create_task(self.capture_screenshots())
            
            try:
                await agent.run(max_steps=25)
                test_logs.append("Test execution completed successfully!")
                test_status = "completed"
            except Exception as e:
                test_logs.append(f"Test execution error: {str(e)}")
                test_status = "error"
            finally:
                # Cancel screenshot task
                screenshot_task.cancel()
                try:
                    await screenshot_task
                except asyncio.CancelledError:
                    pass
            
        except Exception as e:
            test_status = "error"
            test_logs.append(f"Unexpected error: {str(e)}")
            test_logs.append(f"Traceback: {traceback.format_exc()}")
            logger.error(f"Test execution error: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        finally:
            if self.browser:
                try:
                    await self.browser.close()
                    test_logs.append("Browser closed")
                except Exception as e:
                    test_logs.append(f"Error closing browser: {str(e)}")
    
    async def capture_screenshots(self):
        """Capture screenshots periodically for the embedded browser view"""
        global browser_screenshot, browser_url
        
        # Wait a bit for browser to fully initialize
        await asyncio.sleep(3)
        
        while test_status in ["running", "initializing"]:
            try:
                if self.browser and hasattr(self.browser, 'page') and self.browser.page:
                    # Get current URL
                    browser_url = self.browser.page.url
                    
                    # Take screenshot
                    screenshot_bytes = await self.browser.page.screenshot(full_page=False)
                    browser_screenshot = base64.b64encode(screenshot_bytes).decode('utf-8')
                    
                await asyncio.sleep(2)  # Update every 2 seconds
            except Exception as e:
                logger.error(f"Screenshot capture error: {e}")
                await asyncio.sleep(5)  # Wait longer on error

def run_async_test(test_steps):
    """Run the async test in a new event loop"""
    try:
        runner = TestRunner()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(runner.run_test(test_steps))
        finally:
            loop.close()
    except Exception as e:
        global test_status, test_logs
        test_status = "error"
        test_logs.append(f"Failed to initialize test runner: {str(e)}")
        logger.error(f"Test runner initialization error: {e}")

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "service": "WebTestAssistant",
        "browser_use_available": BROWSER_USE_AVAILABLE,
        "gemini_api_configured": bool(os.getenv('GEMINI_API_KEY'))
    })

@app.route('/api/run-test', methods=['POST'])
def run_test():
    global current_test, test_status, test_logs, browser_screenshot, browser_url
    
    try:
        data = request.json
        test_steps = data.get('testSteps', '')
        
        if not test_steps.strip():
            return jsonify({"error": "Test steps cannot be empty"}), 400
        
        # Check if a test is already running
        if test_status == "running" or test_status == "initializing":
            return jsonify({"error": "A test is already running"}), 409
        
        # Check prerequisites
        if not os.getenv('GEMINI_API_KEY'):
            return jsonify({"error": "GEMINI_API_KEY is not configured"}), 500
        
        if not BROWSER_USE_AVAILABLE:
            return jsonify({"error": "browser-use library is not available. Please install it with: pip install browser-use"}), 500
        
        # Reset test state
        current_test = test_steps
        test_status = "starting"
        test_logs = []
        browser_screenshot = None
        browser_url = ""
        test_logs.append("Test steps received")
        test_logs.append("Preparing to start test execution...")
        
        # Start test in a separate thread
        thread = threading.Thread(target=run_async_test, args=(test_steps,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "message": "Test execution started",
            "status": test_status,
            "testId": "current",
            "cdpPort": cdp_port
        })
        
    except Exception as e:
        logger.error(f"Error starting test: {e}")
        return jsonify({"error": f"Failed to start test: {str(e)}"}), 500

@app.route('/api/test-status', methods=['GET'])
def get_test_status():
    return jsonify({
        "status": test_status,
        "logs": test_logs,
        "currentTest": current_test,
        "browserScreenshot": browser_screenshot,
        "browserUrl": browser_url,
        "cdpPort": cdp_port
    })

@app.route('/api/stop-test', methods=['POST'])
def stop_test():
    global test_status, test_logs
    
    if test_status in ["running", "initializing"]:
        test_status = "stopped"
        test_logs.append("Test execution stopped by user")
        return jsonify({"message": "Test execution stopped"})
    else:
        return jsonify({"message": "No test is currently running"})

if __name__ == '__main__':
    # Check for required environment variables
    if not os.getenv('GEMINI_API_KEY'):
        print("Error: GEMINI_API_KEY environment variable is not set")
        print("Please set your Gemini API key in a .env file or environment variable")
        print("1. Copy backend/.env.example to backend/.env")
        print("2. Add your Gemini API key to the .env file")
        exit(1)
    
    if not BROWSER_USE_AVAILABLE:
        print("Error: browser-use library is not installed")
        print("Please install it with: pip install browser-use")
        exit(1)
    
    print("Starting WebTestAssistant Backend...")
    print("Gemini API Key: Configured")
    print(f"Server will start on http://localhost:5000")
    print(f"Chrome Debug Port: {cdp_port}")
    print("browser-use: Available")
    
    app.run(debug=True, host='0.0.0.0', port=5000)