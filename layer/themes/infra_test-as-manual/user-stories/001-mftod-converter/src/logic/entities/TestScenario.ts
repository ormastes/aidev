/**
 * Test Scenario Entity - Core domain model for test scenarios
 */

export interface TestScenario {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  steps: TestStep[];
  examples?: ScenarioExample[];
  parent?: string; // Parent scenario ID
  children: string[]; // Child scenario IDs
  isLeaf: boolean;
  isStartup: boolean;
  externalInteractions: ExternalInteraction[];
}

export interface TestStep {
  id: string;
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  isHidden?: boolean; // [hidden] steps
  isCause?: boolean; // CAUSE: statements
  argument?: StepArgument;
  order: number;
}

export interface StepArgument {
  type: 'docString' | 'dataTable';
  content: string | DataTable;
}

export interface DataTable {
  headers: string[];
  rows: string[][];
}

export interface ScenarioExample {
  name?: string;
  headers: string[];
  rows: string[][];
}

export interface ExternalInteraction {
  type: 'cause' | 'hidden';
  description: string;
  stepId: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  scenarios: TestScenario[];
  commonScenarios: string[]; // IDs of common scenarios
  sequences: TestSequence[];
}

export interface TestSequence {
  id: string;
  name: string;
  scenarioIds: string[];
  isMainFlow: boolean;
}