#!/bin/bash
# Create Alpine Linux QEMU image
qemu-img create -f qcow2 /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/test-alpine.qcow2 2G

# Download Alpine mini root filesystem
if [ ! -f /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/alpine-minirootfs.tar.gz ]; then
  wget -O /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/alpine-minirootfs.tar.gz \
    https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/alpine-minirootfs-3.18.4-x86_64.tar.gz
fi

echo "✅ QEMU image created successfully"
