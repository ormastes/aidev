/**
 * Mobile Automation Agent
 * iOS/Android testing specialist
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class MobileAutomationAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `mobile-automation-${Date.now()}`,
      role: {
        ...AGENT_ROLES.TESTER,
        name: 'mobile-automation',
        description: 'Mobile app testing specialist for iOS and Android',
        systemPrompt: 'You are the Mobile Automation specialist responsible for testing iOS and Android applications using Appium, XCTest, and Espresso.'
      },
      capabilities: [
        {
          name: 'ios_testing',
          description: 'Test iOS applications',
          enabled: true
        },
        {
          name: 'android_testing',
          description: 'Test Android applications',
          enabled: true
        },
        {
          name: 'cross_platform_testing',
          description: 'Test React Native and Flutter apps',
          enabled: true
        }
      ]
    });
  }
}