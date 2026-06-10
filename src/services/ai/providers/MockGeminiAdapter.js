import { BaseProviderAdapter } from './BaseProviderAdapter.js';

export class MockGeminiAdapter extends BaseProviderAdapter {
  async execute(promptPackage) {
    if (!await this.healthCheck()) {
        throw new Error('500: Gemini Provider Outage Simulated');
    }

    const inputTokens = this.estimateTokens(promptPackage);
    
    // Gemini is optimized for massive context, lower token latency scaling
    const latency = 40 + Math.floor(inputTokens / 1000) * 5;
    await new Promise(r => setTimeout(r, latency));

    const mockOutputTokens = 150;
    const cost = this.estimateCost(inputTokens, mockOutputTokens);

    return {
        success: true,
        provider: 'mock_gemini',
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
