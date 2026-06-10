/**
 * ADGRAVITY OS — RenderPolicyEngine (Hardened)
 * 
 * Pre-queue validation layer. Hard fails requests that violate quotas, budgets,
 * or structural constraints before they hit the queue.
 */

import { RateLimiter } from '../../middleware/RateLimiter.js';

export class RenderPolicyEngine {

  /**
   * Validate a render request against quotas and limits.
   * Throws Error if validation fails (Hard Fail).
   * 
   * @param {Object} jobData 
   * @param {string} jobData.workspaceId
   * @param {Object} jobData.renderSpec
   * @returns {Promise<boolean>}
   */
  static async validate(jobData) {
    const { workspaceId, renderSpec } = jobData;

    // 1. Structural Validation
    if (!workspaceId) throw new Error('[PolicyEngine] Missing workspaceId');
    if (!renderSpec) throw new Error('[PolicyEngine] Missing renderSpec');

    // 2. Tenant Quota Validation
    // This throws if the hourly limit is exceeded, preventing abuse.
    await RateLimiter.assertRenderQuota(workspaceId);

    // 3. Aspect Ratio constraint (example: block ultra-wide anamorphic if unsupported)
    if (renderSpec.aspectRatio && !['16:9', '9:16', '1:1', '4:3', '21:9'].includes(renderSpec.aspectRatio)) {
      throw new Error(`[PolicyEngine] Unsupported aspect ratio: ${renderSpec.aspectRatio}`);
    }

    // 4. Resolution limit constraint
    if (renderSpec.resolution) {
      const [w, h] = renderSpec.resolution.split('x').map(Number);
      if (w * h > 3840 * 2160) {
        throw new Error('[PolicyEngine] Resolution exceeds 4K max limit.');
      }
    }

    return true;
  }
}
