import { supabase } from '../../lib/supabase.js';
import ContextGraphService from '../contextGraphService.js';

/**
 * ContextResolverService (Phase 4)
 * Resolves raw entity IDs into a rich, deep GraphDTO, then packages it 
 * into a structured ContextPackage.
 */
export class ContextResolverService {
  /**
   * Resolves the full ContextPackage for a set of root asset IDs.
   * @param {Array<string>} assetIds 
   * @param {string} workspaceId 
   */
  static async resolveContextPackage(assetIds, workspaceId) {
    const assets = [];
    const relationships = [];
    const dependencies = [];

    // Note: In a true production environment, we would batch this.
    // For Phase 4 architectural validation, we resolve serially or in parallel promises.
    const resolutions = await Promise.all(
        assetIds.map(id => ContextGraphService.resolveAssetGraph(id, workspaceId))
    );

    // Merge all returned sub-graphs
    resolutions.forEach(graph => {
        if (!graph) return;
        if (graph.nodes) assets.push(...graph.nodes);
        if (graph.edges) relationships.push(...graph.edges);
    });

    // We can explicitly query dependencies for these nodes
    // (A simplified mock step for the packaging phase)

    return {
        assets: this.deduplicateById(assets),
        dependencies: dependencies,
        relationships: this.deduplicateEdges(relationships),
        snapshots: [], // Reserved for historical merges
        metadata: {
            resolved_at: new Date().toISOString(),
            roots: assetIds
        }
    };
  }

  static deduplicateById(items) {
      const map = new Map();
      items.forEach(item => map.set(item.id, item));
      return Array.from(map.values());
  }

  static deduplicateEdges(edges) {
      const set = new Set();
      return edges.filter(edge => {
          const key = `${edge.source}-${edge.target}-${edge.type}`;
          if (set.has(key)) return false;
          set.add(key);
          return true;
      });
  }
}
