import requests
import subprocess
import time
import sys

# Start server
server = subprocess.Popen([sys.executable, 'app.py'])
time.sleep(2)

try:
    response = requests.get('http://localhost:5000')
    if "Hello from Flask Server!" in response.text:
        print("Test passed!")
    else:
        print("Test failed!")
finally:
    server.terminate()
