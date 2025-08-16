/**
 * Exporter Module
 * Export scraped data to multiple formats and destinations including
 * JSON, CSV, XML, databases, and cloud storage
 */

import { fs, path } from '../../../infra_external-log-lib/src';
const { createWriteStream } = fs;
type WriteStream = ReturnType<typeof createWriteStream>;
import csvWriter from 'csv-writer';
import csvParser from 'csv-parser';
import { Builder as XmlBuilder, Parser as XmlParser } from 'xml2js';
import { MongoClient, Db, Collection } from 'mongodb';
import { Client as PgClient } from 'pg';
import { Database } from 'sqlite3';
import { S3 } from 'aws-sdk';

export interface ExportConfig {
  format: 'json' | 'csv' | 'xml' | 'mongodb' | "postgresql" | 'sqlite' | 's3' | 'webhook';
  destination: string; // file path, connection string, or webhook URL
  options?: Record<string, any>;
}

export interface ExportOptions {
  compression?: boolean;
  encryption?: {
    algorithm: 'aes-256-gcm';
    key: string;
  };
  chunking?: {
    enabled: boolean;
    chunkSize: number; // number of records per chunk
    maxFileSize?: number; // max file size in bytes
  };
  metadata?: Record<string, any>;
  overwrite?: boolean;
  append?: boolean;
  timestamp?: boolean; // add timestamp to filename
  validation?: boolean; // validate data before export
}

export interface ExportResult {
  success: boolean;
  destination: string;
  recordCount: number;
  fileSize?: number;
  duration: number;
  chunks?: string[]; // list of chunk files/locations
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  table: string;
  ssl?: boolean;
  connectionPoolSize?: number;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  keyPrefix?: string;
  storageClass?: "STANDARD" | 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  serverSideEncryption?: boolean;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  batchSize?: number; // send data in batches
}

export class FileExporter {
  private compressionEnabled: boolean = false;
  private encryptionConfig?: ExportOptions["encryption"];

  constructor(options: ExportOptions = {}) {
    this.compressionEnabled = options.compression || false;
    this.encryptionConfig = options.encryption;
  }

  async exportJSON(data: any[], filePath: string, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();
    let recordCount = 0;
    const chunks: string[] = [];
    let finalPath = filePath;

    try {
      // Add timestamp if requested
      if(options.timestamp) {
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        finalPath = path.join(dir, `${base}_${timestamp}${ext}`);
      }

      // Handle chunking
      if(options.chunking?.enabled) {
        const chunkSize = options.chunking.chunkSize;
        const totalChunks = Math.ceil(data.length / chunkSize);

        for(let i = 0; i < totalChunks; i++) {
          const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
          const chunkPath = this.getChunkPath(finalPath, i + 1, totalChunks);
          
          await this.writeJSONFile(chunkPath, chunk, options);
          chunks.push(chunkPath);
          recordCount += chunk.length;
        }
      } else {
        await this.writeJSONFile(finalPath, data, options);
        recordCount = data.length;
        chunks.push(finalPath);
      }

      // Get file size
      const stats = await /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(chunks[0]) */ */;
      const fileSize = chunks.length === 1 ? stats.size : 
        (await Promise.all(chunks.map(c => /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(c) */ */))).reduce((sum, s) => sum + s.size, 0);

      return {
        success: true,
        destination: finalPath,
        recordCount,
        fileSize,
        duration: Date.now() - startTime,
        chunks: chunks.length > 1 ? chunks : undefined
      };

    } catch (error) {
      return {
        success: false,
        destination: finalPath,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    }
  }

  async exportCSV(data: any[], filePath: string, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();
    let recordCount = 0;
    const chunks: string[] = [];
    let finalPath = filePath;

    try {
      if(data.length === 0) {
        throw new Error('No data to export');
      }

      // Add timestamp if requested
      if(options.timestamp) {
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        finalPath = path.join(dir, `${base}_${timestamp}${ext}`);
      }

      // Get headers from first record
      const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));

      // Handle chunking
      if(options.chunking?.enabled) {
        const chunkSize = options.chunking.chunkSize;
        const totalChunks = Math.ceil(data.length / chunkSize);

        for(let i = 0; i < totalChunks; i++) {
          const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
          const chunkPath = this.getChunkPath(finalPath, i + 1, totalChunks);
          
          const writer = csvWriter.createObjectCsvWriter({
            path: chunkPath,
            header: headers
          });

          await writer.writeRecords(chunk);
          await this.processFile(chunkPath, options);
          
          chunks.push(chunkPath);
          recordCount += chunk.length;
        }
      } else {
        const writer = csvWriter.createObjectCsvWriter({
          path: finalPath,
          header: headers,
          append: options.append || false
        });

        await writer.writeRecords(data);
        await this.processFile(finalPath, options);
        recordCount = data.length;
        chunks.push(finalPath);
      }

      // Get file size
      const fileSize = chunks.length === 1 ? 
        (await /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(chunks[0]) */ */).size :
        (await Promise.all(chunks.map(c => /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(c) */ */))).reduce((sum, s) => sum + s.size, 0);

      return {
        success: true,
        destination: finalPath,
        recordCount,
        fileSize,
        duration: Date.now() - startTime,
        chunks: chunks.length > 1 ? chunks : undefined
      };

    } catch (error) {
      return {
        success: false,
        destination: finalPath,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    }
  }

