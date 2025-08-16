#!/bin/bash
# Run performance profiling in QEMU
qemu-system-x86_64 \
  -name perf-vm \
  -m 512M \
  -enable-kvm \
  -cpu host \
  -plugin contrib/plugins/libexeclog.so,logfile=/home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/exec.log \
  -d cpu,exec,in_asm \
  -D /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/qemu-trace.log

# Analyze with perf
perf record -o /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/perf.data -- /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello
perf report -i /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/perf.data > /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/perf-report.txt
