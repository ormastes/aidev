/**
 * RAG (Retrieval-Augmented Generation) Pattern
 * Retrieve relevant context before generating response
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode, TransformNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { RAGConfig } from '../types';

export class RAGPattern extends BasePattern {
  name = 'rag';
  description = 'Retrieval-Augmented Generation - retrieve context then generate';
  minAgents = 1;
  maxAgents = 2; // Optional separate retriever and generator

  build(agents: Agent[], config?: RAGConfig): PocketFlow {
    const flow = new PocketFlow();
    const contextLimit = config?.contextLimit ?? 3;
    const includeMetadata = config?.includeMetadata ?? false;
    
    // Determine if we have separate retriever and generator
    const hasRetriever = agents.length === 2;
    const retrieverAgent = hasRetriever ? agents[0] : agents[0];
    const generatorAgent = hasRetriever ? agents[1] : agents[0];
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Create query processor
    const queryNode = new TransformNode('query-processor', (input: any) => {
      const query = typeof input === 'string' ? input : input.query || JSON.stringify(input);
      
      return {
        originalQuery: query,
        retrievalQuery: this.optimizeForRetrieval(query, config?.retrievalStrategy)
      };
    });
    
    flow.addNode(queryNode);
    flow.addEdge({ from: 'input', to: 'query-processor' });
    
    // Create retriever node
    const retrieverNode = new AgentNode('retriever', retrieverAgent, {
      extractInput: (data: any) => ({
        messages: [{
          role: 'system',
          content: hasRetriever 
            ? 'You are a retrieval specialist. Find relevant information for the query.'
            : 'First, identify what information would be helpful to answer this query.'
        }, {
          role: 'user',
          content: `Query: ${data.retrievalQuery}\n\nRetrieve ${contextLimit} relevant pieces of information.`
        }]
      }),
      formatOutput: (output) => ({
        retrievedContext: output.message.content,
        metadata: includeMetadata ? output.metadata : undefined
      })
    });
    
    flow.addNode(retrieverNode);
    flow.addEdge({ from: 'query-processor', to: 'retriever' });
    
    // Create context processor
    const contextNode = new TransformNode('context-processor', (data: any[]) => {
      const queryData = data[0];
      const retrievalData = data[1];
      
      // Format context for generation
      const context = this.formatContext(retrievalData.retrievedContext, config);
      
      return {
        query: queryData.originalQuery,
        context,
        metadata: retrievalData.metadata
      };
    });
    
    flow.addNode(contextNode);
    flow.addEdge({ from: 'query-processor', to: 'context-processor' });
    flow.addEdge({ from: 'retriever', to: 'context-processor' });
    
    // Re-ranking node (optional)
    if (config?.reranking) {
      const rerankNode = new TransformNode('reranker', (data: any) => {
        // Simple relevance scoring (in real implementation, use embeddings)
        const contextItems = data.context.split('\n').filter((c: string) => c.trim());
        const query = data.query.toLowerCase();
        
        const scored = contextItems.map((item: string) => {
          const score = query.split(' ').filter((word: string) => 
            item.toLowerCase().includes(word)
          ).length;
          
          return { item, score };
        });
        
        // Sort by score and take top items
        const reranked = scored
          .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
          .slice(0, contextLimit)
          .map((s: { item: string }) => s.item)
          .join('\n');
        
        return {
          ...data,
          context: reranked
        };
      });
      
      flow.addNode(rerankNode);
      flow.addEdge({ from: 'context-processor', to: 'reranker' });
      
      // Generator receives reranked context
      const generatorNode = this.createGeneratorNode(generatorAgent, hasRetriever);
      flow.addNode(generatorNode);
      flow.addEdge({ from: 'reranker', to: 'generator' });
    } else {
      // Generator receives context directly
      const generatorNode = this.createGeneratorNode(generatorAgent, hasRetriever);
      flow.addNode(generatorNode);
      flow.addEdge({ from: 'context-processor', to: 'generator' });
    }
    
    // Output
    flow.addNode(new OutputNode('output'));
    flow.addEdge({ from: 'generator', to: 'output' });
    
    return flow;
  }

  private createGeneratorNode(agent: Agent, hasRetriever: boolean) {
    return new AgentNode('generator', agent, {
      extractInput: (data: any) => ({
        messages: [{
          role: 'system',
          content: hasRetriever
            ? 'You are a response generator. Use the provided context to answer the query accurately.'
            : 'Use the context you identified to provide a comprehensive answer.'
        }, {
          role: 'user',
          content: `Context:\n${data.context}\n\nQuery: ${data.query}\n\nGenerate a response based on the context.`
        }]
      }),
      formatOutput: (output) => ({
        response: output.message.content,
        pattern: 'rag',
        contextUsed: true
      })
    });
  }

  private optimizeForRetrieval(query: string, strategy?: string): string {
    switch (strategy) {
      case 'keyword':
        // Extract key terms
        return query
          .split(' ')
          .filter(word => word.length > 3)
          .join(' ');
          
      case 'similarity':
        // Prepare for embedding search
        return query.replace(/[?!.,]/g, '').trim();
        
      case 'hybrid':
      default:
        // Keep original query
        return query;
    }
  }

  private formatContext(context: string, config?: RAGConfig): string {
    // Clean and format retrieved context
    const lines = context.split('\n').filter(line => line.trim());
    
    if (config?.contextLimit) {
      return lines.slice(0, config.contextLimit).join('\n');
    }
    
    return lines.join('\n');
  }
}