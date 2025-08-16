# QEMU Image Builder Documentation

## Overview

The QEMU Image Builder is a TypeScript-based service that automates the creation of QEMU virtual machine images. All images are generated and stored under the `gen/qemu-images/` directory.

## Core Features

1. **Automated Base Image Downloads** - Downloads and caches base images from official sources
2. **Image Customization** - Pre-configure users, packages, and network settings
3. **Multiple Distro Support** - Ubuntu, Debian, Alpine, Fedora, Arch Linux
4. **Cloud-Init Integration** - Full cloud-init support for cloud images
5. **Custom Kernel Support** - Build images with custom kernels for testing
6. **Metadata Tracking** - Comprehensive metadata and checksums for all images

## How It Works

### Image Building Process

1. **Download Base Image** - Downloads official cloud or minimal images
2. **Create Working Copy** - Creates a COW (copy-on-write) overlay
3. **Customize Image** - Applies user configuration and packages
4. **Install Software** - Installs specified packages
5. **Configure Users** - Sets up user accounts and SSH keys
6. **Network Setup** - Configures network interfaces
7. **Run Scripts** - Executes custom setup scripts
8. **Finalize** - Compresses and optimizes the image
9. **Generate Metadata** - Creates checksums and metadata

### Storage Structure

```
gen/qemu-images/
├── images/              # Final QEMU images
│   ├── ubuntu-24.04.qcow2
│   └── alpine-3.18.qcow2
├── metadata/            # Image metadata
│   ├── ubuntu-24.04.json
│   └── alpine-3.18.json
├── scripts/             # Generated scripts
│   ├── install-packages.sh
│   └── custom-setup.sh
└── images.json          # Image registry
```

## Usage Examples

### Build Ubuntu Cloud Image

```bash
./scripts/build-qemu-image.sh ubuntu \
  --name ubuntu-dev \
  --version 24.04 \
  --size 30G \
  --username developer \
  --password secret123 \
  --ssh-key ~/.ssh/id_rsa.pub \
  --packages "docker.io git vim curl"
```

### Build Alpine Minimal Image

```bash
./scripts/build-qemu-image.sh alpine \
  --name alpine-minimal \
  --version 3.18 \
  --size 2G \
  --packages "openssh bash sudo"
```

### Build Custom Image from Config

```json
// custom-image.json
{
  "name": "my-dev-environment",
  "distro": "ubuntu",
  "version": "24.04",
  "size": "50G",
  "format": "qcow2",
  "packages": [
    "build-essential",
    "docker.io",
    "git",
    "vim",
    "python3-pip",
    "nodejs",
    "npm"
  ],
  "users": [
    {
      "username": "developer",
      "password": "changeme",
      "sshKey": "ssh-rsa AAAAB3...",
      "groups": ["sudo", "docker"],
      "sudo": true
    }
  ],
  "networkConfig": {
    "hostname": "dev-machine",
    "interfaces": [
      {
        "name": "eth0",
        "type": "dhcp"
      }
    ],
    "dns": ["8.8.8.8", "1.1.1.1"]
  },
  "customScripts": [
    "#!/bin/bash",
    "curl -fsSL https://get.docker.com | sh",
    "systemctl enable docker",
    "echo 'Development environment ready!' > /etc/motd"
  ]
}
```

```bash
./scripts/build-qemu-image.sh custom custom-image.json
```

### Build Kernel Test Image

```bash
# First build your kernel
./scripts/build-linux-kernel.sh --with-initramfs

# Then create test image
./scripts/build-qemu-image.sh kernel \
  --name kernel-test \
  --kernel ~/qemu-dev/kernel/bzImage \
  --initrd ~/qemu-dev/kernel/initramfs.gz \
  --size 10G
```

## Image Management

### List Available Images

```bash
./scripts/build-qemu-image.sh list
```

Output:
```
Available QEMU Images:
────────────────────────────────────────

ubuntu-24.04
  ID: a3f892c1d4e5
  Distro: ubuntu 24.04
  Size: 2048.50 MB
  Format: qcow2
  Created: 2025-08-13 10:30:00
  Path: gen/qemu-images/images/ubuntu-24.04.qcow2

alpine-3.18
  ID: b7c234f5a891
  Distro: alpine 3.18
  Size: 256.25 MB
  Format: qcow2
  Created: 2025-08-13 11:00:00
  Path: gen/qemu-images/images/alpine-3.18.qcow2

────────────────────────────────────────
Total: 2 image(s)
```

### Delete an Image

```bash
./scripts/build-qemu-image.sh delete ubuntu-24.04
```

## Using Built Images

### Start VM with Built Image

