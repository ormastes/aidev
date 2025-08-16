/**
 * QEMU Image Builder
 * Builds and manages QEMU images with Docker-like functionality
 */

import { EventEmitter } from 'node:events';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { crypto } from '../../../infra_external-log-lib/src';
import { spawn } from 'child_process';
import * as tar from 'tar';
import { v4 as uuidv4 } from 'uuid';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

export interface BuildContext {
  dockerfile?: string;
  dockerfilePath?: string;
  contextPath: string;
  buildArgs?: Record<string, string>;
  target?: string;
  platform?: string;
  labels?: Record<string, string>;
  tags?: string[];
  cache?: boolean;
  squash?: boolean;
  quiet?: boolean;
}

export interface BuildStep {
  instruction: string;
  args: string[];
  layer?: LayerInfo;
  cached?: boolean;
}

export interface LayerInfo {
  id: string;
  size: number;
  created: Date;
  command: string;
  checksum: string;
}

export interface ImageManifest {
  schemaVersion: number;
  architecture: string;
  os: string;
  config: ImageConfig;
  rootfs: {
    type: string;
    diff_ids: string[];
  };
  history: LayerHistory[];
}

export interface ImageConfig {
  hostname?: string;
  domainname?: string;
  user?: string;
  attachStdin?: boolean;
  attachStdout?: boolean;
  attachStderr?: boolean;
  tty?: boolean;
  openStdin?: boolean;
  stdinOnce?: boolean;
  env?: string[];
  cmd?: string[];
  entrypoint?: string[];
  image?: string;
  volumes?: Record<string, {}>;
  workingDir?: string;
  networkDisabled?: boolean;
  exposedPorts?: Record<string, {}>;
  labels?: Record<string, string>;
}

export interface LayerHistory {
  created: string;
  created_by: string;
  empty_layer?: boolean;
  comment?: string;
}

export interface BuildProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  status: 'pending' | "building" | 'caching' | 'pushing' | "complete" | 'error';
  message?: string;
  error?: string;
}

export class ImageBuilder extends EventEmitter {
  private dataDir: string;
  private cacheDir: string;
  private tempDir: string;
  private layerCache: Map<string, LayerInfo> = new Map();
  private imageRegistry: Map<string, ImageManifest> = new Map();

  constructor(options?: {
    dataDir?: string;
    cacheDir?: string;
    tempDir?: string;
  }) {
    super();
    this.dataDir = options?.dataDir || '/var/lib/qemu-containers';
    this.cacheDir = options?.cacheDir || path.join(this.dataDir, 'cache');
    this.tempDir = options?.tempDir || '/tmp/qemu-builder';
  }

  /**
   * Initialize image builder
   */
  async initialize(): Promise<void> {
    await fileAPI.createDirectory(this.cacheDir);
    await fileAPI.createDirectory(this.tempDir);
    await fileAPI.createDirectory(path.join(this.dataDir, 'images'));
    await this.loadLayerCache();
    await this.loadImageRegistry();
  }

  /**
   * Build image from Dockerfile
   */
  async build(context: BuildContext): Promise<string> {
    const buildId = uuidv4();
    const buildDir = path.join(this.tempDir, buildId);
    await fileAPI.createDirectory(buildDir);

    try {
      // Parse Dockerfile
      const dockerfile = await this.readDockerfile(context);
      const steps = this.parseDockerfile(dockerfile, context.buildArgs);
      
      // Initialize build progress
      this.emitProgress({
        step: 0,
        totalSteps: steps.length,
        currentStep: 'Preparing build',
        status: 'pending'
      });

      // Create base image
      let imageId = await this.createBaseImage(steps[0], buildDir);
      
      // Process each build step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        this.emitProgress({
          step: i + 1,
          totalSteps: steps.length,
          currentStep: `${step.instruction} ${step.args.join(' ')}`,
          status: "building"
        });

        // Check cache
        if (context.cache !== false) {
          const cachedLayer = await this.checkCache(step, imageId);
          if (cachedLayer) {
            step.layer = cachedLayer;
            step.cached = true;
            imageId = cachedLayer.id;
            
            this.emitProgress({
              step: i + 1,
              totalSteps: steps.length,
              currentStep: `Using cached layer for: ${step.instruction}`,
              status: 'caching'
            });
            continue;
          }
        }

