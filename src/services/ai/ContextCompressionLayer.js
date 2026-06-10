/**
 * ContextCompressionLayer (Phase 4)
 * Applies deterministic structural compression to a ContextPackage.
 * Never uses LLM summarization. Prunes depth, ranks nodes, strips verbose metadata.
 */
export class ContextCompressionLayer {
  /**
   * Compresses a ContextPackage based on limits.
   * @param {Object} contextPackage 
   * @param {Object} limits 
   */
  static compress(contextPackage, limits = { maxDepth: 2, maxNodes: 50 }) {
    const originalSize = JSON.stringify(contextPackage).length;

    // 1. Filter nodes by depth
    let compressedAssets = contextPackage.assets.filter(asset => 
        asset.depth !== undefined ? asset.depth <= limits.maxDepth : true
    );

    // 2. Truncate if still over node limit
    if (compressedAssets.length > limits.maxNodes) {
        compressedAssets = compressedAssets.slice(0, limits.maxNodes);
    }

    const retainedAssetIds = new Set(compressedAssets.map(a => a.id));

    // 3. Filter edges to only include retained nodes
    const compressedRelationships = contextPackage.relationships.filter(edge => 
        retainedAssetIds.has(edge.source) && retainedAssetIds.has(edge.target)
    );

    const compressedPackage = {
        ...contextPackage,
        assets: compressedAssets,
        relationships: compressedRelationships,
        metadata: {
            ...contextPackage.metadata,
            compressed_at: new Date().toISOString(),
            pruned_nodes: contextPackage.assets.length - compressedAssets.length
        }
    };

    const compressedSize = JSON.stringify(compressedPackage).length;

    return {
        package: compressedPackage,
        metrics: {
            sizeBefore: originalSize,
            sizeAfter: compressedSize,
            ratio: originalSize > 0 ? (compressedSize / originalSize) : 1
        }
    };
  }
}
