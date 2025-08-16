import subprocess
import sys
import os

def test_hello():
    # Get the directory where this test file is located
    test_dir = os.path.dirname(os.path.abspath(__file__))
    hello_path = os.path.join(test_dir, 'hello.py')
    result = subprocess.run([sys.executable, hello_path], capture_output=True, text=True)
    assert "Hello from Python!" in result.stdout
    
if __name__ == "__main__":
    test_hello()
    print("Test passed!")