        // Execute build step
        imageId = await this.executeStep(step, imageId, buildDir, context);
      }

      // Finalize image
      const manifest = await this.finalizeImage(imageId, steps, context);
      
      // Tag image
      if (context.tags) {
        for (const tag of context.tags) {
          await this.tagImage(imageId, tag);
        }
      }

      this.emitProgress({
        step: steps.length,
        totalSteps: steps.length,
        currentStep: 'Build complete',
        status: "complete",
        message: `Image ID: ${imageId}`
      });

      return imageId;
    } finally {
      // Cleanup
      await fs.rm(buildDir, { recursive: true, force: true });
    }
  }

  /**
   * Parse Dockerfile
   */
  private parseDockerfile(dockerfile: string, buildArgs?: Record<string, string>): BuildStep[] {
    const steps: BuildStep[] = [];
    const lines = dockerfile.split('\n');
    let currentInstruction = '';
    let currentArgs: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Handle line continuation
      if (trimmed.endsWith('\\')) {
        currentInstruction += trimmed.slice(0, -1) + ' ';
        continue;
      }
      
      const fullLine = currentInstruction + trimmed;
      currentInstruction = '';
      
      // Parse instruction
      const match = fullLine.match(/^(\w+)\s+(.*)$/);
      if (!match) continue;
      
      const [, instruction, args] = match;
      
      // Replace build args
      let processedArgs = args;
      if (buildArgs) {
        Object.entries(buildArgs).forEach(([key, value]) => {
          processedArgs = processedArgs.replace(new RegExp(`\\$${key}|\\$\\{${key}\\}`, 'g'), value);
        });
      }
      
      steps.push({
        instruction: instruction.toUpperCase(),
        args: this.parseArgs(processedArgs)
      });
    }

    return steps;
  }

  /**
   * Parse instruction arguments
   */
  private parseArgs(args: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    
    for (let i = 0; i < args.length; i++) {
      const char = args[i];
      
      if (inQuote) {
        if (char === quoteChar && args[i - 1] !== '\\') {
          inQuote = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuote = true;
          quoteChar = char;
        } else if (char === ' ' || char === '\t') {
          if (current) {
            result.push(current);
            current = '';
          }
        } else {
          current += char;
        }
      }
    }
    
    if (current) {
      result.push(current);
    }
    
    return result;
  }

  /**
   * Execute build step
   */
  private async executeStep(
    step: BuildStep,
    parentImageId: string,
    buildDir: string,
    context: BuildContext
  ): Promise<string> {
    const layerId = this.generateLayerId(step, parentImageId);
    const layerDir = path.join(buildDir, layerId);
    await fileAPI.createDirectory(layerDir);

    // Mount parent image
    await this.mountImage(parentImageId, layerDir);

    try {
      switch (step.instruction) {
        case 'FROM':
          return await this.executeFrom(step.args, layerDir);
          
        case 'RUN':
          return await this.executeRun(step.args, layerDir, parentImageId);
          
        case 'COPY':
        case 'ADD':
          return await this.executeCopy(step.args, layerDir, context.contextPath);
          
        case 'ENV':
          return await this.executeEnv(step.args, layerDir, parentImageId);
          
        case 'WORKDIR':
          return await this.executeWorkdir(step.args, layerDir, parentImageId);
          
        case 'USER':
          return await this.executeUser(step.args, layerDir, parentImageId);
          
        case 'EXPOSE':
          return await this.executeExpose(step.args, layerDir, parentImageId);
          
        case 'VOLUME':
          return await this.executeVolume(step.args, layerDir, parentImageId);
          
        case 'CMD':
          return await this.executeCmd(step.args, layerDir, parentImageId);
          
        case "ENTRYPOINT":
          return await this.executeEntrypoint(step.args, layerDir, parentImageId);
          
        case 'LABEL':
          return await this.executeLabel(step.args, layerDir, parentImageId);
          
        default:
          throw new Error(`Unknown instruction: ${step.instruction}`);
      }
    } finally {
      // Create layer
      const layer = await this.createLayer(layerDir, step);
      step.layer = layer;
      
      // Cache layer
      if (context.cache !== false) {
        await this.cacheLayer(layer);
      }
      
      // Unmount
      await this.unmountImage(layerDir);
    }

    return layerId;
  }

  /**
   * Execute FROM instruction
   */
  private async executeFrom(args: string[], layerDir: string): Promise<string> {
    const baseImage = args[0];
    const platform = args.find(arg => arg.startsWith('--platform='))?.split('=')[1];
    
    // Pull or use local base image
    const imageId = await this.pullImage(baseImage, platform);
    
    // Extract base image to layer directory
    await this.extractImage(imageId, layerDir);
    
    return imageId;
  }

  /**
   * Execute RUN instruction
   */
  private async executeRun(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const command = args.join(' ');
    
    // Create QEMU VM for execution
    const vmConfig = {
      image: parentImageId,
      command: ['/bin/sh', '-c', command],
      volumes: [{
        source: layerDir,
        target: '/build',
        type: 'bind' as const
      }]
    };
    
    // Run command in VM
    await this.runInVM(vmConfig);
    
    // Capture filesystem changes
    const layerId = await this.captureChanges(layerDir, parentImageId);
    
    return layerId;
  }

  /**
   * Execute COPY/ADD instruction
   */
  private async executeCopy(args: string[], layerDir: string, contextPath: string): Promise<string> {
    const [source, dest] = args;
    const sourcePath = path.join(contextPath, source);
    const destPath = path.join(layerDir, dest);
    
    // Create destination directory
    await fileAPI.createDirectory(path.dirname(destPath));
    
    // Copy files
    const stats = await /* FRAUD_FIX: fs.stat(sourcePath) */;
    if (stats.isDirectory()) {
      await this.copyDirectory(sourcePath, destPath);
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
    
    // Set permissions
    await fs.chmod(destPath, 0o755);
    
    return this.generateLayerId({ instruction: 'COPY', args }, '');
  }

  /**
   * Execute ENV instruction
   */
  private async executeEnv(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const envFile = path.join(layerDir, '.env');
    const envVars = args.join(' ').split(/\s+(?=[A-Z_]+[A-Z0-9_]*=)/);
    
    await fileAPI.createFile(envFile, envVars.join('\n'), { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: 'ENV', args }, parentImageId);
  }

  /**
   * Execute WORKDIR instruction
   */
  private async executeWorkdir(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const workdir = args[0];
    const workdirPath = path.join(layerDir, workdir);
    
    await fileAPI.createDirectory(workdirPath);
    
    return this.generateLayerId({ instruction: 'WORKDIR', args }, parentImageId);
  }

  /**
   * Execute USER instruction
   */
  private async executeUser(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const user = args[0];
    const configFile = path.join(layerDir, '.config', 'user');
    
    await fileAPI.createDirectory(path.dirname(configFile));
    await fileAPI.createFile(configFile, user, { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: 'USER', args }, parentImageId);
  }

  /**
   * Execute EXPOSE instruction
   */
  private async executeExpose(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const portsFile = path.join(layerDir, '.config', 'exposed_ports');
    
    await fileAPI.createDirectory(path.dirname(portsFile));
    await fileAPI.createFile(portsFile, args.join('\n'), { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: 'EXPOSE', args }, parentImageId);
  }

  /**
   * Execute VOLUME instruction
   */
  private async executeVolume(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const volumesFile = path.join(layerDir, '.config', 'volumes');
    
    await fileAPI.createDirectory(path.dirname(volumesFile));
    await fileAPI.createFile(volumesFile, args.join('\n'), { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: 'VOLUME', args }, parentImageId);
  }

  /**
   * Execute CMD instruction
   */
  private async executeCmd(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const cmdFile = path.join(layerDir, '.config', 'cmd');
    
    await fileAPI.createDirectory(path.dirname(cmdFile));
    await fileAPI.createFile(cmdFile, JSON.stringify(args), { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: 'CMD', args }, parentImageId);
  }

  /**
   * Execute ENTRYPOINT instruction
   */
  private async executeEntrypoint(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const entrypointFile = path.join(layerDir, '.config', "entrypoint");
    
    await fileAPI.createDirectory(path.dirname(entrypointFile));
    await fileAPI.createFile(entrypointFile, JSON.stringify(args), { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: "ENTRYPOINT", args }, parentImageId);
  }

  /**
   * Execute LABEL instruction
   */
  private async executeLabel(args: string[], layerDir: string, parentImageId: string): Promise<string> {
    const labelsFile = path.join(layerDir, '.config', 'labels');
    const labels: Record<string, string> = {};
    
    for (const arg of args) {
      const [key, value] = arg.split('=');
      labels[key] = value;
    }
    
    await fileAPI.createDirectory(path.dirname(labelsFile));
    await fileAPI.createFile(labelsFile, JSON.stringify(labels), { type: FileType.TEMPORARY });
    
    return this.generateLayerId({ instruction: 'LABEL', args }, parentImageId);
  }

  /**
   * Create base image
   */
  private async createBaseImage(fromStep: BuildStep, buildDir: string): Promise<string> {
    if (fromStep.instruction !== 'FROM') {
      throw new Error('First instruction must be FROM');
    }
    
    const baseImage = fromStep.args[0];
    
    // Check if it's a scratch image
    if (baseImage === 'scratch') {
      return await this.createScratchImage(buildDir);
    }
    
    // Pull or use existing image
    return await this.pullImage(baseImage);
  }

  /**
   * Create scratch image
   */
  private async createScratchImage(buildDir: string): Promise<string> {
    const imageId = uuidv4();
    const imagePath = path.join(buildDir, imageId);
    
    await fileAPI.createDirectory(imagePath);
    
    // Create minimal filesystem structure
    const dirs = ['bin', 'dev', 'etc', 'home', 'lib', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'sys', 'tmp', 'usr', 'var'];
    for (const dir of dirs) {
      await fileAPI.createDirectory(path.join(imagePath, dir));
    }
    
    return imageId;
  }

  /**
   * Pull image from registry
   */
  private async pullImage(imageName: string, platform?: string): Promise<string> {
    // Check local registry first
    const localImage = Array.from(this.imageRegistry.entries())
      .find(([id, manifest]) => manifest.config.image === imageName);
    
    if (localImage) {
      return localImage[0];
    }
    
    // Pull from remote registry (simplified)
    const imageId = uuidv4();
    const imagePath = path.join(this.dataDir, 'images', imageId);
    
    await fileAPI.createDirectory(imagePath);
    
    // Download and extract image layers
    // This would involve actual registry API calls
    
    return imageId;
  }

  /**
   * Mount image
   */
  private async mountImage(imageId: string, mountPoint: string): Promise<void> {
    const imagePath = path.join(this.dataDir, 'images', imageId);
    
    // Copy image contents to mount point (simplified)
    await this.copyDirectory(imagePath, mountPoint);
  }

  /**
   * Unmount image
   */
  private async unmountImage(mountPoint: string): Promise<void> {
    // Clean up temporary mounts
  }

  /**
   * Extract image
   */
  private async extractImage(imageId: string, destPath: string): Promise<void> {
    const imagePath = path.join(this.dataDir, 'images', imageId);
    await this.copyDirectory(imagePath, destPath);
  }

  /**
   * Run command in VM
   */
  private async runInVM(config: any): Promise<void> {
    // Execute command in QEMU VM
    // This would use QEMUManager to run the command
  }

  /**
   * Capture filesystem changes
   */
  private async captureChanges(layerDir: string, parentImageId: string): Promise<string> {
    const layerId = uuidv4();
    const changesPath = path.join(this.cacheDir, layerId);
    
    // Compare with parent and capture changes
    await fileAPI.createDirectory(changesPath);
    
    // Simplified: copy entire layer
    await this.copyDirectory(layerDir, changesPath);
    
    return layerId;
  }

  /**
   * Create layer
   */
  private async createLayer(layerDir: string, step: BuildStep): Promise<LayerInfo> {
    const layerId = uuidv4();
    const layerPath = path.join(this.cacheDir, layerId);
    
    // Create tar archive of layer
    await tar.create({
      file: `${layerPath}.tar`,
      cwd: layerDir,
      gzip: true
    }, ['.']);
    
    // Calculate checksum
    const checksum = await this.calculateChecksum(`${layerPath}.tar`);
    
    // Get layer size
    const stats = await /* FRAUD_FIX: fs.stat(`${layerPath}.tar`) */;
    
    return {
      id: layerId,
      size: stats.size,
      created: new Date(),
      command: `${step.instruction} ${step.args.join(' ')}`,
      checksum
    };
  }

  /**
   * Cache layer
   */
  private async cacheLayer(layer: LayerInfo): Promise<void> {
    this.layerCache.set(layer.checksum, layer);
    await this.saveLayerCache();
  }

  /**
   * Check cache for layer
   */
  private async checkCache(step: BuildStep, parentImageId: string): Promise<LayerInfo | null> {
    const cacheKey = this.generateCacheKey(step, parentImageId);
    return this.layerCache.get(cacheKey) || null;
  }

  /**
   * Generate layer ID
   */
  private generateLayerId(step: BuildStep, parentImageId: string): string {
    const content = `${parentImageId}:${step.instruction}:${step.args.join(':')}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(step: BuildStep, parentImageId: string): string {
    return this.generateLayerId(step, parentImageId);
  }

  /**
   * Calculate checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = require('../../layer/themes/infra_external-log-lib/src').createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data: Buffer) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Finalize image
   */
  private async finalizeImage(
    imageId: string,
    steps: BuildStep[],
    context: BuildContext
  ): Promise<ImageManifest> {
    const manifest: ImageManifest = {
      schemaVersion: 2,
      architecture: context.platform || 'amd64',
      os: 'linux',
      config: {
        labels: context.labels
      },
      rootfs: {
        type: 'layers',
        diff_ids: steps.map(s => s.layer?.id || '').filter(id => id)
      },
      history: steps.map(step => ({
        created: new Date().toISOString(),
        created_by: `${step.instruction} ${step.args.join(' ')}`,
        empty_layer: !step.layer
      }))
    };
    
    // Save manifest
    const manifestPath = path.join(this.dataDir, 'images', imageId, 'manifest.json');
    await fileAPI.createDirectory(path.dirname(manifestPath));
    await fileAPI.createFile(manifestPath, JSON.stringify(manifest, null, 2), { type: FileType.TEMPORARY });
    
    this.imageRegistry.set(imageId, manifest);
    await this.saveImageRegistry();
    
    return manifest;
  }

  /**
   * Tag image
   */
  async tagImage(imageId: string, tag: string): Promise<void> {
    const [name, version = 'latest'] = tag.split(':');
    const tagPath = path.join(this.dataDir, 'tags', name, version);
    
    await fileAPI.createDirectory(path.dirname(tagPath));
    await fileAPI.createFile(tagPath, imageId, { type: FileType.TEMPORARY });
    
    this.emit('tagged', imageId, tag);
  }

  /**
   * Read Dockerfile
   */
  private async readDockerfile(context: BuildContext): Promise<string> {
    if (context.dockerfile) {
      return context.dockerfile;
    }
    
    const dockerfilePath = context.dockerfilePath || path.join(context.contextPath, "Dockerfile");
    return await fileAPI.readFile(dockerfilePath, 'utf-8');
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(source: string, dest: string): Promise<void> {
    await fileAPI.createDirectory(dest);
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Load layer cache
   */
  private async loadLayerCache(): Promise<void> {
    const cachePath = path.join(this.cacheDir, 'layer-cache.json');
    
    try {
      const data = await fileAPI.readFile(cachePath, 'utf-8');
      const cache = JSON.parse(data);
      this.layerCache = new Map(Object.entries(cache));
    } catch {
      // No cache yet
    }
  }

  /**
   * Save layer cache
   */
  private async saveLayerCache(): Promise<void> {
    const cachePath = path.join(this.cacheDir, 'layer-cache.json');
    const cache = Object.fromEntries(this.layerCache);
    await fileAPI.createFile(cachePath, JSON.stringify(cache, null, 2), { type: FileType.TEMPORARY });
  }

  /**
   * Load image registry
   */
  private async loadImageRegistry(): Promise<void> {
    const registryPath = path.join(this.dataDir, 'registry.json');
    
    try {
      const data = await fileAPI.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(data);
      this.imageRegistry = new Map(Object.entries(registry));
    } catch {
      // No registry yet
    }
  }

  /**
   * Save image registry
   */
  private async saveImageRegistry(): Promise<void> {
    const registryPath = path.join(this.dataDir, 'registry.json');
    const registry = Object.fromEntries(this.imageRegistry);
    await fileAPI.createFile(registryPath, JSON.stringify(registry, null, 2), { type: FileType.TEMPORARY });
  }

  /**
   * Emit build progress
   */
  private emitProgress(progress: BuildProgress): void {
    this.emit("progress", progress);
  }

  /**
   * List images
   */
  async listImages(): Promise<ImageManifest[]> {
    return Array.from(this.imageRegistry.values());
  }

  /**
   * Remove image
   */
  async removeImage(imageId: string): Promise<void> {
    const imagePath = path.join(this.dataDir, 'images', imageId);
    await fs.rm(imagePath, { recursive: true, force: true });
    
    this.imageRegistry.delete(imageId);
    await this.saveImageRegistry();
    
    this.emit('removed', imageId);
  }

  /**
   * Prune unused images
   */
  async prune(): Promise<string[]> {
    const removed: string[] = [];
    
    // Find unused images (simplified)
    for (const [imageId, manifest] of this.imageRegistry) {
      // Check if image is used by any container
      const isUsed = false; // Would check with QEMUManager
      
      if (!isUsed) {
        await this.removeImage(imageId);
        removed.push(imageId);
      }
    }
    
    return removed;
  }
}

// Export singleton instance
export const imageBuilder = new ImageBuilder();