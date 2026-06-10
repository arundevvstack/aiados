import { BaseProviderAdapter } from './BaseProviderAdapter.js';

export class MockAnthropicAdapter extends BaseProviderAdapter {
  async execute(promptPackage) {
    if (!await this.healthCheck()) {
        throw new Error('500: Anthropic Provider Outage Simulated');
    }

    const inputTokens = this.estimateTokens(promptPackage);
    
    // Simulate network latency (60ms base + 8ms per 1k tokens)
    const latency = 60 + Math.floor(inputTokens / 1000) * 8;
    await new Promise(r => setTimeout(r, latency));

    const mockOutputTokens = 200;
    const cost = this.estimateCost(inputTokens, mockOutputTokens);

    return {
        success: true,
        provider: 'mock_anthropic',
        model: this.model.name,
        inputTokens,
        outputTokens: mockOutputTokens,
        cost,
        latency,
        response: {
            role: 'assistant',
            content: JSON.stringify({campaignConcept: {title: "Mock Title", logline: "mock logline"}, narrativeArc: {beginning: "mock", middle: "mock", end: "mock"}, characters: ["Amara"], locations: ["Dubai Desert"], themes: ["mock"], emotionalJourney: ["mock"]})
        }
    };
  }
}
