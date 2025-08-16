/**
 * GUI Coordinator Agent
 * Manages 4-agent GUI generation process
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';
import { MCPConnection } from '../../server/mcp-connection';

export class GUICoordinatorAgent extends Agent {
  private mcpConnection?: MCPConnection;

  constructor(id?: string) {
    const capabilities: AgentCapability[] = [
      {
        name: 'multi_agent_coordination',
        description: 'Coordinate 4 agents for GUI generation',
        enabled: true
      },
      {
        name: 'design_generation',
        description: 'Generate multiple GUI design candidates',
        enabled: true
      },
      {
        name: 'web_selection_ui',
        description: 'Create web-based selection interface',
        enabled: true
      },
      {
        name: 'ascii_sketching',
        description: 'Create ASCII layout sketches',
        enabled: true
      }
    ];

    super({
      id: id || `gui-coordinator-${Date.now()}`,
      role: {
        ...AGENT_ROLES.ARCHITECT,
        name: 'gui-coordinator',
        description: 'GUI generation and coordination specialist',
        systemPrompt: `You are the GUI Coordinator responsible for managing the 4-agent GUI generation process.

Process:
1. Analyze feature requirements for UI needs
2. Create ASCII sketches showing layout concepts
3. Generate 4 design candidates (Modern/Professional/Creative/Accessible)
4. Present web-based selection at http://localhost:3456
5. Save to review folders for iteration`
      },
      capabilities
    });
  }

  setMCPConnection(connection: MCPConnection): void {
    this.mcpConnection = connection;
  }

  async generateGUIDesigns(featureName: string, requirements: string[]): Promise<{
    asciiSketch: string;
    designs: Array<{
      style: string;
      preview: string;
      description: string;
    }>;
    selectionUrl: string;
  }> {
    const asciiSketch = this.createAsciiSketch(featureName, requirements);
    const designs = this.generate4Designs(featureName, asciiSketch);
    const selectionUrl = await this.deploySelectionUI(designs);

    return {
      asciiSketch,
      designs,
      selectionUrl
    };
  }

  private createAsciiSketch(featureName: string, requirements: string[]): string {
    return `
┌─────────────────────────────────────┐
│  ${featureName} UI Layout              │
├─────────────────────────────────────┤
│  ┌─────────┐  ┌─────────────────┐  │
│  │ Sidebar │  │   Main Content  │  │
│  │         │  │                 │  │
│  │ • Nav 1 │  │  [Input Field]  │  │
│  │ • Nav 2 │  │                 │  │
│  │ • Nav 3 │  │  [Button] [Btn] │  │
│  └─────────┘  └─────────────────┘  │
├─────────────────────────────────────┤
│  Status Bar                         │
└─────────────────────────────────────┘`;
  }

  private generate4Designs(featureName: string, sketch: string): any[] {
    return [
      {
        style: 'Modern',
        preview: 'Clean lines, minimal colors, flat design',
        description: 'Contemporary look with focus on usability'
      },
      {
        style: 'Professional',
        preview: 'Corporate colors, structured layout',
        description: 'Business-oriented design with formal elements'
      },
      {
        style: 'Creative',
        preview: 'Bold colors, unique layouts, animations',
        description: 'Artistic approach with visual appeal'
      },
      {
        style: 'Accessible',
        preview: 'High contrast, large text, clear navigation',
        description: 'Optimized for accessibility and readability'
      }
    ];
  }

  private async deploySelectionUI(designs: any[]): Promise<string> {
    // Would deploy actual selection UI
    return 'http://localhost:3456/select/' + Date.now();
  }
}