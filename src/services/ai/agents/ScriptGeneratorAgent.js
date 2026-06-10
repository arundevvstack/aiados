import { AIGatewayService } from '../AIGatewayService.js';
import { PromptBuilderService } from '../PromptBuilderService.js';
import { ConsistencyEngine } from './ConsistencyEngine.js';

/**
 * ScriptGeneratorAgent (Phase 5)
 * Converts a Story into a structured Scene-by-Scene Script.
 */
export class ScriptGeneratorAgent {
  /**
   * Generates a script based on a story payload and context.
   */
  static async generate(storyPayload, contextPackage, jobContext) {
    const { workspaceId, projectId, userId, providerModel } = jobContext;

    const jsonInstructions = `
      You are the Script Generator. Output ONLY valid JSON representing the script.
      Required Structure:
      {
        "scenes": [
          { "heading": "...", "action": "..." }
        ],
        "dialogue": [
          { "character": "...", "line": "..." }
        ],
        "voiceover": [],
        "productionNotes": []
      }
      Do not include markdown blocks.
    `;

    const promptText = `Convert the following story into a script:\n${JSON.stringify(storyPayload)}\n\n${jsonInstructions}`;
    const promptPackage = PromptBuilderService.buildPromptPackage(contextPackage, promptText);

    const gatewayResult = await AIGatewayService.routeJob({
        workspaceId,
        projectId,
        userId,
        promptPackage,
        primaryProvider: providerModel.provider
    });

    let payload;
    try {
        let rawContent = gatewayResult.response.content;
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        payload = JSON.parse(rawContent);
    } catch (e) {
        throw new Error("Generation Failed: Script output was not valid JSON.");
    }

    const consistencyReport = ConsistencyEngine.evaluate(payload, contextPackage);
    
    return {
        payload,
        consistencyReport,
        hashes: {
            graph_hash: promptPackage.memoryContext.metadata.graph_hash || 'none',
            compression_hash: 'mock_compression',
            prompt_hash: promptPackage.audit.prompt_hash,
            provider_hash: gatewayResult.provider + '_' + gatewayResult.model,
            result_hash: gatewayResult.response.content
        }
    };
  }
}
