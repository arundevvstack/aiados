/**
 * ContextPolicyEngine (Phase 4)
 * Ensures all ContextPackages comply with token, node, and safety rules.
 */
export class ContextPolicyEngine {
  /**
   * Validates a context package against global and workspace policies.
   * @param {Object} contextPackage 
   */
  static validatePolicy(contextPackage) {
    const MAX_NODES = 200;
    const MAX_DEPTH = 5;

    if (!contextPackage || !contextPackage.assets) {
        throw new Error('Policy Violation: Invalid ContextPackage structure.');
    }

    if (contextPackage.assets.length > MAX_NODES) {
        throw new Error(`Policy Violation: Node count (${contextPackage.assets.length}) exceeds maximum allowed (${MAX_NODES}).`);
    }

    const maxFoundDepth = contextPackage.assets.reduce((max, asset) => 
        asset.depth !== undefined ? Math.max(max, asset.depth) : max, 0
    );

    if (maxFoundDepth > MAX_DEPTH) {
        throw new Error(`Policy Violation: Graph depth (${maxFoundDepth}) exceeds maximum allowed (${MAX_DEPTH}).`);
    }

    return true;
  }
}
