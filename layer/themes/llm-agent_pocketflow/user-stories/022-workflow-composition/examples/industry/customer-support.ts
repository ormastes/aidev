/**
 * Customer Support Automation Workflow
 * 
 * This example demonstrates a real-world customer support automation
 * system using PocketFlow patterns including classification, routing,
 * and automated response generation.
 */

import { PocketFlow, nodes } from '@pocketflow/core';
import { BaseAgent } from '@pocketflow/agents';

// Data types
interface SupportTicket {
  id: string;
  customer: {
    id: string;
    email: string;
    name: string;
    tier: 'basic' | 'premium' | 'enterprise';
  };
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  department?: string;
  timestamp: string;
}

interface TicketClassification {
  department: 'technical' | 'billing' | 'sales' | 'general';
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
}

interface SupportResponse {
  ticketId: string;
  response: string;
  responseType: 'automated' | 'escalated' | 'resolve';
  nextSteps: string[];
  estimatedResolutionTime: number;
  assignedAgent?: string;
}

// Classification Agent
class TicketClassificationAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const ticket: SupportTicket = input.data;
    
    const classification = this.classifyTicket(ticket);
    
    return {
      data: {
        ...ticket,
        classification,
        classifiedAt: new Date().toISOString()
      }
    };
  }
  
  private classifyTicket(ticket: SupportTicket): TicketClassification {
    const text = `${ticket.subject} ${ticket.message}`.toLowerCase();
    
    // Keyword-based classification (in reality, this would use ML)
    const keywords = {
      technical: ['bug', 'error', 'crash', 'not working', 'broken', 'issue', 'problem'],
      billing: ['payment', 'invoice', 'charge', 'refund', 'subscription', 'billing'],
      sales: ['upgrade', 'pricing', 'demo', 'trial', 'purchase', 'quote'],
      general: ['help', 'question', 'how to', 'support', 'information']
    };
    
    let department: TicketClassification['department'] = 'general';
    let maxScore = 0;
    
    for (const [dept, words] of Object.entries(keywords)) {
      const score = words.reduce((sum, word) => {
        return sum + (text.includes(word) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        department = dept as TicketClassification['department'];
      }
    }
    
    // Determine severity based on keywords and customer tier
    const criticalWords = ['urgent', 'critical', 'emergency', 'down', 'outage'];
    const hasCriticalKeywords = criticalWords.some(word => text.includes(word));
    
    let severity: TicketClassification['severity'] = 'low';
    let urgency: TicketClassification['urgency'] = 'low';
    
    if (hasCriticalKeywords) {
      severity = 'critical';
      urgency = 'urgent';
    } else if (ticket.priority === 'high' || ticket.customer.tier === 'enterprise') {
      severity = 'high';
      urgency = 'high';
    } else if (ticket.priority === 'medium' || ticket.customer.tier === 'premium') {
      severity = 'medium';
      urgency = 'medium';
    }
    
    return {
      department,
      category: this.getCategory(department, text),
      severity,
      urgency,
      confidence: maxScore > 0 ? 0.8 : 0.6
    };
  }
  
  private getCategory(department: string, text: string): string {
    const categories = {
      technical: {
        'bug_report': ['bug', 'error', 'crash'],
        'feature_request': ['feature', 'request', 'enhancement'],
        'integration': ['api', 'integration', 'webhook'],
        'performance': ['slow', 'timeout', 'performance']
      },
      billing: {
        'payment_issue': ['payment', 'card', 'failed'],
        'invoice_question': ['invoice', 'receipt', 'billing'],
        'refund_request': ['refund', 'cancel', 'return'],
        'subscription': ['subscription', 'plan', 'upgrade']
      },
      sales: {
        'pricing_inquiry': ['price', 'cost', 'pricing'],
        'demo_request': ['demo', 'trial', 'test'],
        'upgrade_request': ['upgrade', 'enterprise', 'premium'],
        'general_inquiry': ['information', 'details', 'learn']
      },
      general: {
        'how_to': ['how to', 'help', 'tutorial'],
        'account_access': ['login', 'password', 'access'],
        'general_support': ['help', 'support', 'question']
      }
    };
    
    const deptCategories = categories[department as keyof typeof categories] || categories.general;
    
    for (const [category, keywords] of Object.entries(deptCategories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }
}

// Priority Router
class PriorityRoutingAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const ticket = input.data;
    const { classification } = ticket;
    
    const routingDecision = this.determineRouting(classification, ticket.customer);
    
    return {
      data: {
        ...ticket,
        routing: routingDecision,
        routedAt: new Date().toISOString()
      }
    };
  }
  
  private determineRouting(classification: TicketClassification, customer: SupportTicket['customer']): any {
    const isHighPriority = classification.severity === 'critical' || 
                          classification.urgency === 'urgent' ||
                          customer.tier === 'enterprise';
    
    const isAutomatable = classification.confidence > 0.8 && 
                         classification.severity !== 'critical' &&
                         ['general', 'billing'].includes(classification.department);
    
    if (isHighPriority) {
      return {
        type: 'human_agent',
        queue: 'priority',
        sla: 15, // minutes
        autoEscalate: true
      };
    } else if (isAutomatable) {
      return {
        type: 'automated',
        queue: 'automation',
        sla: 60, // minutes
        fallbackToHuman: true
      };
    } else {
      return {
        type: 'human_agent',
        queue: 'standard',
        sla: 240, // minutes
        autoEscalate: false
      };
    }
  }
}

// Automated Response Agent
class AutomatedResponseAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const ticket = input.data;
    
    if (ticket.routing.type !== 'automated') {
      return {
        data: {
          ...ticket,
          response: null,
          escalated: true,
          escalatedAt: new Date().toISOString()
        }
      };
    }
    
    const response = this.generateResponse(ticket);
    
    return {
      data: {
        ...ticket,
        response,
        resolve: response.responseType === 'resolve',
        respondedAt: new Date().toISOString()
      }
    };
  }
  
  private generateResponse(ticket: SupportTicket): SupportResponse {
    const { classification } = ticket;
    const templates = this.getResponseTemplates();
    
    const template = templates[classification.department]?.[classification.category] || 
                    templates.general.default;
    
    const response = template.replace('{customerName}', ticket.customer.name)
                            .replace('{ticketId}', ticket.id)
                            .replace('{subject}', ticket.subject);
    
    return {
      ticketId: ticket.id,
      response,
      responseType: this.canResolveAutomatically(classification) ? 'resolve' : 'escalated',
      nextSteps: this.getNextSteps(classification),
      estimatedResolutionTime: this.getEstimatedResolutionTime(classification),
      assignedAgent: classification.severity === 'critical' ? 'human_agent' : undefined
    };
  }
  
  private getResponseTemplates(): Record<string, Record<string, string>> {
    return {
      technical: {
        bug_report: `Hello {customerName},

Thank you for reporting this issue (Ticket #{ticketId}). We've received your bug report regarding "{subject}" and our technical team is investigating.

Here are some immediate troubleshooting steps you can try:
1. Clear your browser cache and cookies
2. Disable browser extensions temporarily
3. Try using a different browser or incognito mode

If these steps don't resolve the issue, we'll escalate to our development team. We'll keep you updated on our progress.

Best regards,
Support Team`,
        
        feature_request: `Hello {customerName},

Thank you for your feature request (Ticket #{ticketId}). We appreciate your feedback about "{subject}".

We've added your request to our product roadmap for consideration. Our product team reviews all feature requests quarterly and prioritizes them based on customer impact and technical feasibility.

You can track the status of feature requests in our public roadmap at: https://roadmap.example.com

Best regards,
Support Team`
      },
      
      billing: {
        payment_issue: `Hello {customerName},

Thank you for contacting us about your payment issue (Ticket #{ticketId}).

Common solutions for payment problems:
1. Verify your payment method is up to date
2. Check if your card has sufficient funds
3. Ensure your billing address matches your bank records

If you continue to experience issues, please reply with:
- Last 4 digits of your payment method
- Billing address on file
- Error message you're seeing

We'll resolve this promptly.

Best regards,
Billing Team`,
        
        refund_request: `Hello {customerName},

We've received your refund request (Ticket #{ticketId}) for "{subject}".

Our refund policy allows for returns within 30 days of purchase. We'll review your request and process it according to our terms of service.

Expected processing time: 3-5 business days
Refund method: Original payment method

You'll receive a confirmation email once the refund is processed.

Best regards,
Billing Team`
      },
      
      general: {
        how_to: `Hello {customerName},

Thank you for your question (Ticket #{ticketId}). We're happy to help you with "{subject}".

You can find detailed guides and tutorials in our help center: https://help.example.com

For immediate assistance, you can also:
1. Check our FAQ section
2. Watch our video tutorials
3. Join our community forum

If you need further assistance, please don't hesitate to reach out.

Best regards,
Support Team`,
        
        default: `Hello {customerName},

Thank you for contacting us (Ticket #{ticketId}). We've received your inquiry about "{subject}".

Our support team is reviewing your request and will respond within our standard SLA timeframe. We appreciate your patience.

If this is urgent, please call our priority support line at 1-800-XXX-XXXX.

Best regards,
Support Team`
      }
    };
  }
  
  private canResolveAutomatically(classification: TicketClassification): boolean {
    const autoResolvableCategories = [
      'how_to',
      'general_inquiry',
      'pricing_inquiry'
    ];
    
    return autoResolvableCategories.includes(classification.category) &&
           classification.severity !== 'critical';
  }
  
  private getNextSteps(classification: TicketClassification): string[] {
    const steps = {
      technical: [
        'Monitor for customer response',
        'Follow up if no response in 24 hours',
        'Escalate to L2 support if unresolved'
      ],
      billing: [
        'Wait for customer information',
        'Process refund if applicable',
        'Update billing records'
      ],
      sales: [
        'Schedule demo if requested',
        'Provide pricing information',
        'Follow up with sales team'
      ],
      general: [
        'Provide additional resources',
        'Follow up for satisfaction',
        'Close ticket if resolve'
      ]
    };
    
    return steps[classification.department] || steps.general;
  }
  
  private getEstimatedResolutionTime(classification: TicketClassification): number {
    const times = {
      critical: 15,   // minutes
      high: 60,       // minutes
      medium: 240,    // minutes
      low: 1440       // minutes (24 hours)
    };
    
    return times[classification.severity] || times.medium;
  }
}

