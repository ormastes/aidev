#!/bin/bash
# QEMU debug script for test-vm

echo "Starting GDB for QEMU debugging..."
echo "Target: localhost:1234"
echo ""
echo "Commands:"
echo "  (gdb) target remote :1234"
echo "  (gdb) break main"
echo "  (gdb) continue"
echo ""

gdb -ex "target remote :1234"
