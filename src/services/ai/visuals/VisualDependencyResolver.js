/**
 * VisualDependencyResolver (Phase 6)
 * Resolves all requisite memory context (Wardrobe, Brand Rules, Manifests)
 * required to confidently generate a specific visual asset without hallucinations.
 */
export class VisualDependencyResolver {
  /**
   * Resolves full context required for a visual specification.
   * @param {Object} baseAsset 
   * @param {Object} memoryContext 
   * @returns {Object} Fully hydrated visual dependencies
   */
  static resolve(baseAsset, memoryContext) {
    const dependencies = {
        baseAsset: baseAsset,
        wardrobe: [],
        accessories: [],
        locations: [],
        brandRules: memoryContext.brandRules || {},
        visualManifest: memoryContext.visualManifests?.[baseAsset.id] || null
    };

    // Extract relationships
    memoryContext.relationships.forEach(rel => {
        if (rel.source === baseAsset.id) {
            const target = memoryContext.assets.find(a => a.id === rel.target);
            if (!target) return;

            if (rel.type === 'WEARS') dependencies.wardrobe.push(target);
            if (rel.type === 'CARRIES') dependencies.accessories.push(target);
            if (rel.type === 'VISITS') dependencies.locations.push(target);
        }
    });

    return dependencies;
  }
}
