/**
 * ProductionGraphResolver (Phase 7)
 * Bridges the Global Memory Graph to the Production Graph (Shot Graph).
 * Resolves all canonical assets, visual manifests, relationships, and scene context.
 */
export class ProductionGraphResolver {
  /**
   * Hydrates the production context for a specific scene or shot.
   * @param {Object} memoryContext - The global memory graph context
   * @param {Array} shotDependencies - Raw edge cache entries mapping to memory
   * @returns {Object} Hydrated Production Context
   */
  static resolve(memoryContext, shotDependencies = []) {
    const context = {
        assets: [],
        manifests: [],
        locations: [],
        relationships: memoryContext.relationships || [],
        scene: memoryContext.scene || null
    };

    if (!shotDependencies.length) {
        // If no explicit dependencies, default to full memory projection
        context.assets = memoryContext.assets || [];
        context.manifests = Object.values(memoryContext.visualManifests || {});
        context.locations = context.assets.filter(a => a.type === 'location');
        return context;
    }

    shotDependencies.forEach(dep => {
        if (dep.dependency_source === 'asset' || dep.dependency_source === 'location') {
            const asset = memoryContext.assets.find(a => a.id === dep.dependency_id);
            if (asset) {
                context.assets.push(asset);
                if (asset.type === 'location') context.locations.push(asset);
            }
        }
        if (dep.dependency_source === 'visual_manifest') {
            const manifest = memoryContext.visualManifests?.[dep.dependency_id];
            if (manifest) context.manifests.push(manifest);
        }
    });

    return context;
  }
}
