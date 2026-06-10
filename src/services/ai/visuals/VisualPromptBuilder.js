/**
 * VisualPromptBuilder (Phase 6)
 * Converts resolved visual dependencies + specifications into structured payloads.
 */
export class VisualPromptBuilder {
  static build(resolvedDependencies, overrides = {}) {
    // Generate deterministic spec
    const spec = {
        character: {
            id: resolvedDependencies.baseAsset.id,
            name: resolvedDependencies.baseAsset.name,
            type: resolvedDependencies.baseAsset.type
        },
        appearance: { ...resolvedDependencies.visualManifest?.identity_rules, ...resolvedDependencies.visualManifest?.appearance_rules, ...overrides.appearance },
        wardrobe: resolvedDependencies.wardrobe.map(w => w.name),
        accessories: resolvedDependencies.accessories.map(a => a.name),
        brandRules: resolvedDependencies.brandRules,
        ...overrides
    };

    return spec;
  }
}
