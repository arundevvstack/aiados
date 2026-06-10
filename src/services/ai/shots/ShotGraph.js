import { ProductionGraphResolver } from './ProductionGraphResolver.js';

/**
 * ShotGraph (Phase 7)
 * The production-focused view of the memory graph.
 * Hydrates from the Memory Graph, not an independent reality.
 */
export class ShotGraph {
  constructor(memoryContext) {
      this.memoryContext = memoryContext;
      this.graphCache = null;
  }

  build(shotDependencies) {
      const start = process.hrtime();
      
      const productionContext = ProductionGraphResolver.resolve(this.memoryContext, shotDependencies);
      
      this.graphCache = {
          hydratedContext: productionContext,
          timestamp: new Date().toISOString()
      };

      const diff = process.hrtime(start);
      this.graphCache.buildTimeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);

      return this.graphCache;
  }
}
