/**
 * Example: Building AI workflows with PocketFlow agents
 * Demonstrates the power of agent abstraction
 */

import { PocketFlow } from '@aidev/pocketflow-core';
import {
  MockAgent,
  AgentNode,
  ConversationAgentNode,
  ConversationMemory,
  calculatorTool,
  dateTimeTool,
  webSearchTool
} from '../src';

async function main() {
  console.log('🤖 PocketFlow Agent Examples\n');

  // Example 1: Simple Q&A Agent
  await runSimpleQA();
  
  // Example 2: Agent with Tools
  await runAgentWithTools();
  
  // Example 3: Multi-Agent Collaboration
  await runMultiAgentWorkflow();
  
  // Example 4: Conversational Agent with Memory
  await runConversationalAgent();
}

async function runSimpleQA() {
  console.log('📝 Example 1: Simple Q&A Agent\n');
  
  const flow = new PocketFlow();
  
  // Create and configure agent
  const agent = new MockAgent();
  agent.addResponse("typescript", 'TypeScript is a typed superset of JavaScript.');
  agent.addResponse("pocketflow", 'PocketFlow is a minimalist LLM framework.');
  await agent.initialize({
    defaultResponse: 'I can help you with programming questions.'
  });
  
  // Add to workflow
  const agentNode = new AgentNode("assistant", agent, {
    formatOutput: (output) => output.message.content
  });
  
  flow.addNode(agentNode);
  
  // Test questions
  const questions = [
    'What is TypeScript?',
    'Tell me about PocketFlow',
    'How do I learn programming?'
  ];
  
  for (const question of questions) {
    const result = await flow.execute(question);
    console.log(`Q: ${question}`);
    console.log(`A: ${result.outputs.get("assistant")}\n`);
  }
}

async function runAgentWithTools() {
  console.log('\n🔧 Example 2: Agent with Tools\n');
  
  const flow = new PocketFlow();
  
  // Create agent with tools
  const agent = new MockAgent();
  await agent.initialize({
    tools: [calculatorTool, dateTimeTool, webSearchTool]
  });
  
  const agentNode = new AgentNode("toolAgent", agent);
  
  flow.addNode(agentNode);
  
  // Test tool usage
  const prompts = [
    'Please calculate 156 + 244',
    'What is the current date?',
    'Search for PocketFlow documentation'
  ];
  
  for (const prompt of prompts) {
    console.log(`🤔 User: ${prompt}`);
    const result = await flow.execute({
      messages: [{ role: 'user', content: prompt }]
    });
    
    const output = result.outputs.get("toolAgent");
    if (output.toolCalls) {
      console.log(`🔧 Tool calls:`, output.toolCalls.map((t: any) => t.name).join(', '));
    }
    console.log(`🤖 Agent: ${output.message.content}\n`);
  }
}

async function runMultiAgentWorkflow() {
  console.log('\n👥 Example 3: Multi-Agent Collaboration\n');
  
  const flow = new PocketFlow();
  
  // Agent 1: Research Agent
  const researcher = new MockAgent();
  researcher.addResponse("research", 'I found 3 relevant articles about AI workflows.');
  await researcher.initialize({
    defaultResponse: 'Researching the topic...'
  });
  
  // Agent 2: Summary Agent  
  const summarizer = new MockAgent();
  summarizer.addResponse("articles", 'Summary: AI workflows enable automated task processing.');
  await summarizer.initialize({
    defaultResponse: 'Creating summary...'
  });
  
  // Agent 3: Writer Agent
  const writer = new MockAgent();
  writer.addResponse('summary', 'Based on the research, here is a comprehensive report on AI workflows...');
  await writer.initialize({
    defaultResponse: 'Writing content...'
  });
  
  // Create workflow
  const researchNode = new AgentNode("researcher", researcher, {
    formatOutput: (output) => ({
      stage: "research",
      result: output.message.content
    })
  });
  
  const summaryNode = new AgentNode("summarizer", summarizer, {
    extractInput: (data) => ({
      messages: [{ 
        role: 'user', 
        content: `Summarize these research findings: ${data.result}` 
      }]
    }),
    formatOutput: (output) => ({
      stage: 'summary',
      result: output.message.content
    })
  });
  
  const writerNode = new AgentNode('writer', writer, {
    extractInput: (data) => ({
      messages: [{ 
        role: 'user', 
        content: `Write a report based on: ${data.result}` 
      }]
    }),
    formatOutput: (output) => ({
      stage: 'final',
      result: output.message.content
    })
  });
  
  flow.addNode(researchNode);
  flow.addNode(summaryNode);
  flow.addNode(writerNode);
  
  flow.addEdge({ from: "researcher", to: "summarizer" });
  flow.addEdge({ from: "summarizer", to: 'writer' });
  
  const result = await flow.execute('Research AI workflow patterns');
  
  console.log('📊 Workflow stages:');
  console.log('1. Research:', result.outputs.get("researcher").result);
  console.log('2. Summary:', result.outputs.get("summarizer").result);
  console.log('3. Final:', result.outputs.get('writer').result);
}

async function runConversationalAgent() {
  console.log('\n\n💬 Example 4: Conversational Agent with Memory\n');
  
  // Create agent with conversation patterns
  const agent = new MockAgent();
  agent.addResponse('name', "Nice to meet you! I'll remember your name.");
  agent.addResponse("remember", "I remember our previous conversation.");
  agent.addResponse("favorite", "I've noted your favorite color.");
  await agent.initialize({
    memory: new ConversationMemory(),
    defaultResponse: "Let's continue our conversation."
  });
  
  // Create conversational node
  const convNode = new ConversationAgentNode('chat', agent);
  
  // Simulate conversation
  const conversation = [
    "Hi, my name is Alice",
    "My favorite color is blue",
    "Do you remember what we talked about?",
    "What was my name again?"
  ];
  
  console.log('Starting conversation...\n');
  
  for (const message of conversation) {
    console.log(`👤 User: ${message}`);
    
    const result = await convNode.execute({
      data: message,
      context: { 
        variables: new Map(), 
        errors: [], 
        metadata: new Map() 
      }
    });
    
    console.log(`🤖 Assistant: ${result.data.response}`);
    console.log(`   (History: ${result.data.history.length} messages)\n`);
  }
  
  // Show final conversation history
  console.log('📜 Conversation History:');
  const history = convNode.getHistory();
  history.forEach((msg, i) => {
    console.log(`${i + 1}. [${msg.role}]: ${msg.content}`);
  });
}

// Run the examples
main().catch(console.error);