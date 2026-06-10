import { AIGatewayService } from '../AIGatewayService.js';
import { PromptBuilderService } from '../PromptBuilderService.js';
import { ConsistencyEngine } from './ConsistencyEngine.js';

/**
 * StoryGeneratorAgent (Phase 5)
 * Generates campaign concepts. Ensures output is strict JSON.
 */
export class StoryGeneratorAgent {
  /**
   * Generates a story based on a brief and context package.
   */
  static async generate(brief, contextPackage, jobContext) {
    const { workspaceId, projectId, userId, providerModel } = jobContext;

    // 1. Enforce JSON constraint in Prompt
    const jsonInstructions = `
      You are the Story Generator. You must output ONLY valid JSON.
      Required Structure:
      {
        "campaignConcept": { "title": "...", "logline": "..." },
        "narrativeArc": { "beginning": "...", "middle": "...", "end": "..." },
        "characters": ["name1", "name2"],
        "locations": ["loc1", "loc2"],
        "themes": ["theme1", "theme2"],
        "emotionalJourney": ["emotion1", "emotion2"]
      }
      Do not include markdown blocks, just the raw JSON object.
    `;

    const promptPackage = PromptBuilderService.buildPromptPackage(contextPackage, brief + "\n\n" + jsonInstructions);

    // 2. Route Job via AI Gateway
    const gatewayResult = await AIGatewayService.routeJob({
        workspaceId,
        projectId,
        userId,
        promptPackage,
        primaryProvider: providerModel.provider
    });

    let payload;
    try {
        // Strip markdown if the LLM leaked it despite instructions
        let rawContent = gatewayResult.response.content;
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        payload = JSON.parse(rawContent);
    } catch (e) {
        throw new Error("Generation Failed: Output was not valid JSON.");
    }

    // 3. Consistency Validation
    const consistencyReport = ConsistencyEngine.evaluate(payload, contextPackage);
    
    // We append the hashes for Phase 5 traceability
    return {
        payload,
        consistencyReport,
        hashes: {
            graph_hash: promptPackage.memoryContext.metadata.graph_hash || 'none',
            compression_hash: 'mock_compression', // simplified
            prompt_hash: promptPackage.audit.prompt_hash,
            provider_hash: gatewayResult.provider + '_' + gatewayResult.model,
            result_hash: gatewayResult.response.content // rough hash
        }
    };
  }
}
