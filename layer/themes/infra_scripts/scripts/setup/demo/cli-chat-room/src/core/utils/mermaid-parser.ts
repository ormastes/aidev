/**
 * Mermaid Sequence Diagram Parser
 * Extracts external access information from sequence diagrams
 */

export interface SequenceDiagramParticipant {
  name: string;
  alias: string;
  isExternal: boolean;
}

export interface SequenceDiagramMessage {
  from: string;
  to: string;
  message: string;
  type: 'sync' | 'async' | 'return';
  isExternalCall: boolean;
}

export interface ParsedSequenceDiagram {
  id: string;
  participants: SequenceDiagramParticipant[];
  messages: SequenceDiagramMessage[];
  externalCalls: string[];
}

export class MermaidParser {
  /**
   * Parse a Mermaid sequence diagram
   */
  static parseSequenceDiagram(content: string, diagramId: string): ParsedSequenceDiagram {
    const participants = this.parseParticipants(content);
    const messages = this.parseMessages(content, participants);
    const externalCalls = this.extractExternalCalls(participants, messages);

    return {
      id: diagramId,
      participants,
      messages,
      externalCalls
    };
  }

  /**
   * Parse participant declarations
   */
  private static parseParticipants(content: string): SequenceDiagramParticipant[] {
    const participants: SequenceDiagramParticipant[] = [];
    
    // Match participant declarations
    const participantRegex = /participant\s+(\w+)(?:\s+as\s+([^\n]+))?/g;
    let match;
    
    while ((match = participantRegex.exec(content)) !== null) {
      const name = match[1];
      const alias = match[2] || name;
      const isExternal = alias.startsWith('ext_') || alias.includes('External');
      
      participants.push({
        name,
        alias: alias.trim(),
        isExternal
      });
    }

    // Also match actor declarations
    const actorRegex = /actor\s+(\w+)(?:\s+as\s+([^\n]+))?/g;
    while ((match = actorRegex.exec(content)) !== null) {
      const name = match[1];
      const alias = match[2] || name;
      
      participants.push({
        name,
        alias: alias.trim(),
        isExternal: false
      });
    }

    return participants;
  }

  /**
   * Parse message flows
   */
  private static parseMessages(
    content: string, 
    participants: SequenceDiagramParticipant[]
  ): SequenceDiagramMessage[] {
    const messages: SequenceDiagramMessage[] = [];
    
    // Match different message types
    const messagePatterns = [
      // Sync call: A->>B: message
      { regex: /(\w+)->>(\w+):\s*(.+)/g, type: 'sync' as const },
      // Async call: A-)B: message  
      { regex: /(\w+)-\)(\w+):\s*(.+)/g, type: 'async' as const },
      // Return: A-->>B: message
      { regex: /(\w+)-->>(\w+):\s*(.+)/g, type: 'return' as const },
    ];

    for (const pattern of messagePatterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const from = match[1];
        const to = match[2];
        const message = match[3].trim();
        
        // Check if this is an external call
        const toParticipant = participants.find(p => p.name === to);
        const isExternalCall = toParticipant?.isExternal || false;
        
        messages.push({
          from,
          to,
          message,
          type: pattern.type,
          isExternalCall
        });
      }
    }

    return messages;
  }

  /**
   * Extract external call function names
   */
  private static extractExternalCalls(
    participants: SequenceDiagramParticipant[],
    messages: SequenceDiagramMessage[]
  ): string[] {
    const externalCalls = new Set<string>();

    // Get external participants
    const externalParticipants = participants
      .filter(p => p.isExternal)
      .map(p => p.name);

    // Find messages to external participants
    messages.forEach(msg => {
      if (externalParticipants.includes(msg.to)) {
        // Extract function name from message
        const functionMatch = msg.message.match(/(\w+)\(/);
        if (functionMatch) {
          externalCalls.add(functionMatch[1]);
        } else if (msg.message.startsWith('ext_')) {
          // Direct external function reference
          const funcName = msg.message.split('(')[0].trim();
          externalCalls.add(funcName);
        }
      }
    });

    // Also check participant aliases
    participants
      .filter(p => p.isExternal && p.alias.startsWith('ext_'))
      .forEach(p => externalCalls.add(p.alias));

    return Array.from(externalCalls);
  }

  /**
   * Validate if actual external calls match diagram expectations
   */
  static validateExternalCalls(
    diagram: ParsedSequenceDiagram,
    actualCalls: string[]
  ): {
    matched: boolean;
    expected: string[];
    actual: string[];
    missing: string[];
    unexpected: string[];
  } {
    const expected = diagram.externalCalls;
    const missing = expected.filter(e => !actualCalls.includes(e));
    const unexpected = actualCalls.filter(a => !expected.includes(a));

    return {
      matched: missing.length === 0 && unexpected.length === 0,
      expected,
      actual: actualCalls,
      missing,
      unexpected
    };
  }
}

// Example usage:
/*
const diagramContent = `
sequenceDiagram
    participant Client
    participant Server
    participant DB as ext_database_query
    participant API as ext_http_request
    
    Client->>Server: Login Request
    Server->>DB: ext_database_query(getUserByEmail)
    DB-->>Server: User Data
    Server->>API: ext_http_request(validateToken)
    API-->>Server: Token Valid
    Server-->>Client: Login In Progress
`;

const parsed = MermaidParser.parseSequenceDiagram(diagramContent, 'SD001');
console.log(parsed.externalCalls); // ['ext_database_query', 'ext_http_request']
*/