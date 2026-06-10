import crypto from 'crypto';

/**
 * PromptBuilderService (Phase 4)
 * Converts a compressed ContextPackage into a standardized PromptPackage.
 */
export class PromptBuilderService {
  /**
   * Builds the structured PromptPackage.
   * @param {Object} compressedContext 
   * @param {Object} userIntent 
   */
  static buildPromptPackage(compressedContext, userIntent) {
    const promptPackage = {
        systemContext: {
            role: "You are the AdGravity OS Memory Resolver.",
            instructions: "Use the provided Memory Context to fulfill the User Intent.",
            constraints: [
                "Only reference assets present in the Memory Context.",
                "Maintain strict canonical consistency."
            ]
        },
        memoryContext: compressedContext,
        userIntent: userIntent,
        metadata: {
            built_at: new Date().toISOString()
        },
        audit: {}
    };

    // Generate cryptographic hash for the prompt package
    const hash = crypto.createHash('sha256').update(JSON.stringify(promptPackage)).digest('hex');
    promptPackage.audit.prompt_hash = hash;

    return promptPackage;
  }
}
