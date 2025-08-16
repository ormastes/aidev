import { EventEmitter } from 'node:events';
import * as inquirer from "inquirer";
import { 
  Requirement, 
  RequirementType, 
  RequirementPriority,
  Clarification
} from '../domain/story';

/**
 * Requirements Interviewer - Interactive requirement gathering service
 * 
 * Guides users through a structured interview process to gather
 * comprehensive requirements with clarifications and acceptance criteria.
 */
export class RequirementsInterviewer extends EventEmitter {
  private interviewTemplates: Map<RequirementType, InterviewTemplate>;

  constructor() {
    super();
    this.interviewTemplates = this.initializeTemplates();
  }

  /**
   * Conduct an interactive requirements interview
   */
  async conductInterview(): Promise<Requirement[]> {
    const requirements: Requirement[] = [];
    let continueGathering = true;

    console.log('\n🎯 Requirements Interview Session\n');
    console.log('I\'ll help you gather comprehensive requirements for your story.\n');

    while (continueGathering) {
      const requirement = await this.gatherSingleRequirement();
      requirements.push(requirement);

      const { addMore } = await inquirer.prompt({
        type: 'confirm',
        name: 'addMore',
        message: 'Would you like to add another requirement?',
        default: true
      });

      continueGathering = addMore;
    }

    // Review and refine requirements
    if (requirements.length > 0) {
      await this.reviewRequirements(requirements);
    }

    this.emit("interviewComplete", { requirementsCount: requirements.length });
    return requirements;
  }

