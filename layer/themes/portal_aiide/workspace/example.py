#!/usr/bin/env python3
"""
AIIDE Python Example
Demonstrates AI-assisted development
"""

def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[-1] + sequence[-2])
    
    return sequence

def main():
    # Generate first 10 Fibonacci numbers
    result = fibonacci(10)
    print(f"Fibonacci sequence: {result}")
    
    # Calculate sum
    total = sum(result)
    print(f"Sum of sequence: {total}")

if __name__ == "__main__":
    main()
