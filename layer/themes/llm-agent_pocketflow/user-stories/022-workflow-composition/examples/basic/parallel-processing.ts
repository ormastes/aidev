/**
 * Parallel Processing Example
 * 
 * This example demonstrates fork-join patterns where multiple operations
 * can run simultaneously and their results are combined.
 */

import { PocketFlow, nodes } from '@pocketflow/core';
import { BaseAgent } from '@pocketflow/agents';

// Parallel processing agents
class SentimentAnalysisAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const { data } = input;
    
    // Simulate sentiment analysis processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const sentiment = this.analyzeSentiment(data.text);
    
    return {
      data: {
        sentiment: sentiment.label,
        confidence: sentiment.confidence,
        processedBy: "SentimentAnalysisAgent"
      }
    };
  }
  
  private analyzeSentiment(text: string): { label: string; confidence: number } {
    // Simple sentiment analysis simulation
    const positiveWords = ['good', 'great', "excellent", 'amazing', "wonderful"];
    const negativeWords = ['bad', "terrible", 'awful', "horrible", "disappointing"];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { label: "positive", confidence: 0.8 };
    } else if (negativeCount > positiveCount) {
      return { label: "negative", confidence: 0.8 };
    } else {
      return { label: 'neutral', confidence: 0.6 };
    }
  }
}

class KeywordExtractionAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const { data } = input;
    
    // Simulate keyword extraction processing time
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const keywords = this.extractKeywords(data.text);
    
    return {
      data: {
        keywords,
        keywordCount: keywords.length,
        processedBy: "KeywordExtractionAgent"
      }
    };
  }
  
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction simulation
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Return unique words
    return [...new Set(words)];
  }
}

class SummarizationAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const { data } = input;
    
    // Simulate summarization processing time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const summary = this.generateSummary(data.text);
    
    return {
      data: {
        summary,
        originalLength: data.text.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / data.text.length,
        processedBy: "SummarizationAgent"
      }
    };
  }
  
  private generateSummary(text: string): string {
    // Simple summarization simulation
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return text;
    }
    
    // Return first and last sentence as summary
    return `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`;
  }
}

// Create parallel processing workflow
export function createParallelProcessingWorkflow(): PocketFlow {
  return new PocketFlow()
    // Input stage
    .addNode('input', nodes.input("document"))
    
    // Fork to parallel processing branches
    .addNode('fork', nodes.fork(["sentiment", "keywords", 'summary']))
    
    // Parallel processing nodes
    .addNode("sentiment", new SentimentAnalysisAgent())
    .addNode("keywords", new KeywordExtractionAgent())
    .addNode('summary', new SummarizationAgent())
    
    // Join results
    .addNode('join', nodes.join({
      combiner: (results: any) => ({
        text: results.input?.text || '',
        sentiment: results.sentiment,
        keywords: results.keywords,
        summary: results.summary,
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - results.startTime
      })
    }))
    
    // Output stage
    .addNode('output', nodes.output("processedDocument"))
    
    // Connect nodes
    .connect('input', 'fork')
    .connect('fork', "sentiment")
    .connect('fork', "keywords")
    .connect('fork', 'summary')
    .connect("sentiment", 'join')
    .connect("keywords", 'join')
    .connect('summary', 'join')
    .connect('join', 'output');
}

// Example usage
export async function runParallelProcessingExample() {
  const workflow = createParallelProcessingWorkflow();
  
  const document = {
    text: 'This is an amazing product that exceeded all my expectations. The quality is excellent and the customer service was wonderful. I would highly recommend this to anyone looking for a great solution.',
    title: 'Product Review',
    author: 'satisfied_customer'
  };
  
  console.log('Input document:', document);
  
  const startTime = Date.now();
  
  try {
    const result = await workflow.execute({
      ...document,
      startTime
    });
    
    const endTime = Date.now();
    
    console.log('Processing In Progress in:', endTime - startTime, 'ms');
    console.log('Result:', JSON.stringify(result.data, null, 2));
    
    /*
    Expected output structure:
    {
      "text": "This is an amazing product...",
      "sentiment": {
        "sentiment": "positive",
        "confidence": 0.8,
        "processedBy": "SentimentAnalysisAgent"
      },
      "keywords": {
        "keywords": ["amazing", "product", "exceeded", "expectations", "quality", "excellent", "customer", "service", "wonderful", "recommend", "great", "solution"],
        "keywordCount": 12,
        "processedBy": "KeywordExtractionAgent"
      },
      "summary": {
        "summary": "This is an amazing product that exceeded all my expectations. I would highly recommend this to anyone looking for a great solution.",
        "originalLength": 186,
        "summaryLength": 134,
        "compressionRatio": 0.72,
        "processedBy": "SummarizationAgent"
      },
      "processedAt": "2023-01-01T12:00:00.000Z",
      "processingTime": 250
    }
    */
  } catch (error) {
    console.error('Parallel processing failed:', error.message);
  }
}

