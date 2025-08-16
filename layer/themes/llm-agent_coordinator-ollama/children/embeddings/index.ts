/**
 * Embeddings Manager
 * Manages text embeddings using Ollama models
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { OllamaClient } from '../client';

export interface EmbeddingRequest {
  text: string;
  model?: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  maxTokens: number;
  description?: string;
}

export interface BatchEmbeddingOptions {
  texts: string[];
  model?: string;
  batchSize?: number;
  parallel?: boolean;
  onProgress?: (progress: { completed: number; total: number }) => void;
}

export interface SimilarityResult {
  text: string;
  similarity: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface EmbeddingCache {
  text: string;
  embedding: number[];
  model: string;
  timestamp: Date;
}

export class EmbeddingsManager extends EventEmitter {
  private client: OllamaClient;
  private cache: Map<string, EmbeddingCache>;
  private models: Map<string, EmbeddingModel>;
  private defaultModel: string;
  private maxCacheSize: number;

  constructor(client: OllamaClient, options?: {
    defaultModel?: string;
    maxCacheSize?: number;
  }) {
    super();
    this.client = client;
    this.cache = new Map();
    this.models = new Map();
    this.defaultModel = options?.defaultModel || 'nomic-embed-text';
    this.maxCacheSize = options?.maxCacheSize || 1000;
    
    this.loadEmbeddingModels();
  }

  private loadEmbeddingModels(): void {
    const models: EmbeddingModel[] = [
      {
        name: 'nomic-embed-text',
        dimensions: 768,
        maxTokens: 8192,
        description: 'High-quality text embeddings'
      },
      {
        name: 'mxbai-embed-large',
        dimensions: 1024,
        maxTokens: 512,
        description: 'Large embedding model'
      },
      {
        name: 'all-minilm',
        dimensions: 384,
        maxTokens: 256,
        description: 'Lightweight embedding model'
      }
    ];

    for (const model of models) {
      this.models.set(model.name, model);
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.defaultModel;
    const cacheKey = `${model}:${request.text}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.emit('embedding:cache:hit', { text: request.text, model });
      
      return {
        embedding: cached.embedding,
        model: cached.model,
        dimensions: cached.embedding.length,
        metadata: request.metadata
      };
    }

    this.emit('embedding:start', { text: request.text, model });

    try {
      const response = await this.client.embeddings({
        model,
        prompt: request.text
      });

      const result: EmbeddingResponse = {
        embedding: response.embedding,
        model,
        dimensions: response.embedding.length,
        metadata: request.metadata
      };

      // Cache the result
      this.addToCache(cacheKey, {
        text: request.text,
        embedding: response.embedding,
        model,
        timestamp: new Date()
      });

      this.emit('embedding:complete', { 
        text: request.text, 
        model,
        dimensions: result.dimensions 
      });

      return result;
    } catch (error) {
      this.emit('embedding:error', { text: request.text, model, error });
      throw error;
    }
  }

  async batchEmbed(options: BatchEmbeddingOptions): Promise<EmbeddingResponse[]> {
    const model = options.model || this.defaultModel;
    const batchSize = options.batchSize || 10;
    const results: EmbeddingResponse[] = [];
    
    this.emit('batch:start', { 
      total: options.texts.length,
      model,
      batchSize 
    });

    if (options.parallel) {
      // Process in parallel batches
      for (let i = 0; i < options.texts.length; i += batchSize) {
        const batch = options.texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => 
          this.embed({ text, model })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        if (options.onProgress) {
          options.onProgress({
            completed: Math.min(i + batchSize, options.texts.length),
            total: options.texts.length
          });
        }

        this.emit('batch:progress', {
          completed: results.length,
          total: options.texts.length
        });
      }
    } else {
      // Process sequentially
      for (let i = 0; i < options.texts.length; i++) {
        const result = await this.embed({ 
          text: options.texts[i],
          model 
        });
        results.push(result);

        if (options.onProgress) {
          options.onProgress({
            completed: i + 1,
            total: options.texts.length
          });
        }

        this.emit('batch:progress', {
          completed: i + 1,
          total: options.texts.length
        });
      }
    }

    this.emit('batch:complete', { 
      total: results.length,
      model 
    });

    return results;
  }

  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  euclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  async findSimilar(query: string, corpus: string[], options?: {
    model?: string;
    topK?: number;
    threshold?: number;
    metric?: 'cosine' | 'euclidean';
    includeEmbeddings?: boolean;
  }): Promise<SimilarityResult[]> {
    const model = options?.model || this.defaultModel;
    const topK = options?.topK || 10;
    const threshold = options?.threshold || 0;
    const metric = options?.metric || 'cosine';
    const includeEmbeddings = options?.includeEmbeddings || false;

    // Get query embedding
    const queryEmbedding = await this.embed({ text: query, model });

    // Get corpus embeddings
    const corpusEmbeddings = await this.batchEmbed({
      texts: corpus,
      model,
      parallel: true
    });

    // Calculate similarities
    const similarities: SimilarityResult[] = corpus.map((text, i) => {
      const embedding = corpusEmbeddings[i].embedding;
      
      const similarity = metric === 'cosine'
        ? this.cosineSimilarity(queryEmbedding.embedding, embedding)
        : 1 / (1 + this.euclideanDistance(queryEmbedding.embedding, embedding));

      return {
        text,
        similarity,
        embedding: includeEmbeddings ? embedding : undefined
      };
    });

    // Filter by threshold and sort
    const filtered = similarities
      .filter(s => s.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    this.emit('similarity:complete', { 
      query,
      results: filtered.length 
    });

    return filtered;
  }

  async cluster(texts: string[], options?: {
    model?: string;
    numClusters?: number;
    method?: 'kmeans' | 'hierarchical';
  }): Promise<Array<{ centroid: number[]; members: string[] }>> {
    const model = options?.model || this.defaultModel;
    const numClusters = options?.numClusters || Math.ceil(Math.sqrt(texts.length));
    const method = options?.method || 'kmeans';

    // Get embeddings for all texts
    const embeddings = await this.batchEmbed({
      texts,
      model,
      parallel: true
    });

    if (method === 'kmeans') {
      return this.kMeansClustering(texts, embeddings.map(e => e.embedding), numClusters);
    } else {
      throw new Error(`Clustering method ${method} not implemented`);
    }
  }

  private kMeansClustering(
    texts: string[],
    embeddings: number[][],
    k: number
  ): Array<{ centroid: number[]; members: string[] }> {
    if (texts.length < k) {
      k = texts.length;
    }

    // Initialize centroids randomly
    const centroids: number[][] = [];
    const used = new Set<number>();
    
    while (centroids.length < k) {
      const idx = Math.floor(Math.random() * embeddings.length);
      if (!used.has(idx)) {
        centroids.push([...embeddings[idx]]);
        used.add(idx);
      }
    }

    // Run k-means iterations
    const maxIterations = 100;
    let clusters: number[] = new Array(texts.length);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to clusters
      let changed = false;
      
      for (let i = 0; i < embeddings.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        
        for (let j = 0; j < k; j++) {
          const dist = this.euclideanDistance(embeddings[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }
        
        if (clusters[i] !== bestCluster) {
          changed = true;
          clusters[i] = bestCluster;
        }
      }
      
      if (!changed) break;
      
      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterMembers = embeddings.filter((_, i) => clusters[i] === j);
        
        if (clusterMembers.length > 0) {
          const newCentroid = new Array(embeddings[0].length).fill(0);
          
          for (const member of clusterMembers) {
            for (let d = 0; d < member.length; d++) {
              newCentroid[d] += member[d];
            }
          }
          
          for (let d = 0; d < newCentroid.length; d++) {
            newCentroid[d] /= clusterMembers.length;
          }
          
          centroids[j] = newCentroid;
        }
      }
    }

    // Build result
    const result: Array<{ centroid: number[]; members: string[] }> = [];
    
    for (let j = 0; j < k; j++) {
      const members = texts.filter((_, i) => clusters[i] === j);
      if (members.length > 0) {
        result.push({
          centroid: centroids[j],
          members
        });
      }
    }

    return result;
  }

  private addToCache(key: string, value: EmbeddingCache): void {
    // Implement LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getAvailableModels(): EmbeddingModel[] {
    return Array.from(this.models.values());
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
    this.emit('model:changed', { model });
  }

  async dimensionReduction(embeddings: number[][], targetDim: number): Promise<number[][]> {
    // Simple PCA-like dimension reduction
    if (embeddings.length === 0 || targetDim >= embeddings[0].length) {
      return embeddings;
    }

    // Calculate mean
    const mean = new Array(embeddings[0].length).fill(0);
    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.length; i++) {
        mean[i] += embedding[i];
      }
    }
    for (let i = 0; i < mean.length; i++) {
      mean[i] /= embeddings.length;
    }

    // Center the data
    const centered = embeddings.map(embedding =>
      embedding.map((val, i) => val - mean[i])
    );

    // Simple projection to lower dimensions (not true PCA)
    const reduced = centered.map(embedding => {
      const result = new Array(targetDim).fill(0);
      for (let i = 0; i < targetDim; i++) {
        // Simple projection - just take first targetDim dimensions
        // In real implementation, would compute eigenvectors
        result[i] = embedding[i] || 0;
      }
      return result;
    });

    return reduced;
  }
}

export default EmbeddingsManager;