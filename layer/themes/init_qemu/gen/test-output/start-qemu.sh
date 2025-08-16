#!/bin/bash
# Start QEMU with debugging enabled
qemu-system-x86_64 \
  -name test-vm \
  -m 512M \
  -smp 1 \
  -nographic \
  -kernel /path/to/kernel \
  -append "console=ttyS0" \
  -gdb tcp::1234 \
  -S \
  -netdev user,id=net0,hostfwd=tcp::2222-:22 \
  -device virtio-net,netdev=net0 \
  -drive file=/home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/test-alpine.qcow2,if=virtio
