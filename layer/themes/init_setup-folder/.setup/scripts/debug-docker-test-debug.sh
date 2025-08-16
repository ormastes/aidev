#!/bin/bash
# Docker remote debugging script for test-debug

echo "=== Docker Remote Debugging ==="
echo ""
echo "1. SSH Debug:"
echo "   ssh -p 2222 root@localhost"
echo "   gdb /workspace/program"
echo ""
echo "2. Remote GDB:"
echo "   gdb -ex 'target remote :1234'"
echo ""
echo "3. VS Code Debug:"
echo "   Open http://localhost:8080"
echo "   Install C++ extension"
echo "   Press F5 to start debugging"
echo ""

# Connect to GDB server
gdb -ex "target remote localhost:1234"