```bash
# Create VM using built image
./scripts/qemu-vm-manager.sh create myvm

# Copy built image to VM directory
cp gen/qemu-images/images/ubuntu-24.04.qcow2 ~/qemu-dev/images/myvm.qcow2

# Start the VM
./scripts/qemu-vm-manager.sh start myvm
```

### Direct QEMU Launch

```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 4G \
  -cpu host \
  -drive file=gen/qemu-images/images/ubuntu-24.04.qcow2,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::2222-:22 \
  -device virtio-net,netdev=net0 \
  -nographic
```

## Customization Tools

### Using virt-customize

If `virt-customize` is available, the builder will use it for advanced customization:

```bash
# Install virt-customize
sudo apt-get install libguestfs-tools

# The builder will automatically detect and use it
```

### Using qemu-nbd

For systems without libguestfs:

```bash
# The builder falls back to qemu-nbd
sudo modprobe nbd
# Images are mounted and modified directly
```

## Cloud-Init Support

Built images include cloud-init for easy configuration:

### User Data Example

```yaml
#cloud-config
users:
  - name: admin
    ssh_authorized_keys:
      - ssh-rsa AAAAB3...
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo, docker
    shell: /bin/bash

packages:
  - docker.io
  - git
  - vim

runcmd:
  - systemctl start docker
  - docker run hello-world
```

### Using Cloud-Init with QEMU

```bash
# Create cloud-init ISO
cloud-localds seed.iso user-data.yaml

# Boot with cloud-init
qemu-system-x86_64 \
  -drive file=gen/qemu-images/images/ubuntu-24.04.qcow2,if=virtio \
  -drive file=seed.iso,if=virtio \
  -enable-kvm -m 2G
```

## Performance Tips

### Image Compression

All images are compressed by default:

```bash
# Manual compression
qemu-img convert -O qcow2 -c input.qcow2 output.qcow2
```

### Caching

Base images are cached in `~/.cache/qemu-images/`:

```bash
# Clear cache if needed
rm -rf ~/.cache/qemu-images/
```

### Parallel Builds

Build multiple images concurrently:

```bash
# Build multiple images
./scripts/build-qemu-image.sh ubuntu --name ubuntu1 &
./scripts/build-qemu-image.sh alpine --name alpine1 &
wait
```

## Troubleshooting

### Build Fails with Permission Errors

```bash
# Ensure user is in kvm group
sudo usermod -aG kvm $USER
# Re-login

# Check permissions
ls -la /dev/kvm
```

### Missing Dependencies

```bash
# Install required tools
sudo apt-get update
sudo apt-get install -y \
  qemu-utils \
  qemu-system-x86 \
  libguestfs-tools \
  cloud-utils
```

### Image Won't Boot

```bash
# Verify image integrity
qemu-img check gen/qemu-images/images/myimage.qcow2

# Test with simple boot
qemu-system-x86_64 -m 1G -hda gen/qemu-images/images/myimage.qcow2
```

## API Reference

### QEMUImageBuilder Class

```typescript
class QEMUImageBuilder {
  // Build complete image
  buildImage(config: ImageBuildConfig): Promise<BuiltImage>
  
  // Convenience methods
  buildUbuntuCloudImage(options): Promise<BuiltImage>
  buildAlpineImage(options): Promise<BuiltImage>
  buildKernelTestImage(options): Promise<BuiltImage>
  
  // Management
  listImages(): Promise<BuiltImage[]>
  getImage(nameOrId: string): Promise<BuiltImage>
  deleteImage(nameOrId: string): Promise<boolean>
}
```

### Events

```typescript
builder.on('build:start', (data) => { })
builder.on('build:progress', (progress) => { })
builder.on('build:complete', (image) => { })
builder.on('build:error', (error) => { })
builder.on('cache:hit', (data) => { })
```

## Best Practices

1. **Use Cloud Images** - Start with official cloud images when possible
2. **Cache Base Images** - Reuse cached base images for faster builds
3. **Minimize Image Size** - Only install necessary packages
4. **Use SSH Keys** - Configure SSH keys instead of passwords
5. **Document Custom Scripts** - Comment complex customization scripts
6. **Version Images** - Use semantic versioning for image names
7. **Test Images** - Always test built images before production use
8. **Keep Metadata** - Don't delete metadata files for audit trails

## Security Considerations

1. **Passwords** - Use strong passwords or SSH keys only
2. **Updates** - Always update packages in custom images
3. **Minimal Installs** - Start with minimal base images
4. **Firewall** - Configure firewall rules in custom scripts
5. **Audit** - Review custom scripts for security issues
6. **Checksums** - Verify image checksums before use

## Next Steps

- Build your first image: `./scripts/build-qemu-image.sh ubuntu`
- Create a VM: `./scripts/qemu-vm-manager.sh create myvm`
- Read VM Manager docs for running images
- Customize images with your own configurations