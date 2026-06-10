/**
 * BaseProviderAdapter (Phase 4)
 * Establishes the interface for all mock and future real LLM SDK integrations.
 */
export class BaseProviderAdapter {
  constructor(modelDetails) {
    this.model = modelDetails;
  }

  /**
   * Executes the prompt package against the simulated provider.
   * @param {Object} promptPackage 
   */
  async execute(promptPackage) {
    throw new Error('Not implemented');
  }

  /**
   * Estimates token count for the given package.
   */
  estimateTokens(promptPackage) {
    // Basic deterministic stub: stringify and divide by 4 chars per token
    return Math.ceil(JSON.stringify(promptPackage).length / 4);
  }

  /**
   * Calculates cost based on model registry pricing.
   */
  estimateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * this.model.cost_per_1k_input;
    const outputCost = (outputTokens / 1000) * this.model.cost_per_1k_output;
    return inputCost + outputCost;
  }

  /**
   * Checks provider availability.
   */
  async healthCheck() {
    return this.model.is_active || this.model.provider_status === 'active';
  }
}