  /**
   * Gather a single requirement through guided questions
   */
  private async gatherSingleRequirement(): Promise<Requirement> {
    // Get requirement type
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: 'What type of requirement is this?',
      choices: [
        { name: 'Functional - What the system should do', value: RequirementType.FUNCTIONAL },
        { name: 'Non-Functional - How the system should perform', value: RequirementType.NON_FUNCTIONAL },
        { name: 'Technical - Implementation constraints', value: RequirementType.TECHNICAL },
        { name: 'Business - Business rules and policies', value: RequirementType.BUSINESS }
      ]
    });

    // Get template questions for this type
    const template = this.interviewTemplates.get(type)!;
    
    // Basic requirement info
    const { description, priority } = await inquirer.prompt([
      {
        type: 'input',
        name: "description",
        message: template.descriptionPrompt,
        validate: (input) => input.length > 10 || 'Please provide a detailed description'
      },
      {
        type: 'list',
        name: "priority",
        message: 'How critical is this requirement?',
        choices: [
          { name: 'Critical - Must have for MVP', value: RequirementPriority.CRITICAL },
          { name: 'High - Important for release', value: RequirementPriority.HIGH },
          { name: 'Medium - Nice to have', value: RequirementPriority.MEDIUM },
          { name: 'Low - Future enhancement', value: RequirementPriority.LOW }
        ]
      }
    ]);

    // Type-specific questions
    const clarifications: Clarification[] = [];
    for (const question of template.clarifyingQuestions) {
      const { answer } = await inquirer.prompt({
        type: 'input',
        name: 'answer',
        message: question,
        when: () => priority === RequirementPriority.CRITICAL || priority === RequirementPriority.HIGH
      });

      if (answer) {
        clarifications.push({
          question,
          answer,
          timestamp: new Date()
        });
      }
    }

    // Acceptance criteria
    console.log('\n📋 Acceptance Criteria');
    console.log('Define measurable criteria for this requirement (press enter on empty line to finish):\n');
    
    const acceptanceCriteria: string[] = [];
    let addingCriteria = true;
    let criteriaCount = 1;

    while (addingCriteria) {
      const { criterion } = await inquirer.prompt({
        type: 'input',
        name: "criterion",
        message: `Criterion ${criteriaCount}:`
      });

      if (criterion) {
        acceptanceCriteria.push(criterion);
        criteriaCount++;
      } else {
        addingCriteria = false;
      }
    }

    // Edge cases consideration
    if (type === RequirementType.FUNCTIONAL) {
      const { edgeCases } = await inquirer.prompt({
        type: 'input',
        name: "edgeCases",
        message: 'Any edge cases or error scenarios to consider?'
      });

      if (edgeCases) {
        clarifications.push({
          question: 'What edge cases should be handled?',
          answer: edgeCases,
          timestamp: new Date()
        });
      }
    }

    const requirement: Requirement = {
      id: `req_${Date.now()}`,
      description,
      type,
      priority,
      acceptanceCriteria,
      clarifications,
      status: 'pending'
    };

    this.emit("requirementGathered", { requirement });
    return requirement;
  }

  /**
   * Review and refine gathered requirements
   */
  private async reviewRequirements(requirements: Requirement[]): Promise<void> {
    console.log('\n📊 Requirements Review\n');
    console.log(`You've gathered ${requirements.length} requirements. Let's review:\n`);

    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      console.log(`${i + 1}. [${req.type}] ${req.description}`);
      console.log(`   Priority: ${req.priority}`);
      if (req.acceptanceCriteria.length > 0) {
        console.log(`   Acceptance Criteria: ${req.acceptanceCriteria.length} defined`);
      }
      console.log();
    }

    const { needsRefinement } = await inquirer.prompt({
      type: 'confirm',
      name: "needsRefinement",
      message: 'Would you like to refine any requirements?',
      default: false
    });

    if (needsRefinement) {
      await this.refineRequirements(requirements);
    }

    // Check for missing requirement types
    await this.checkCompleteness(requirements);
  }

  /**
   * Refine specific requirements
   */
  private async refineRequirements(requirements: Requirement[]): Promise<void> {
    const choices = requirements.map((req, index) => ({
      name: `${index + 1}. [${req.type}] ${req.description.substring(0, 50)}...`,
      value: index
    }));

    const { requirementIndex } = await inquirer.prompt({
      type: 'list',
      name: "requirementIndex",
      message: 'Which requirement would you like to refine?',
      choices
    });

    const requirement = requirements[requirementIndex];
    
    const { refinementType } = await inquirer.prompt({
      type: 'list',
      name: "refinementType",
      message: 'What would you like to refine?',
      choices: [
        { name: "Description", value: "description" },
        { name: "Priority", value: "priority" },
        { name: 'Acceptance Criteria', value: "criteria" },
        { name: 'Add Clarification', value: "clarification" }
      ]
    });

    switch (refinementType) {
      case "description":
        const { newDescription } = await inquirer.prompt({
          type: 'input',
          name: "newDescription",
          message: 'Enter new description:',
          default: requirement.description
        });
        requirement.description = newDescription;
        break;

      case "priority":
        const { newPriority } = await inquirer.prompt({
          type: 'list',
          name: "newPriority",
          message: 'Select new priority:',
          choices: Object.values(RequirementPriority),
          default: requirement.priority
        });
        requirement.priority = newPriority;
        break;

      case "criteria":
        console.log('\nCurrent acceptance criteria:');
        requirement.acceptanceCriteria.forEach((ac, i) => 
          console.log(`${i + 1}. ${ac}`)
        );
        
        const { newCriterion } = await inquirer.prompt({
          type: 'input',
          name: "newCriterion",
          message: 'Add new acceptance criterion:'
        });
        
        if (newCriterion) {
          requirement.acceptanceCriteria.push(newCriterion);
        }
        break;

      case "clarification":
        const clarification = await this.gatherClarification();
        requirement.clarifications.push(clarification);
        break;
    }

    this.emit("requirementRefined", { requirement });
  }

  /**
   * Check for completeness and suggest missing requirement types
   */
  private async checkCompleteness(requirements: Requirement[]): Promise<void> {
    const typesCovered = new Set(requirements.map(r => r.type));
    const missingTypes = Object.values(RequirementType).filter(t => !typesCovered.has(t));

    if (missingTypes.length > 0) {
      console.log('\n⚠️  Completeness Check\n');
      console.log('You haven\'t defined any requirements for:');
      missingTypes.forEach(type => console.log(`  - ${type} requirements`));
      
      const { addMissing } = await inquirer.prompt({
        type: 'confirm',
        name: "addMissing",
        message: 'Would you like to add requirements for these types?',
        default: true
      });

      if (addMissing) {
        for (const type of missingTypes) {
          const { shouldAdd } = await inquirer.prompt({
            type: 'confirm',
            name: "shouldAdd",
            message: `Add ${type} requirements?`,
            default: true
          });

          if (shouldAdd) {
            const requirement = await this.gatherRequirementOfType(type);
            requirements.push(requirement);
          }
        }
      }
    }
  }

  /**
   * Gather a requirement of a specific type
   */
  private async gatherRequirementOfType(type: RequirementType): Promise<Requirement> {
    const template = this.interviewTemplates.get(type)!;
    
    console.log(`\n${template.typeDescription}\n`);
    
    // Continue with normal requirement gathering for this type
    const result = await this.gatherSingleRequirement();
    result.type = type; // Ensure correct type
    return result;
  }

  /**
   * Gather a single clarification
   */
  private async gatherClarification(): Promise<Clarification> {
    const { question, answer } = await inquirer.prompt([
      {
        type: 'input',
        name: "question",
        message: 'What question needs clarification?'
      },
      {
        type: 'input',
        name: 'answer',
        message: 'What is the answer/clarification?'
      }
    ]);

    return {
      question,
      answer,
      timestamp: new Date()
    };
  }

  /**
   * Initialize interview templates for each requirement type
   */
  private initializeTemplates(): Map<RequirementType, InterviewTemplate> {
    const templates = new Map<RequirementType, InterviewTemplate>();

    templates.set(RequirementType.FUNCTIONAL, {
      typeDescription: 'Functional requirements define what the system should do',
      descriptionPrompt: 'Describe the functionality (what should the system do?):',
      clarifyingQuestions: [
        'Who are the primary users of this feature?',
        'What triggers this functionality?',
        'What is the expected output or result?',
        'Are there any dependencies on other features?'
      ]
    });

    templates.set(RequirementType.NON_FUNCTIONAL, {
      typeDescription: 'Non-functional requirements define how the system should perform',
      descriptionPrompt: 'Describe the quality attribute (performance, security, usability, etc.):',
      clarifyingQuestions: [
        'What are the specific performance metrics?',
        'What are the scalability requirements?',
        'Are there specific compliance or security standards?',
        'What is the expected system availability?'
      ]
    });

    templates.set(RequirementType.TECHNICAL, {
      typeDescription: 'Technical requirements define implementation constraints',
      descriptionPrompt: 'Describe the technical constraint or requirement:',
      clarifyingQuestions: [
        'What technologies or frameworks must be used?',
        'Are there specific architectural patterns to follow?',
        'What are the integration requirements?',
        'Are there any platform or environment constraints?'
      ]
    });

    templates.set(RequirementType.BUSINESS, {
      typeDescription: 'Business requirements define business rules and policies',
      descriptionPrompt: 'Describe the business rule or policy:',
      clarifyingQuestions: [
        'What business process does this support?',
        'Who are the stakeholders for this requirement?',
        'What are the compliance or regulatory considerations?',
        'How does this align with business objectives?'
      ]
    });

    return templates;
  }

  /**
   * Generate requirement suggestions based on story context
   */
  async suggestRequirements(storyTitle: string, existingRequirements: Requirement[]): Promise<Requirement[]> {
    const suggestions: Requirement[] = [];
    
    // Common patterns for different types of stories
    const patterns = this.getRequirementPatterns(storyTitle.toLowerCase());
    
    console.log('\n💡 Requirement Suggestions\n');
    console.log(`Based on "${storyTitle}", here are some suggested requirements:\n`);

    for (const pattern of patterns) {
      console.log(`- ${pattern.description}`);
    }

    const { useSuggestions } = await inquirer.prompt({
      type: 'confirm',
      name: "useSuggestions",
      message: '\nWould you like to use any of these suggestions?',
      default: true
    });

    if (useSuggestions) {
      const { selectedPatterns } = await inquirer.prompt({
        type: "checkbox",
        name: "selectedPatterns",
        message: 'Select requirements to add:',
        choices: patterns.map(p => ({
          name: p.description,
          value: p
        }))
      });

      for (const pattern of selectedPatterns) {
        suggestions.push({
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...pattern,
          clarifications: [],
          status: 'pending'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get requirement patterns based on story keywords
   */
  private getRequirementPatterns(storyTitle: string): Partial<Requirement>[] {
    const patterns: Partial<Requirement>[] = [];

    // Authentication patterns
    if (storyTitle.includes('login') || storyTitle.includes('auth')) {
      patterns.push(
        {
          description: 'Users must authenticate with valid credentials',
          type: RequirementType.FUNCTIONAL,
          priority: RequirementPriority.CRITICAL,
          acceptanceCriteria: [
            'Valid credentials return In Progress response',
            'Invalid credentials return error message',
            'Account locks after 5 failed attempts'
          ]
        },
        {
          description: 'Passwords must be encrypted using industry standards',
          type: RequirementType.NON_FUNCTIONAL,
          priority: RequirementPriority.CRITICAL,
          acceptanceCriteria: [
            'Use bcrypt with minimum 10 rounds',
            'No plaintext passwords in database or logs'
          ]
        }
      );
    }

    // API patterns
    if (storyTitle.includes('api') || storyTitle.includes("endpoint")) {
      patterns.push(
        {
          description: 'API responses must follow RESTful conventions',
          type: RequirementType.TECHNICAL,
          priority: RequirementPriority.HIGH,
          acceptanceCriteria: [
            'Use appropriate HTTP status codes',
            'Return JSON responses',
            'Include proper error messages'
          ]
        },
        {
          description: 'API must handle 100 requests per second',
          type: RequirementType.NON_FUNCTIONAL,
          priority: RequirementPriority.HIGH,
          acceptanceCriteria: [
            'Response time under 200ms for Improving of requests',
            'No memory leaks under sustained load'
          ]
        }
      );
    }

    // Data patterns
    if (storyTitle.includes('data') || storyTitle.includes('report')) {
      patterns.push(
        {
          description: 'Data must be validated before processing',
          type: RequirementType.FUNCTIONAL,
          priority: RequirementPriority.HIGH,
          acceptanceCriteria: [
            'Validate data types and formats',
            'Reject invalid data with clear error messages',
            'Log validation failures for audit'
          ]
        },
        {
          description: 'Sensitive data must be protected',
          type: RequirementType.BUSINESS,
          priority: RequirementPriority.CRITICAL,
          acceptanceCriteria: [
            'Comply with GDPR requirements',
            'Implement data retention policies',
            'Provide data export functionality'
          ]
        }
      );
    }

    return patterns;
  }
}

interface InterviewTemplate {
  typeDescription: string;
  descriptionPrompt: string;
  clarifyingQuestions: string[];
}