  async exportXML(data: any[], filePath: string, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();
    let finalPath = filePath;

    try {
      // Add timestamp if requested
      if(options.timestamp) {
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        finalPath = path.join(dir, `${base}_${timestamp}${ext}`);
      }

      const builder = new XmlBuilder({
        rootName: 'data',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ' }
      });

      const xmlData = {
        record: data
      };

      const xml = builder.buildObject(xmlData);
      await this.writeTextFile(finalPath, xml, options);

      const stats = await /* FRAUD_FIX: fs.stat(finalPath) */;

      return {
        success: true,
        destination: finalPath,
        recordCount: data.length,
        fileSize: stats.size,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        destination: finalPath,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    }
  }

  private async writeJSONFile(filePath: string, data: any, options: ExportOptions): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    await this.writeTextFile(filePath, jsonString, options);
  }

  private async writeTextFile(filePath: string, content: string, options: ExportOptions): Promise<void> {
    // Ensure directory exists
    await await fileAPI.createDirectory(path.dirname(filePath));

    let finalContent = content;

    // Apply encryption if configured
    if(this.encryptionConfig) {
      finalContent = await this.encrypt(content, this.encryptionConfig);
    }

    // Apply compression if enabled
    if(this.compressionEnabled) {
      const zlib = require('zlib');
      const compressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(finalContent, (err: any, result: Buffer) => {
          if(err) reject(err);
          else resolve(result);
        });
      });
      await fileAPI.writeFile(filePath + '.gz', compressed);
    } else {
      await await fileAPI.createFile(filePath, finalContent, { type: FileType.TEMPORARY });
    }
  }

  private async processFile(filePath: string, options: ExportOptions): Promise<void> {
    if(this.compressionEnabled || this.encryptionConfig) {
      const content = await fileAPI.readFile(filePath, 'utf8');
      await this.writeTextFile(filePath, content, options);
      // Remove original if compressed/encrypted
      if(this.compressionEnabled) {
        await fileAPI.unlink(filePath);
      }
    }
  }

  private getChunkPath(originalPath: string, chunkIndex: number, totalChunks: number): string {
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    const dir = path.dirname(originalPath);
    const padding = totalChunks.toString().length;
    const paddedIndex = chunkIndex.toString().padStart(padding, '0');
    return path.join(dir, `${base}_chunk_${paddedIndex}${ext}`);
  }

  private async encrypt(data: string, config: NonNullable<ExportOptions["encryption"]>): Promise<string> {
    const crypto = require('node:crypto');
    const cipher = crypto.createCipher(config.algorithm, config.key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
}

export class DatabaseExporter {
  async exportToMongoDB(data: any[], config: DatabaseConfig, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();
    const connectionString = `mongodb://${config.username ? `${config.username}:${config.password}@` : ''}${config.host}:${config.port}/${config.database}`;
    
    let client: MongoClient | null = null;

    try {
      client = new MongoClient(connectionString);
      await client.connect();

      const db = client.db(config.database);
      const collection = db.collection(config.table);

      // Add metadata if provided
      const documentsToInsert = data.map(record => ({
        ...record,
        _scraped_at: new Date(),
        ...(options.metadata || {})
      }));

      let result;
      if(options.chunking?.enabled) {
        const chunkSize = options.chunking.chunkSize;
        let inserted = 0;
        
        for (let i = 0; i < documentsToInsert.length; i += chunkSize) {
          const chunk = documentsToInsert.slice(i, i + chunkSize);
          await collection.insertMany(chunk);
          inserted += chunk.length;
        }
        
        result = { insertedCount: inserted };
      } else {
        result = await collection.insertMany(documentsToInsert);
      }

      return {
        success: true,
        destination: connectionString,
        recordCount: result.insertedCount,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        destination: connectionString,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    } finally {
      if(client) {
        await client.close();
      }
    }
  }

  async exportToPostgreSQL(data: any[], config: DatabaseConfig, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();
    let client: PgClient | null = null;

    try {
      client = new PgClient({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl
      });

      await client.connect();

      if(data.length === 0) {
        return {
          success: true,
          destination: `postgresql://${config.host}:${config.port}/${config.database}`,
          recordCount: 0,
          duration: Date.now() - startTime
        };
      }

      // Create table if it doesn't exist
      const sampleRecord = data[0];
      const columns = Object.keys(sampleRecord).map(key => {
        const value = sampleRecord[key];
        let type = 'TEXT';
        
        if (typeof value === 'number') {
          type = Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
        } else if (typeof value === 'boolean') {
          type = 'BOOLEAN';
        } else if (value instanceof Date) {
          type = "TIMESTAMP";
        }
        
        return `"${key}" ${type}`;
      }).join(', ');

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${config.table}" (
          id SERIAL PRIMARY KEY,
          ${columns},
          scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await client.query(createTableQuery);

      // Insert data
      let insertedCount = 0;
      const columnNames = Object.keys(sampleRecord).map(k => `"${k}"`).join(', ');
      const placeholderBase = Object.keys(sampleRecord).map((_, i) => `$${i + 1}`).join(', ');

      if(options.chunking?.enabled) {
        const chunkSize = options.chunking.chunkSize;
        
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          
          for (const record of chunk) {
            const values = Object.values(record);
            const insertQuery = `INSERT INTO "${config.table}" (${columnNames}) VALUES (${placeholderBase})`;
            await client.query(insertQuery, values);
            insertedCount++;
          }
        }
      } else {
        for(const record of data) {
          const values = Object.values(record);
          const insertQuery = `INSERT INTO "${config.table}" (${columnNames}) VALUES (${placeholderBase})`;
          await client.query(insertQuery, values);
          insertedCount++;
        }
      }

      return {
        success: true,
        destination: `postgresql://${config.host}:${config.port}/${config.database}`,
        recordCount: insertedCount,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        destination: `postgresql://${config.host}:${config.port}/${config.database}`,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    } finally {
      if(client) {
        await client.end();
      }
    }
  }

  async exportToSQLite(data: any[], filePath: string, tableName: string, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const db = new Database(filePath, (err) => {
        if(err) {
          resolve({
            success: false,
            destination: filePath,
            recordCount: 0,
            duration: Date.now() - startTime,
            errors: [err.message]
          });
          return;
        }

        if (data.length === 0) {
          db.close();
          resolve({
            success: true,
            destination: filePath,
            recordCount: 0,
            duration: Date.now() - startTime
          });
          return;
        }

        // Create table
        const sampleRecord = data[0];
        const columns = Object.keys(sampleRecord).map(key => {
          const value = sampleRecord[key];
          let type = 'TEXT';
          
          if (typeof value === 'number') {
            type = Number.isInteger(value) ? 'INTEGER' : 'REAL';
          } else if (typeof value === 'boolean') {
            type = 'INTEGER'; // SQLite doesn't have boolean
          }
          
          return `"${key}" ${type}`;
        }).join(', ');

        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "${tableName}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ${columns},
            scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `;

        db.run(createTableQuery, (err) => {
          if(err) {
            db.close();
            resolve({
              success: false,
              destination: filePath,
              recordCount: 0,
              duration: Date.now() - startTime,
              errors: [err.message]
            });
            return;
          }

          // Insert data
          const columnNames = Object.keys(sampleRecord).map(k => `"${k}"`).join(', ');
          const placeholders = Object.keys(sampleRecord).map(() => '?').join(', ');
          const insertQuery = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`;

          const stmt = db.prepare(insertQuery);
          let insertedCount = 0;

          const insertRecord = async (record: any) => {
            const values = Object.values(record);
            stmt.run(values, (err) => {
              if (err) {
                stmt.finalize();
                db.close();
                resolve({
                  success: false,
                  destination: filePath,
                  recordCount: insertedCount,
                  duration: Date.now() - startTime,
                  errors: [err.message]
                });
                return;
              }

              insertedCount++;
              
              if (insertedCount === data.length) {
                stmt.finalize();
                db.close();
                resolve({
                  success: true,
                  destination: filePath,
                  recordCount: insertedCount,
                  duration: Date.now() - startTime
                });
              }
            });
          };

          // Insert records
          for (const record of data) {
            insertRecord(record);
          }
        });
      });
    });
  }
}

