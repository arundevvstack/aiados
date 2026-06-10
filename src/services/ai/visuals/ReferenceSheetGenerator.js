import { VisualDependencyResolver } from './VisualDependencyResolver.js';
import { VisualPromptBuilder } from './VisualPromptBuilder.js';
import { IdentityRuleEngine } from './IdentityRuleEngine.js';

/**
 * ReferenceSheetGenerator (Phase 6)
 * Orchestrates multi-angle sheet generation
 */
export class ReferenceSheetGenerator {
  static async generate(assetId, memoryContext, providerAdapter) {
      const baseAsset = memoryContext.assets.find(a => a.id === assetId);
      const dependencies = VisualDependencyResolver.resolve(baseAsset, memoryContext);
      
      const spec = VisualPromptBuilder.build(dependencies);
      
      // Mandatory Pre-generation validation
      IdentityRuleEngine.validate(spec, dependencies.visualManifest);

      // In production, this loop generates multiple views
      const views = ['front', 'side', 'back', 'expression'];
      const generatedViews = [];

      for (const view of views) {
          const viewSpec = { ...spec, requestedView: view };
          const result = await providerAdapter.execute(viewSpec);
          generatedViews.push(result);
      }

      return {
          specUsed: spec,
          generatedViews
      };
  }
}