// Knowledge Base Agent
class KnowledgeBaseAgent extends BaseAgent {
  async execute(input: any): Promise<any> {
    const ticket = input.data;
    
    const articles = this.searchKnowledgeBase(ticket.subject, ticket.message);
    
    return {
      data: {
        ...ticket,
        suggestedArticles: articles,
        searchedAt: new Date().toISOString()
      }
    };
  }
  
  private searchKnowledgeBase(subject: string, message: string): any[] {
    const query = `${subject} ${message}`.toLowerCase();
    
    // Mock knowledge base articles
    const articles = [
      {
        id: 'kb-001',
        title: 'How to Reset Your Password',
        excerpt: 'Step-by-step guide to reset your account password',
        relevance: this.calculateRelevance(query, 'password reset login access'),
        url: 'https://help.example.com/password-reset'
      },
      {
        id: 'kb-002',
        title: 'Troubleshooting Payment Issues',
        excerpt: 'Common solutions for payment and billing problems',
        relevance: this.calculateRelevance(query, 'payment billing credit card issue'),
        url: 'https://help.example.com/payment-troubleshooting'
      },
      {
        id: 'kb-003',
        title: 'API Integration Guide',
        excerpt: 'In Progress guide to integrating with our API',
        relevance: this.calculateRelevance(query, 'api integration webhook development'),
        url: 'https://help.example.com/api-integration'
      }
    ];
    
    return articles
      .filter(article => article.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
  }
  
  private calculateRelevance(query: string, articleKeywords: string): number {
    const queryWords = query.split(/\s+/);
    const keywordWords = articleKeywords.split(/\s+/);
    
    const matches = queryWords.filter(word => keywordWords.includes(word));
    return matches.length / queryWords.length;
  }
}

// Create the customer support workflow
export function createCustomerSupportWorkflow(): PocketFlow {
  return new PocketFlow()
    // Input stage
    .addNode('input', nodes.input('supportTicket'))
    
    // Classification and routing
    .addNode('classify', new TicketClassificationAgent())
    .addNode('route', new PriorityRoutingAgent())
    
    // Parallel processing for automation and knowledge base
    .addNode('fork', nodes.fork(['automate', 'knowledge']))
    .addNode('automate', new AutomatedResponseAgent())
    .addNode('knowledge', new KnowledgeBaseAgent())
    
    // Combine results
    .addNode('join', nodes.join({
      combiner: (results: any) => ({
        ...results.automate,
        knowledgeBaseResults: results.knowledge.suggestedArticles,
        processingComplete: true,
        processedAt: new Date().toISOString()
      })
    }))
    
    // Output stage
    .addNode('output', nodes.output('processedTicket'))
    
    // Connect nodes
    .connect('input', 'classify')
    .connect('classify', 'route')
    .connect('route', 'fork')
    .connect('fork', 'automate')
    .connect('fork', 'knowledge')
    .connect('automate', 'join')
    .connect('knowledge', 'join')
    .connect('join', 'output');
}

// Example usage
export async function runCustomerSupportExample() {
  const workflow = createCustomerSupportWorkflow();
  
  const tickets: SupportTicket[] = [
    {
      id: 'T-001',
      customer: {
        id: 'C-001',
        email: 'john.doe@startup.com',
        name: 'John Doe',
        tier: 'basic'
      },
      subject: 'How to reset my password',
      message: 'I forgot my password and cannot access my account. Please help.',
      priority: 'medium',
      timestamp: new Date().toISOString()
    },
    {
      id: 'T-002',
      customer: {
        id: 'C-002',
        email: 'jane.smith@enterprise.com',
        name: 'Jane Smith',
        tier: 'enterprise'
      },
      subject: 'Critical bug in production API',
      message: 'Our production API is returning 500 errors for all requests. This is causing major issues for our customers.',
      priority: 'urgent',
      timestamp: new Date().toISOString()
    },
    {
      id: 'T-003',
      customer: {
        id: 'C-003',
        email: 'bob.wilson@company.com',
        name: 'Bob Wilson',
        tier: 'premium'
      },
      subject: 'Billing question about invoice',
      message: 'I have a question about my latest invoice. There seems to be a charge I do not recognize.',
      priority: 'low',
      timestamp: new Date().toISOString()
    }
  ];
  
  console.log('Processing support tickets...\n');
  
  for (const ticket of tickets) {
    console.log(`\n=== Processing Ticket ${ticket.id} ===`);
    console.log(`Customer: ${ticket.customer.name} (${ticket.customer.tier})`);
    console.log(`Subject: ${ticket.subject}`);
    console.log(`Priority: ${ticket.priority}`);
    
    try {
      const result = await workflow.execute(ticket);
      const processed = result.data;
      
      console.log(`\nClassification:`);
      console.log(`- Department: ${processed.classification.department}`);
      console.log(`- Category: ${processed.classification.category}`);
      console.log(`- Severity: ${processed.classification.severity}`);
      console.log(`- Confidence: ${processed.classification.confidence}`);
      
      console.log(`\nRouting:`);
      console.log(`- Type: ${processed.routing.type}`);
      console.log(`- Queue: ${processed.routing.queue}`);
      console.log(`- SLA: ${processed.routing.sla} minutes`);
      
      if (processed.response) {
        console.log(`\nResponse Type: ${processed.response.responseType}`);
        console.log(`Est. Resolution: ${processed.response.estimatedResolutionTime} minutes`);
        console.log(`resolve: ${processed.resolve ? 'Yes' : 'No'}`);
        
        if (processed.response.responseType === 'resolve') {
          console.log(`\nGenerated Response:`);
          console.log(processed.response.response);
        }
      }
      
      if (processed.knowledgeBaseResults?.length > 0) {
        console.log(`\nSuggested Articles:`);
        processed.knowledgeBaseResults.forEach((article: any, index: number) => {
          console.log(`${index + 1}. ${article.title} (${(article.relevance * 100).toFixed(1)}% relevant)`);
        });
      }
      
    } catch (error) {
      console.error(`Failed to process ticket ${ticket.id}:`, error.message);
    }
  }
}

// Performance metrics example
export async function measureSupportWorkflowPerformance() {
  const workflow = createCustomerSupportWorkflow();
  
  // Generate test tickets
  const testTickets = Array.from({ length: 50 }, (_, i) => ({
    id: `T-${String(i + 1).padStart(3, '0')}`,
    customer: {
      id: `C-${i + 1}`,
      email: `customer${i + 1}@example.com`,
      name: `Customer ${i + 1}`,
      tier: ['basic', 'premium', 'enterprise'][i % 3] as 'basic' | 'premium' | 'enterprise'
    },
    subject: [
      'Password reset help',
      'Billing question',
      'API integration issue',
      'Bug report',
      'Feature request'
    ][i % 5],
    message: `Test message for ticket ${i + 1}`,
    priority: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high',
    timestamp: new Date().toISOString()
  }));
  
  console.log(`\n=== Performance Test: ${testTickets.length} tickets ===`);
  
  const startTime = Date.now();
  
  // Process all tickets in parallel
  const results = await Promise.all(
    testTickets.map(ticket => workflow.execute(ticket))
  );
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Analyze results
  const stats = {
    totalTickets: results.length,
    processingTime: duration,
    averagePerTicket: duration / results.length,
    
    // Classification stats
    departments: {} as Record<string, number>,
    automated: 0,
    escalated: 0,
    resolve: 0,
    
    // Customer tier stats
    tierStats: {} as Record<string, number>
  };
  
  results.forEach(result => {
    const data = result.data;
    
    // Department distribution
    const dept = data.classification.department;
    stats.departments[dept] = (stats.departments[dept] || 0) + 1;
    
    // Automation stats
    if (data.routing.type === 'automated') stats.automated++;
    else stats.escalated++;
    
    if (data.resolve) stats.resolve++;
    
    // Customer tier stats
    const tier = data.customer.tier;
    stats.tierStats[tier] = (stats.tierStats[tier] || 0) + 1;
  });
  
  console.log(`\nPerformance Results:`);
  console.log(`- Total processing time: ${duration}ms`);
  console.log(`- Average per ticket: ${stats.averagePerTicket.toFixed(1)}ms`);
  console.log(`- Throughput: ${(stats.totalTickets / (duration / 1000)).toFixed(1)} tickets/sec`);
  
  console.log(`\nAutomation Results:`);
  console.log(`- Automated: ${stats.automated} (${(stats.automated / stats.totalTickets * 100).toFixed(1)}%)`);
  console.log(`- Escalated: ${stats.escalated} (${(stats.escalated / stats.totalTickets * 100).toFixed(1)}%)`);
  console.log(`- resolve: ${stats.resolve} (${(stats.resolve / stats.totalTickets * 100).toFixed(1)}%)`);
  
  console.log(`\nDepartment Distribution:`);
  Object.entries(stats.departments).forEach(([dept, count]) => {
    console.log(`- ${dept}: ${count} (${(count / stats.totalTickets * 100).toFixed(1)}%)`);
  });
}

// If running directly
if (require.main === module) {
  (async () => {
    await runCustomerSupportExample();
    await measureSupportWorkflowPerformance();
  })();
}