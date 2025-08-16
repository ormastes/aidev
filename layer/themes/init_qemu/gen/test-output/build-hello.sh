#!/bin/bash
# Cross-compile for QEMU target
gcc -g -O0 -static -o /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello.c

# Strip debug symbols to separate file
objcopy --only-keep-debug /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello.debug
strip /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello
objcopy --add-gnu-debuglink=/home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello.debug /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello

echo "✅ Program built with debug symbols"
