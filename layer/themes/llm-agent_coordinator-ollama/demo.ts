#!/usr/bin/env ts-node
/**
 * Demo script showing Ollama Coordinator usage
 * Run with: npm run demo
 */

import { OllamaCoordinator } from './src/ollama-coordinator';
import { checkOllamaAvailability } from './pipe/utils';

async function demo() {
  console.log('🦙 Ollama Coordinator Demo');
  console.log('=' .repeat(50));

  // Check if Ollama is available
  console.log('\n1. Checking Ollama availability...');
  const availability = await checkOllamaAvailability();
  
  if (!availability.available) {
    console.log('❌ Ollama is not available');
    console.log('   Please start Ollama with: ollama serve');
    console.log('   And install a model with: ollama pull llama2');
    return;
  }

  console.log('✅ Ollama is available');
  if (availability.models && availability.models.length > 0) {
    console.log(`   Available models: ${availability.models.join(', ')}`);
  }

  // Initialize coordinator
  console.log('\n2. Initializing coordinator...');
  const coordinator = new OllamaCoordinator({
    defaultModel: availability.models?.[0] || 'llama2',
    embeddingModel: 'nomic-embed-text',
    enableLogging: true,
    autoInstallModels: false // Don't auto-install in demo
  });

  try {
    await coordinator.initialize();
    console.log('✅ Coordinator initialized');

    // Show capabilities
    console.log('\n3. Coordinator capabilities:');
    const capabilities = coordinator.getCapabilities();
    Object.entries(capabilities).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? '✅' : '❌'}`);
    });

    // Health check
    console.log('\n4. Health check:');
    const health = await coordinator.healthCheck();
    console.log(`   Status: ${health.status}`);
    console.log('   Services:');
    Object.entries(health.services).forEach(([service, status]) => {
      console.log(`     ${service}: ${status ? '✅' : '❌'}`);
    });

    // List models
    console.log('\n5. Available models:');
    const models = await coordinator.listModels();
    if (models.length === 0) {
      console.log('   No models installed');
      console.log('   Install a model with: ollama pull llama2');
    } else {
      models.forEach(model => {
        console.log(`   📦 ${model.name} (${Math.round((model.size || 0) / 1024 / 1024)}MB)`);
        if (model.capabilities) {
          console.log(`      Capabilities: ${model.capabilities.join(', ')}`);
        }
      });
    }

    // If we have models, try some operations
    if (models.length > 0) {
      const modelName = models[0].name;
      
      console.log(`\n6. Creating chat session with ${modelName}...`);
      const session = coordinator.createChatSession({
        model: modelName,
        systemPrompt: 'You are a helpful AI assistant. Keep responses brief.'
      });
      console.log(`   ✅ Created session: ${session.id.substring(0, 8)}...`);

      console.log('\n7. Testing text generation...');
      try {
        const response = await coordinator.generate(
          'What is the capital of France? Answer in one word.',
          { 
            model: modelName,
            maxTokens: 10,
            temperature: 0.1
          }
        );
        console.log(`   🤖 Response: "${response.trim()}"`);
      } catch (error) {
        console.log(`   ❌ Generation failed: ${error}`);
      }

      // Try embeddings if embedding model is available
      const embeddingModel = models.find(m => 
        m.name.includes('embed') || m.name.includes('nomic')
      );
      
      if (embeddingModel) {
        console.log(`\n8. Testing embeddings with ${embeddingModel.name}...`);
        try {
          const embedding = await coordinator.embed('Hello world', {
            model: embeddingModel.name
          });
          console.log(`   📊 Generated ${embedding.length}-dimensional embedding`);
          console.log(`   📈 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`);

          // Similarity test
          console.log('\n9. Testing similarity search...');
          const corpus = [
            'The cat sat on the mat',
            'Dogs are loyal companions',
            'A feline rested on the rug',
            'Cars have four wheels'
          ];

          const similar = await coordinator.findSimilar(
            'A cat on a mat', 
            corpus,
            { 
              model: embeddingModel.name,
              topK: 2 
            }
          );

          console.log('   📊 Similarity results:');
          similar.forEach((result, i) => {
            console.log(`   ${i + 1}. "${result.text}" (${(result.similarity * 100).toFixed(1)}%)`);
          });

        } catch (error) {
          console.log(`   ❌ Embeddings failed: ${error}`);
        }
      } else {
        console.log('\n8. No embedding model available');
        console.log('   Install one with: ollama pull nomic-embed-text');
      }
    }

    // Show metrics
    console.log('\n10. Coordinator metrics:');
    const metrics = coordinator.getMetrics();
    console.log(`    📊 Total requests: ${metrics.totalRequests}`);
    console.log(`    ⚡ Active requests: ${metrics.activeRequests}`);
    console.log(`    ✅ Completed: ${metrics.completedRequests}`);
    console.log(`    ❌ Failed: ${metrics.failedRequests}`);
    console.log(`    📈 Avg response time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`    🔄 Active sessions: ${metrics.activeSessions}`);
    console.log(`    ⏱️  Uptime: ${Math.round(metrics.uptime / 1000)}s`);

    console.log('\n✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    // Cleanup
    await coordinator.shutdown();
    console.log('🧹 Coordinator shutdown complete');
  }
}

// Run demo
if (require.main === module) {
  demo().catch(console.error);
}

export default demo;