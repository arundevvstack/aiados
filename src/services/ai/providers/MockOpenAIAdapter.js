import { BaseProviderAdapter } from './BaseProviderAdapter.js';

export class MockOpenAIAdapter extends BaseProviderAdapter {
  async execute(promptPackage) {
    if (!await this.healthCheck()) {
        throw new Error('500: OpenAI Provider Outage Simulated');
    }

    const inputTokens = this.estimateTokens(promptPackage);
    
    // Simulate 429 logic if inputs are suspiciously high (just for tests)
    if (inputTokens > 100000) {
        throw new Error('429: Rate Limit Exceeded');
    }

    // Simulate network latency (50ms base + 10ms per 1k tokens)
    const latency = 50 + Math.floor(inputTokens / 1000) * 10;
    
    // Wait for latency simulation
    await new Promise(r => setTimeout(r, latency));

    const mockOutputTokens = 150;
    const cost = this.estimateCost(inputTokens, mockOutputTokens);

    return {
        success: true,
        provider: 'mock_openai',
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