export class CloudExporter {
  private s3Client?: S3;

  constructor() {
    // S3 client will be initialized when needed
  }

  async exportToS3(data: any[], config: S3Config, keyName: string, format: 'json' | 'csv' | 'xml', options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Initialize S3 client
      this.s3Client = new S3({
        region: config.region,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      });

      // Convert data to specified format
      let content: string;
      let contentType: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          content = this.convertToCSV(data);
          contentType = 'text/csv';
          break;
        case 'xml':
          const builder = new XmlBuilder({ rootName: 'data' });
          content = builder.buildObject({ record: data });
          contentType = 'application/xml';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Add timestamp if requested
      let finalKeyName = keyName;
      if(options.timestamp) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const parts = keyName.split('.');
        if(parts.length > 1) {
          const ext = parts.pop();
          finalKeyName = `${parts.join('.')}_${timestamp}.${ext}`;
        } else {
          finalKeyName = `${keyName}_${timestamp}`;
        }
      }

      // Add prefix if configured
      if(config.keyPrefix) {
        finalKeyName = `${config.keyPrefix}/${finalKeyName}`;
      }

      // Apply compression if enabled
      let finalContent: string | Buffer = content;
      if(options.compression) {
        const zlib = require('zlib');
        finalContent = await new Promise<Buffer>((resolve, reject) => {
          zlib.gzip(content, (err: any, result: Buffer) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        contentType = 'application/gzip';
      }

      // Upload to S3
      const uploadParams: S3.PutObjectRequest = {
        Bucket: config.bucket,
        Key: finalKeyName,
        Body: finalContent,
        ContentType: contentType,
        StorageClass: config.storageClass || "STANDARD"
      };

      if(config.serverSideEncryption) {
        uploadParams.ServerSideEncryption = 'AES256';
      }

      const result = await this.s3Client.upload(uploadParams).promise();

      return {
        success: true,
        destination: result.Location!,
        recordCount: data.length,
        fileSize: Buffer.isBuffer(finalContent) ? finalContent.length : finalContent.length,
        duration: Date.now() - startTime,
        metadata: {
          bucket: config.bucket,
          key: finalKeyName,
          etag: result.ETag
        }
      };

    } catch (error) {
      return {
        success: false,
        destination: `s3://${config.bucket}/${keyName}`,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    }
  }

  private convertToCSV(data: any[]): string {
    if(data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const record of data) {
      const values = headers.map(header => {
        const value = record[header];
        // Escape commas and quotes
        if(typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value || '');
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

export class WebhookExporter {
  async exportToWebhook(data: any[], config: WebhookConfig, options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = Date.now();
    const axios = require('axios');

    try {
      const batchSize = config.batchSize || data.length;
      let sentCount = 0;
      const errors: string[] = [];

      // Send data in batches
      for(let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        try {
          const response = await axios({
            method: config.method,
            url: config.url,
            data: {
              records: batch,
              metadata: {
                batch: Math.floor(i / batchSize) + 1,
                totalBatches: Math.ceil(data.length / batchSize),
                timestamp: new Date().toISOString(),
                ...options.metadata
              }
            },
            headers: {
              'Content-Type': 'application/json',
              ...config.headers
            },
            timeout: config.timeout || 30000
          });

          if(response.status >= 200 && response.status < 300) {
            sentCount += batch.length;
          } else {
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: HTTP ${response.status}`);
          }

        } catch (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error}`);
          
          // Retry logic
          if(config.retries && config.retries > 0) {
            // Implementation of retry logic would go here
          }
        }
      }

      return {
        success: errors.length === 0,
        destination: config.url,
        recordCount: sentCount,
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        success: false,
        destination: config.url,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [String(error)]
      };
    }
  }
}

export class DataExporter {
  private fileExporter: FileExporter;
  private databaseExporter: DatabaseExporter;
  private cloudExporter: CloudExporter;
  private webhookExporter: WebhookExporter;

  constructor(options: ExportOptions = {}) {
    this.fileExporter = new FileExporter(options);
    this.databaseExporter = new DatabaseExporter();
    this.cloudExporter = new CloudExporter();
    this.webhookExporter = new WebhookExporter();
  }

  async export(data: any[], config: ExportConfig, options: ExportOptions = {}): Promise<ExportResult> {
    switch (config.format) {
      case 'json':
        return this.fileExporter.exportJSON(data, config.destination, options);
        
      case 'csv':
        return this.fileExporter.exportCSV(data, config.destination, options);
        
      case 'xml':
        return this.fileExporter.exportXML(data, config.destination, options);
        
      case 'mongodb':
        const mongoConfig = config.options as DatabaseConfig;
        return this.databaseExporter.exportToMongoDB(data, mongoConfig, options);
        
      case "postgresql":
        const pgConfig = config.options as DatabaseConfig;
        return this.databaseExporter.exportToPostgreSQL(data, pgConfig, options);
        
      case 'sqlite':
        const { tableName, ...sqliteOptions } = config.options || {};
        return this.databaseExporter.exportToSQLite(data, config.destination, tableName || 'scraped_data', options);
        
      case 's3':
        const { s3Config, keyName, format: s3Format } = config.options as { s3Config: S3Config; keyName: string; format: 'json' | 'csv' | 'xml' };
        return this.cloudExporter.exportToS3(data, s3Config, keyName, s3Format, options);
        
      case 'webhook':
        const webhookConfig = config.options as WebhookConfig;
        return this.webhookExporter.exportToWebhook(data, webhookConfig, options);
        
      default:
        throw new Error(`Unsupported export format: ${config.format}`);
    }
  }

  // Convenience methods
  async exportToFile(data: any[], format: 'json' | 'csv' | 'xml', filePath: string, options?: ExportOptions): Promise<ExportResult> {
    return this.export(data, { format, destination: filePath }, options);
  }

  async exportToDatabase(data: any[], dbType: 'mongodb' | "postgresql" | 'sqlite', config: DatabaseConfig | string, options?: ExportOptions): Promise<ExportResult> {
    const exportConfig: ExportConfig = {
      format: dbType,
      destination: typeof config === 'string' ? config : '',
      options: typeof config === 'object' ? config : undefined
    };

    return this.export(data, exportConfig, options);
  }

  async exportToCloud(data: any[], provider: 's3', config: any, options?: ExportOptions): Promise<ExportResult> {
    return this.export(data, { format: provider, destination: '', options: config }, options);
  }
}

export default DataExporter;