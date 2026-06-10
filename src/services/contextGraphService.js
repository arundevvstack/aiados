import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';
import crypto from 'crypto'; // Note: Only available in Node.js environment or via polyfill. Assuming server-side/backend environment for AdGravity.

/**
 * ContextGraphService (Phase 3)
 * Orchestrates the Global Memory Engine graph logic, cache resolution, and invalidation.
 */
class ContextGraphService extends BaseService {
  /**
   * Generates a deterministic hash for a graph based on asset ID and timestamp.
   * In a real system, this would hash the actual graph payload to detect changes.
   */
  static generateGraphHash(payload) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // Browser environment fallback (simplified for demonstration)
        return btoa(JSON.stringify(payload)).substring(0, 32);
    }
    // Node environment
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  /**
   * Resolves the full Asset Graph, utilizing the graph_cache if available.
   * @param {string} assetId
   * @param {string} workspaceId
   * @returns {Promise<Object>} The resolved GraphDTO { nodes, edges, metadata }
   */
  static async resolveAssetGraph(assetId, workspaceId) {
    // 1. Try Cache First (We assume we want the most recently generated graph)
    const { data: cacheData, error: cacheError } = await supabase
      .from('graph_cache')
      .select('resolved_graph, graph_hash')
      .eq('asset_id', assetId)
      .eq('workspace_id', workspaceId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (cacheError) {
      console.warn('Cache fetch failed:', cacheError);
    }
      
    // Return cache if it exists and we haven't explicitly invalidated it
    if (cacheData && cacheData.resolved_graph) {
        return cacheData.resolved_graph;
    }

    // 2. Cache Miss - Resolve via Postgres RPC
    const result = await BaseService.handleQuery(
      supabase.rpc('resolve_asset_graph', {
        p_asset_id: assetId
      }),
      'ContextGraphService.resolveAssetGraph'
    );

    // 3. Cache the resolved Graph
    if (result) {
      const graphHash = this.generateGraphHash(result);
      await supabase.from('graph_cache').insert([{
          workspace_id: workspaceId,
          asset_id: assetId,
          graph_hash: graphHash,
          resolved_graph: result,
          generated_at: new Date().toISOString()
      }]);
    }

    return result;
  }

  /**
   * Finds all downstream entities affected by a change to this asset.
   * @param {string} assetId 
   */
  static async getImpactAnalysis(assetId) {
    return await BaseService.handleQuery(
      supabase.rpc('calculate_impact_analysis', {
        p_asset_id: assetId
      }),
      'ContextGraphService.getImpactAnalysis'
    );
  }

  /**
   * Invalidates the graph cache for a specific asset
   */
  static async invalidateGraph(assetId, workspaceId) {
    return await BaseService.handleQuery(
      supabase.from('graph_cache')
        .delete()
        .eq('asset_id', assetId)
        .eq('workspace_id', workspaceId),
      'ContextGraphService.invalidateGraph'
    );
  }

  /**
   * Creates an explicit infrastructure dependency between two entities.
   */
  static async createDependency(workspaceId, sourceId, sourceType, targetId, targetType, dependencyType) {
    // Invalidate caches for both entities since the graph shape has changed
    await this.invalidateGraph(sourceId, workspaceId);
    await this.invalidateGraph(targetId, workspaceId);

    const user = (await supabase.auth.getUser()).data.user;

    return await BaseService.handleQuery(
      supabase.from('asset_dependencies').insert([{
        workspace_id: workspaceId,
        source_entity_id: sourceId,
        source_entity_type: sourceType,
        target_entity_id: targetId,
        target_entity_type: targetType,
        dependency_type: dependencyType,
        created_by: user ? user.id : null
      }]),
      'ContextGraphService.createDependency'
    );
  }
}

export default ContextGraphService;