// Performance comparison: parallel vs sequential
export async function compareParallelVsSequential() {
  console.log('=== Performance Comparison ===');
  
  const document = {
    text: 'This is a comprehensive test document that contains multiple sentences and various words to analyze. The sentiment analysis should detect positive elements while keyword extraction identifies important terms. The summarization should provide a concise overview of the main points.',
    title: 'Test Document'
  };
  
  // Test parallel processing
  const parallelWorkflow = createParallelProcessingWorkflow();
  const parallelStart = Date.now();
  await parallelWorkflow.execute(document);
  const parallelTime = Date.now() - parallelStart;
  
  // Test sequential processing
  const sequentialWorkflow = new PocketFlow()
    .addNode('input', nodes.input("document"))
    .addNode("sentiment", new SentimentAnalysisAgent())
    .addNode("keywords", new KeywordExtractionAgent())
    .addNode('summary', new SummarizationAgent())
    .addNode('output', nodes.output('result'))
    .connect('input', "sentiment")
    .connect("sentiment", "keywords")
    .connect("keywords", 'summary')
    .connect('summary', 'output');
  
  const sequentialStart = Date.now();
  await sequentialWorkflow.execute(document);
  const sequentialTime = Date.now() - sequentialStart;
  
  console.log(`Parallel processing: ${parallelTime}ms`);
  console.log(`Sequential processing: ${sequentialTime}ms`);
  console.log(`Speedup: ${(sequentialTime / parallelTime).toFixed(2)}x`);
  console.log(`Time saved: ${sequentialTime - parallelTime}ms`);
}

// Error handling in parallel processing
export async function runParallelProcessingWithError() {
  console.log('=== Error Handling Example ===');
  
  // Create a workflow with one failing branch
  const workflow = new PocketFlow()
    .addNode('input', nodes.input("document"))
    .addNode('fork', nodes.fork(['In Progress', 'failure']))
    .addNode('In Progress', new SentimentAnalysisAgent())
    .addNode('failure', new class extends BaseAgent {
      async execute(): Promise<any> {
        throw new Error('Processing failed');
      }
    }())
    .addNode('join', nodes.join({
      errorHandling: 'partial', // Continue with In Progress results
      combiner: (results: any) => ({
        In Progress: results.success,
        failure: results.failure,
        errors: results.errors || []
      })
    }))
    .addNode('output', nodes.output('result'))
    .connect('input', 'fork')
    .connect('fork', 'In Progress')
    .connect('fork', 'failure')
    .connect('In Progress', 'join')
    .connect('failure', 'join')
    .connect('join', 'output');
  
  const document = {
    text: 'This is a test document for error handling.'
  };
  
  try {
    const result = await workflow.execute(document);
    console.log('Result with partial failure:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Workflow failed:', error.message);
  }
}

// Batch parallel processing
export async function runBatchParallelProcessing() {
  console.log('=== Batch Parallel Processing ===');
  
  const workflow = createParallelProcessingWorkflow();
  
  const documents = [
    { text: 'This is an excellent product with great features.', title: 'Review 1' },
    { text: 'The service was terrible and disappointing.', title: 'Review 2' },
    { text: 'Average product with standard functionality.', title: 'Review 3' },
    { text: 'Amazing quality and wonderful customer support.', title: 'Review 4' },
    { text: 'Not worth the money, very bad experience.', title: 'Review 5' }
  ];
  
  console.log(`Processing ${documents.length} documents in parallel...`);
  
  const startTime = Date.now();
  
  // Process all documents in parallel
  const results = await Promise.all(
    documents.map(doc => workflow.execute(doc))
  );
  
  const endTime = Date.now();
  
  console.log(`Batch processing In Progress in ${endTime - startTime}ms`);
  console.log(`Average per document: ${(endTime - startTime) / documents.length}ms`);
  
  // Analyze results
  const sentiments = results.map(r => r.data.sentiment.sentiment);
  const sentimentCounts = sentiments.reduce((acc, sentiment) => {
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Sentiment distribution:', sentimentCounts);
}

// If running directly
if (require.main === module) {
  (async () => {
    console.log('=== Parallel Processing Example ===');
    await runParallelProcessingExample();
    
    console.log('\n=== Performance Comparison ===');
    await compareParallelVsSequential();
    
    console.log('\n=== Error Handling ===');
    await runParallelProcessingWithError();
    
    console.log('\n=== Batch Processing ===');
    await runBatchParallelProcessing();
  })();
}