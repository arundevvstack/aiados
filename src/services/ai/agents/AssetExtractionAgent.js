import { AIGatewayService } from '../AIGatewayService.js';
import { PromptBuilderService } from '../PromptBuilderService.js';

/**
 * AssetExtractionAgent (Phase 5)
 * Deterministically extracts new or updated Characters, Locations, and Props.
 * Requires confidence scores.
 */
export class AssetExtractionAgent {
  /**
   * Generates asset extractions from narrative text.
   */
  static async generate(narrativeText, contextPackage, jobContext) {
    const { workspaceId, projectId, userId, providerModel } = jobContext;

    const jsonInstructions = `
      You are the Asset Extraction Agent. Analyze the narrative and extract implicit/explicit assets.
      Output ONLY valid JSON.
      Required Structure:
      [
        {
          "assetType": "character|location|prop|vehicle|wardrobe|brand",
          "name": "...",
          "confidence": 0.0 to 1.0
        }
      ]
      Do not include markdown blocks.
    `;

    const promptText = `Extract assets from:\n${narrativeText}\n\n${jsonInstructions}`;
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
        throw new Error("Generation Failed: Extraction output was not valid JSON.");
    }

    return {
        extractedAssets: payload,
        hashes: {
            prompt_hash: promptPackage.audit.prompt_hash,
            provider_hash: gatewayResult.provider + '_' + gatewayResult.model
        }
    };
  }
}
