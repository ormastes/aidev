/**
 * Simple QEMU Image Builder
 * Creates actual QEMU disk images that can boot Linux
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const execAsync = promisify(exec);

export interface SimpleImageConfig {
  name: string;
  size: string;
  format?: 'qcow2' | 'raw' | 'vdi';
  baseImage?: string;
}

export class SimpleImageBuilder {
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
   * Create a simple QEMU disk image
   */
  async createImage(config: SimpleImageConfig): Promise<string> {
    await this.init();

    const format = config.format || 'qcow2';
    const imagePath = path.join(this.genDir, 'images', `${config.name}.${format}`);

    console.log(`Creating QEMU image: ${config.name}`);
    console.log(`  Format: ${format}`);
    console.log(`  Size: ${config.size}`);
    console.log(`  Path: ${imagePath}`);

    try {
      // Create the disk image using qemu-img
      const cmd = `qemu-img create -f ${format} "${imagePath}" ${config.size}`;
      console.log(`Running: ${cmd}`);
      
      const { stdout, stderr } = await execAsync(cmd);
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('Formatting')) console.error(stderr);

      // Verify the image was created
      await fs.access(imagePath);
      const stats = await fs.stat(imagePath);
      
      console.log(`✓ Image created successfully (${stats.size} bytes)`);

      // Save metadata
      const metadata = {
        name: config.name,
        format,
        size: config.size,
        path: imagePath,
        created: new Date().toISOString(),
        actualSize: stats.size
      };

      const metadataPath = path.join(this.genDir, 'metadata', `${config.name}.json`);
      await fileAPI.createFile(metadataPath, JSON.stringify(metadata, { type: FileType.TEMPORARY }));
      console.log(`✓ Metadata saved to ${metadataPath}`);

      return imagePath;
    } catch (error: any) {
      console.error(`Failed to create image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download Ubuntu cloud image
   */
  async downloadUbuntuCloudImage(version: string = '22.04'): Promise<string> {
    await this.init();

    const filename = `ubuntu-${version}-server-cloudimg-amd64.img`;
    const downloadPath = path.join(this.genDir, 'downloads', filename);

    // Check if already downloaded
    try {
      await fs.access(downloadPath);
      console.log(`✓ Ubuntu ${version} image already downloaded`);
      return downloadPath;
    } catch {
      // Need to download
    }

    const url = `https://cloud-images.ubuntu.com/releases/${version}/release/ubuntu-${version}-server-cloudimg-amd64.img`;
    console.log(`Downloading Ubuntu ${version} cloud image...`);
    console.log(`  URL: ${url}`);
    console.log(`  Destination: ${downloadPath}`);

    try {
      const cmd = `wget -O "${downloadPath}" "${url}"`;
      console.log(`Running: ${cmd}`);
      
      const { stderr } = await execAsync(cmd, { 
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      await fs.access(downloadPath);
      const stats = await fs.stat(downloadPath);
      console.log(`✓ Downloaded successfully (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return downloadPath;
    } catch (error: any) {
      console.error(`Failed to download: ${error.message}`);
      // Try with curl as fallback
      try {
        const cmd = `curl -L -o "${downloadPath}" "${url}"`;
        console.log(`Trying with curl: ${cmd}`);
        await execAsync(cmd);
        return downloadPath;
      } catch (curlError: any) {
        console.error(`Curl also failed: ${curlError.message}`);
        throw error;
      }
    }
  }

  /**
   * Create Ubuntu-based QEMU image
   */
  async createUbuntuImage(name: string, size: string = '20G'): Promise<string> {
    await this.init();

    console.log(`Creating Ubuntu-based QEMU image: ${name}`);

    // First download the base Ubuntu cloud image
    const baseImage = await this.downloadUbuntuCloudImage('22.04');

    // Create a new image based on the Ubuntu cloud image
    const imagePath = path.join(this.genDir, 'images', `${name}.qcow2`);

    try {
      // Create a copy-on-write image based on the Ubuntu image
      const cmd = `qemu-img create -f qcow2 -F qcow2 -b "${baseImage}" "${imagePath}" ${size}`;
      console.log(`Creating COW image: ${cmd}`);
      
      const { stdout, stderr } = await execAsync(cmd);
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('Formatting')) console.error(stderr);

      // Verify the image
      await fs.access(imagePath);
      const stats = await fs.stat(imagePath);
      
      console.log(`✓ Ubuntu image created successfully`);
      console.log(`  Path: ${imagePath}`);
      console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Base: Ubuntu 22.04 Cloud Image`);

      // Save metadata
      const metadata = {
        name,
        type: 'ubuntu',
        version: '22.04',
        format: 'qcow2',
        size,
        path: imagePath,
        baseImage,
        created: new Date().toISOString(),
        actualSize: stats.size
      };

      const metadataPath = path.join(this.genDir, 'metadata', `${name}.json`);
      await fileAPI.createFile(metadataPath, JSON.stringify(metadata, { type: FileType.TEMPORARY }));

      return imagePath;
    } catch (error: any) {
      console.error(`Failed to create Ubuntu image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a bootable image with Alpine Linux
   */
  async createAlpineImage(name: string, size: string = '2G'): Promise<string> {
    await this.init();

    console.log(`Creating Alpine Linux QEMU image: ${name}`);

    const imagePath = path.join(this.genDir, 'images', `${name}.qcow2`);

    try {
      // Create the disk image
      const cmd = `qemu-img create -f qcow2 "${imagePath}" ${size}`;
      console.log(`Creating disk: ${cmd}`);
      
      await execAsync(cmd);

      console.log(`✓ Alpine image created`);
      console.log(`  Path: ${imagePath}`);
      console.log(`  Note: Boot with Alpine ISO to install`);

      // Download Alpine ISO if needed
      const isoPath = await this.downloadAlpineISO();
      
      // Create boot script
      const bootScript = `#!/bin/bash
# Boot Alpine installer
qemu-system-x86_64 \\
  -enable-kvm \\
  -m 1G \\
  -drive file="${imagePath}",if=virtio \\
  -cdrom "${isoPath}" \\
  -boot d \\
  -netdev user,id=net0 \\
  -device virtio-net,netdev=net0
`;

      const scriptPath = path.join(this.genDir, 'scripts', `boot-${name}.sh`);
      await fileAPI.createDirectory(path.dirname(scriptPath));
      await fileAPI.createFile(scriptPath, bootScript);
      await fs.chmod(scriptPath, { type: FileType.TEMPORARY });

    try {
      await fs.access(downloadPath);
      console.log(`✓ Alpine ISO already downloaded`);
      return downloadPath;
    } catch {
      // Need to download
    }

    const url = `https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/${filename}`;
    console.log(`Downloading Alpine ISO...`);

    try {
      const cmd = `wget -O "${downloadPath}" "${url}"`;
      await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 });
      console.log(`✓ Alpine ISO downloaded`);
      return downloadPath;
    } catch (error: any) {
      console.error(`Failed to download Alpine ISO: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all created images
   */
  async listImages(): Promise<any[]> {
    await this.init();

    const imagesDir = path.join(this.genDir, 'images');
    const metadataDir = path.join(this.genDir, 'metadata');

    try {
      const files = await fs.readdir(imagesDir);
      const images = [];

      for (const file of files) {
        const imagePath = path.join(imagesDir, file);
        const stats = await fs.stat(imagePath);
        
        // Try to load metadata
        const name = path.parse(file).name;
        let metadata = {};
        try {
          const metadataPath = path.join(metadataDir, `${name}.json`);
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          metadata = JSON.parse(metadataContent);
        } catch {}

        images.push({
          name,
          file,
          path: imagePath,
          size: stats.size,
          created: stats.birthtime,
          ...metadata
        });
      }

      return images;
    } catch (error: any) {
      console.error(`Failed to list images: ${error.message}`);
      return [];
    }
  }

  /**
   * Get QEMU info about an image
   */
  async getImageInfo(imagePath: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`qemu-img info --output=json "${imagePath}"`);
      return JSON.parse(stdout);
    } catch (error: any) {
      console.error(`Failed to get image info: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if required tools are installed
   */
  async checkRequirements(): Promise<boolean> {
    const tools = ['qemu-img', 'qemu-system-x86_64'];
    let allInstalled = true;

    console.log('Checking requirements...');

    for (const tool of tools) {
      try {
        await execAsync(`which ${tool}`);
        console.log(`  ✓ ${tool} is installed`);
      } catch {
        console.log(`  ✗ ${tool} is NOT installed`);
        allInstalled = false;
      }
    }

    // Check for optional tools
    const optionalTools = ['wget', 'curl', 'virt-customize'];
    for (const tool of optionalTools) {
      try {
        await execAsync(`which ${tool}`);
        console.log(`  ✓ ${tool} is available (optional)`);
      } catch {
        console.log(`  - ${tool} not available (optional)`);
      }
    }

    if (!allInstalled) {
      console.log('\nInstall missing tools with:');
      console.log('  sudo apt-get install qemu-system-x86 qemu-utils');
    }

    return allInstalled;
  }
}

// Export singleton
export const simpleImageBuilder = new SimpleImageBuilder();