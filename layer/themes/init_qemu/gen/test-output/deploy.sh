#!/bin/bash
# Deploy binary to QEMU via SSH
scp -P 2222 /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello root@localhost:/root/
scp -P 2222 /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello.debug root@localhost:/root/

# Or use 9P shared folder
mkdir -p /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/shared
cp /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/shared/
cp /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello.debug /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/shared/

echo "✅ Deployed to QEMU"
