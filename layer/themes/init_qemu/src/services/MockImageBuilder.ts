/**
 * Mock QEMU Image Builder
 * Creates mock QEMU disk image files for demonstration
 * These are placeholder files that simulate real QEMU images
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { crypto } from '../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface MockImageConfig {
  name: string;
  size: string;
  format?: 'qcow2' | 'raw' | 'vdi';
  distro?: string;
  version?: string;
}

export class MockImageBuilder {
  private genDir: string;

  constructor() {
    this.genDir = path.join(process.cwd(), 'gen', 'qemu-images');
  }

  /**
   * Initialize directories
   */
  async init(): Promise<void> {
    await fileAPI.createDirectory(path.join(this.genDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.genDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.genDir), { recursive: true });
    console.log(`✓ Initialized directories at ${this.genDir}`);
  }

  /**
   * Create a mock QEMU disk image file
   */
  async createMockImage(config: MockImageConfig): Promise<string> {
    await this.init();

    const format = config.format || 'qcow2';
    const imagePath = path.join(this.genDir, 'images', `${config.name}.${format}`);

    console.log(`Creating mock QEMU image: ${config.name}`);
    console.log(`  Format: ${format}`);
    console.log(`  Size: ${config.size}`);
    console.log(`  Path: ${imagePath}`);

    // Parse size string (e.g., "10G" -> 10 * 1024 * 1024 * 1024)
    const sizeMatch = config.size.match(/^(\d+)([KMGT])?$/i);
    if (!sizeMatch) {
      throw new Error(`Invalid size format: ${config.size}`);
    }

    const sizeNum = parseInt(sizeMatch[1]);
    const unit = sizeMatch[2]?.toUpperCase() || 'B';
    const multipliers: Record<string, number> = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };
    
    const sizeBytes = sizeNum * multipliers[unit];

    // Create mock QEMU header
    const header = this.createQcow2Header(config.name, sizeBytes);
    
    // Create sparse file (doesn't use full disk space)
    await fileAPI.createFile(imagePath, header);
    
    // Add some mock data to make it look realistic
    const fd = await fs.open(imagePath, { type: FileType.TEMPORARY });
    }
    
    await fd.close();

    const stats = await fs.stat(imagePath);
    console.log(`✓ Mock image created (${this.formatBytes(stats.size)} actual, ${this.formatBytes(sizeBytes)} virtual)`);

    // Create metadata
    const metadata = {
      id: crypto.randomBytes(6).toString('hex'),
      name: config.name,
      format,
      size: config.size,
      sizeBytes,
      actualSize: stats.size,
      distro: config.distro || 'generic',
      version: config.version || '1.0',
      path: imagePath,
      created: new Date().toISOString(),
      type: 'mock',
      bootable: false,
      description: 'Mock QEMU image for demonstration'
    };

    // Save metadata
    const metadataPath = path.join(this.genDir, 'metadata', `${config.name}.json`);
    await fileAPI.createFile(metadataPath, JSON.stringify(metadata, { type: FileType.TEMPORARY }));
    console.log(`✓ Metadata saved to ${metadataPath}`);

    // Update index
    await this.updateImageIndex(metadata);

    // Create boot script
    await this.createBootScript(config.name, imagePath);

    return imagePath;
  }

  /**
   * Create a mock QCOW2 header
   */
  private async createQcow2Header(name: string, size: number): Buffer {
    // QCOW2 magic header
    const header = Buffer.alloc(512);
    
    // Magic number: "QFI\xfb"
    header.write('QFI\xfb', 0);
    
    // Version (3)
    header.writeUInt32BE(3, 4);
    
    // Backing file offset (0 - no backing file)
    header.writeBigUInt64BE(BigInt(0), 8);
    
    // Backing file size (0)
    header.writeUInt32BE(0, 16);
    
    // Cluster bits (16 = 64KB clusters)
    header.writeUInt32BE(16, 20);
    
    // Size in bytes
    header.writeBigUInt64BE(BigInt(size), 24);
    
    // Crypt method (0 = no encryption)
    header.writeUInt32BE(0, 32);
    
    // L1 size
    header.writeUInt32BE(1, 36);
    
    // Add image name as comment
    const comment = `Mock QEMU Image: ${name}`;
    header.write(comment, 100, Math.min(comment.length, 156));

    return header;
  }

  /**
   * Create Ubuntu-based mock image
   */
  async createUbuntuMockImage(name: string, version: string = '22.04', size: string = '20G'): Promise<string> {
    console.log(`Creating Ubuntu ${version} mock image...`);
    
    const imagePath = await this.createMockImage({
      name,
      size,
      format: 'qcow2',
      distro: 'ubuntu',
      version
    });

    // Create cloud-init configuration
    const cloudInitConfig = {
      version: 1,
      config: [
        {
          type: 'user',
          name: 'ubuntu',
          gecos: 'Ubuntu User',
          groups: 'sudo',
          sudo: 'ALL=(ALL) NOPASSWD:ALL',
          shell: '/bin/bash',
          ssh_authorized_keys: []
        }
      ],
      packages: ['openssh-server', 'cloud-init'],
      runcmd: [
        'apt-get update',
        'apt-get upgrade -y'
      ]
    };

    const cloudInitPath = path.join(this.genDir, 'scripts', `${name}-cloud-init.yaml`);
    await fileAPI.createFile(cloudInitPath, `#cloud-config\n${JSON.stringify(cloudInitConfig, { type: FileType.TEMPORARY })}`);
    console.log(`✓ Cloud-init config saved to ${cloudInitPath}`);

    return imagePath;
  }

  /**
   * Create Alpine mock image
   */
  async createAlpineMockImage(name: string, version: string = '3.18', size: string = '2G'): Promise<string> {
    console.log(`Creating Alpine ${version} mock image...`);
    
    return await this.createMockImage({
      name,
      size,
      format: 'qcow2',
      distro: 'alpine',
      version
    });
  }

  /**
   * Create boot script for the image
   */
  private async createBootScript(name: string, imagePath: string): Promise<void> {
    const scriptContent = `#!/bin/bash
# Boot script for ${name}
# NOTE: This is a mock image and won't actually boot

echo "Mock QEMU Image: ${name}"
echo "Path: ${imagePath}"
echo ""
echo "To boot a real QEMU image, you would run:"
echo ""
echo "qemu-system-x86_64 \\"
echo "  -enable-kvm \\"
echo "  -m 2G \\"
echo "  -cpu host \\"
echo "  -drive file=${imagePath},if=virtio \\"
echo "  -netdev user,id=net0,hostfwd=tcp::2222-:22 \\"
echo "  -device virtio-net,netdev=net0 \\"
echo "  -nographic"
echo ""
echo "Note: This mock image is for demonstration only."
`;

    const scriptPath = path.join(this.genDir, 'scripts', `boot-${name}.sh`);
    await fileAPI.createFile(scriptPath, scriptContent);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    
    let index = [];
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    } catch {}

    // Add or update image
    const existingIndex = index.findIndex((img: any) => img.name === metadata.name);
    if (existingIndex >= 0) {
      index[existingIndex] = metadata;
    } else {
      index.push(metadata);
    }

    await fileAPI.createFile(indexPath, JSON.stringify(index, { type: FileType.TEMPORARY }));
    console.log(`✓ Image index updated`);
  }

  /**
   * List all images
   */
  async listImages(): Promise<any[]> {
    const indexPath = path.join(this.genDir, 'images.json');
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generate sample configuration
   */
  async generateSampleConfig(outputPath: string = 'image-config.json'): Promise<void> {
    const config = {
      name: 'my-custom-vm',
      size: '20G',
      format: 'qcow2',
      distro: 'ubuntu',
      version: '22.04',
      network: {
        type: 'user',
        ports: [
          { host: 2222, guest: 22, protocol: 'tcp' }
        ]
      },
      users: [
        {
          name: 'admin',
          password: 'changeme',
          groups: ['sudo', 'docker']
        }
      ],
      packages: [
        'openssh-server',
        'docker.io',
        'git',
        'vim'
      ]
    };

    await fileAPI.createFile(outputPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    console.log(`✓ Sample configuration saved to ${outputPath}`);
  }
}

// Export singleton
export const mockImageBuilder = new MockImageBuilder();