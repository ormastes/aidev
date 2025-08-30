/**
 * Compression Manager Implementation
 * Handles gzip compression and decompression of log files
 */

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as zlib from 'node:zlib';
import * as crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import {
  ICompressionManager,
  CompressionResult
} from '../domain/interfaces';

export class CompressionManager implements ICompressionManager {
  private readonly defaultLevel: number = 6;

  async compress(inputPath: string, outputPath: string, level?: number): Promise<CompressionResult> {
    const startTime = Date.now();
    const compressionLevel = level ?? this.defaultLevel;

    try {
      // Validate compression level
      if (compressionLevel < 1 || compressionLevel > 9) {
        throw new Error(`Invalid compression level: ${compressionLevel}. Must be between 1 and 9.`);
      }

      // Check if input file exists
      const inputStats = await fs.stat(inputPath);
      if (!inputStats.isFile()) {
        throw new Error(`Input path is not a file: ${inputPath}`);
      }

      const originalSize = inputStats.size;

      // Create compression stream
      const gzipStream = zlib.createGzip({ 
        level: compressionLevel,
        chunkSize: 64 * 1024 // 64KB chunks for better memory usage
      });

      // Create streams for reading and writing
      const readStream = fsSync.createReadStream(inputPath);
      const writeStream = fsSync.createWriteStream(outputPath);
      
      // Create checksum hash
      const hash = crypto.createHash('sha256');
      
      // Set up hash calculation during compression
      readStream.on('data', (chunk) => {
        hash.update(chunk);
      });

      // Perform compression with streaming
      await pipeline(readStream, gzipStream, writeStream);

      // Get compressed file size
      const outputStats = await fs.stat(outputPath);
      const compressedSize = outputStats.size;
      const compressionRatio = compressedSize / originalSize;
      const compressionTime = Date.now() - startTime;
      const checksum = hash.digest('hex');

      return {
        originalSize,
        compressedSize,
        compressionRatio,
        compressionTime,
        checksum
      };
    } catch (error) {
      // Clean up output file if compression failed
      try {
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async decompress(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Check if input file exists and is compressed
      const inputStats = await fs.stat(inputPath);
      if (!inputStats.isFile()) {
        throw new Error(`Input path is not a file: ${inputPath}`);
      }

      // Create decompression stream
      const gunzipStream = zlib.createGunzip();

      // Create streams for reading and writing
      const readStream = fsSync.createReadStream(inputPath);
      const writeStream = fsSync.createWriteStream(outputPath);

      // Perform decompression with streaming
      await pipeline(readStream, gunzipStream, writeStream);

    } catch (error) {
      // Clean up output file if decompression failed
      try {
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyIntegrity(compressedPath: string, originalChecksum?: string): Promise<boolean> {
    try {
      if (!originalChecksum) {
        // If no original checksum provided, just verify the gzip file is valid
        return await this.isValidGzipFile(compressedPath);
      }

      // Decompress to temporary location and verify checksum
      const tempDir = require('os').tmpdir();
      const tempPath = require('path').join(tempDir, `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

      try {
        await this.decompress(compressedPath, tempPath);
        
        // Calculate checksum of decompressed file
        const hash = crypto.createHash('sha256');
        const readStream = fsSync.createReadStream(tempPath);
        
        return new Promise((resolve, reject) => {
          readStream.on('data', (chunk) => {
            hash.update(chunk);
          });
          
          readStream.on('end', () => {
            const checksum = hash.digest('hex');
            resolve(checksum === originalChecksum);
          });
          
          readStream.on('error', reject);
        });
      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      console.warn(`Integrity verification failed: ${error}`);
      return false;
    }
  }

  getCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) {
      return 0;
    }
    return compressedSize / originalSize;
  }

  private async isValidGzipFile(filePath: string): Promise<boolean> {
    try {
      // Try to read the gzip header
      const buffer = Buffer.alloc(10);
      const fileHandle = await fs.open(filePath, 'r');
      
      try {
        await fileHandle.read(buffer, 0, 10, 0);
        
        // Check gzip magic number (0x1f 0x8b)
        return buffer[0] === 0x1f && buffer[1] === 0x8b;
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get compression statistics for a file without actually compressing it
   */
  async estimateCompressionRatio(filePath: string, level: number = 6): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      // For small files, compression ratio is usually poor
      if (fileSize < 1024) {
        return 0.9; // Assume minimal compression for small files
      }

      // Read a sample of the file to estimate compression
      const sampleSize = Math.min(fileSize, 64 * 1024); // Sample up to 64KB
      const buffer = Buffer.alloc(sampleSize);
      
      const fileHandle = await fs.open(filePath, 'r');
      try {
        await fileHandle.read(buffer, 0, sampleSize, 0);
        
        // Compress the sample
        const compressed = await new Promise<Buffer>((resolve, reject) => {
          zlib.gzip(buffer, { level }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        const sampleRatio = compressed.length / buffer.length;
        
        // Extrapolate to full file (text files often compress better with more content)
        return Math.max(0.1, Math.min(1.0, sampleRatio * 0.9)); // Assume slightly better compression
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      console.warn(`Could not estimate compression ratio: ${error}`);
      return 0.5; // Default estimate
    }
  }

  /**
   * Get optimal compression level based on file characteristics
   */
  async getOptimalCompressionLevel(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      // For very large files, use lower compression for speed
      if (fileSize > 100 * 1024 * 1024) { // > 100MB
        return 3; // Fast compression
      }
      
      // For medium files, use balanced compression
      if (fileSize > 10 * 1024 * 1024) { // > 10MB
        return 6; // Default level
      }
      
      // For small files, use maximum compression
      return 9; // Best compression
    } catch (error) {
      return this.defaultLevel;
    }
  }
}