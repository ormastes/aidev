#!/usr/bin/env python3
"""
Migrated from: start-qemu.sh
Auto-generated Python - 2025-08-16T04:57:27.591Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Start QEMU with debugging enabled
    subprocess.run("qemu-system-x86_64 \", shell=True)
    subprocess.run("-name test-vm \", shell=True)
    subprocess.run("-m 512M \", shell=True)
    subprocess.run("-smp 1 \", shell=True)
    subprocess.run("-nographic \", shell=True)
    subprocess.run("-kernel /path/to/kernel \", shell=True)
    subprocess.run("-append "console=ttyS0" \", shell=True)
    subprocess.run("-gdb tcp::1234 \", shell=True)
    subprocess.run("-S \", shell=True)
    subprocess.run("-netdev user,id=net0,hostfwd=tcp::2222-:22 \", shell=True)
    subprocess.run("-device virtio-net,netdev=net0 \", shell=True)
    subprocess.run("-drive file=/home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/test-alpine.qcow2,if=virtio", shell=True)

if __name__ == "__main__":
    main()