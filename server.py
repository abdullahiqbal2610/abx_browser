#!/usr/bin/env python3
"""
Simple HTTP server for Chrome extension development
Serves files for testing the xAI Chrome extension
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuration
PORT = 5000
HOST = "0.0.0.0"

class ExtensionHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler for serving Chrome extension files"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Custom logging format"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    """Start the development server"""
    try:
        # Ensure we're in the right directory
        os.chdir(Path(__file__).parent)
        
        # Create a simple index.html for the server root
        if not os.path.exists('index.html'):
            with open('index.html', 'w') as f:
                f.write(f"""
<!DOCTYPE html>
<html>
<head>
    <title>xAI Chrome Extension Development Server</title>
    <style>
        body {{ 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: #0a0a0a;
            color: #ffffff;
        }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .instructions {{ background: #1a1a2e; padding: 20px; border-radius: 10px; }}
        .file-list {{ margin-top: 30px; }}
        .file-list a {{ 
            display: block; 
            padding: 10px; 
            margin: 5px 0; 
            background: #2a2a4e; 
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 5px; 
        }}
        .file-list a:hover {{ background: #3a3a6e; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 xAI Chrome Extension</h1>
        <p>Development Server Running on Port {PORT}</p>
    </div>
    
    <div class="instructions">
        <h2>📋 How to Load the Extension</h2>
        <ol>
            <li>Open Chrome and navigate to <code>chrome://extensions/</code></li>
            <li>Enable "Developer mode" in the top right</li>
            <li>Click "Load unpacked" and select this directory</li>
            <li>The xAI extension will be loaded and ready to use!</li>
        </ol>
    </div>
    
    <div class="file-list">
        <h2>📁 Extension Files</h2>
        <a href="manifest.json">manifest.json</a>
        <a href="newtab.html">newtab.html</a>
        <a href="styles.css">styles.css</a>
        <a href="script.js">script.js</a>
        <a href="background.js">background.js</a>
        <a href="popup.html">popup.html</a>
        <a href="popup.js">popup.js</a>
    </div>
</body>
</html>
                """)
        
        # Start the server
        with socketserver.TCPServer((HOST, PORT), ExtensionHTTPRequestHandler) as httpd:
            print(f"🚀 xAI Chrome Extension Development Server")
            print(f"📡 Serving at http://{HOST}:{PORT}")
            print(f"📁 Directory: {os.getcwd()}")
            print(f"🔧 Load extension from: {os.getcwd()}")
            print("=" * 50)
            print("📋 To load the extension:")
            print("1. Open Chrome → chrome://extensions/")
            print("2. Enable 'Developer mode'")
            print("3. Click 'Load unpacked' → Select this directory")
            print("=" * 50)
            print("✨ Server ready! Press Ctrl+C to stop")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print("Try stopping other servers or use a different port")
        else:
            print(f"❌ Server error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()