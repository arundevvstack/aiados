import { supabase } from '../lib/supabase.js';
import ContextGraphService from './contextGraphService.js';

/**
 * SnapshotOrchestrator (Phase 3)
 * Handles the application-layer orchestration of capturing memory snapshots.
 * Replaces database triggers, ensuring full business-logic context is available.
 */
class SnapshotOrchestrator {
  /**
   * Orchestrates the creation of a memory snapshot when an entity (like a Script) is saved.
   * Extends the Phase 2 'syncUsage' logic to also capture and freeze the Context Graph.
   * 
   * @param {string} workspaceId 
   * @param {string} projectId 
   * @param {string} entityType (e.g., 'script')
   * @param {string} entityId 
   * @param {object} documentJson (TipTap JSON)
   */
  static async orchestrateSave(workspaceId, projectId, entityType, entityId, documentJson) {
    const userResponse = await supabase.auth.getUser();
    const userId = userResponse.data?.user?.id;

    // 1. Phase 2: Sync Differential Usage
    const { data: syncData, error: syncError } = await supabase.rpc('sync_asset_usage', {
      p_workspace_id: workspaceId,
      p_project_id: projectId,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_user_id: userId,
      p_document_json: documentJson
    });

    if (syncError) {
      console.error('Usage sync failed:', syncError);
      throw syncError;
    }

    // 2. Phase 3: Build Memory Snapshot
    // To do this, we parse out the assets referenced in this document and snapshot their graphs.
    // We can extract them locally from the documentJson.
    const assetIds = this.extractMentionAssetIds(documentJson);

    for (const assetId of assetIds) {
      // Resolve the graph (which uses Cache if available)
      const graphDto = await ContextGraphService.resolveAssetGraph(assetId, workspaceId);
      
      const graphHash = ContextGraphService.generateGraphHash(graphDto);

      // Store Context Snapshot
      await supabase.from('asset_context').insert([{
        workspace_id: workspaceId,
        project_id: projectId,
        asset_id: assetId,
        context_type: 'memory_snapshot',
        source_entity_type: entityType,
        source_entity_id: entityId,
        graph_hash: graphHash,
        payload: graphDto,
        created_by: userId
      }]);
    }

    return syncData;
  }

  /**
   * Restores a specific snapshot context payload.
   */
  static async restoreSnapshot(snapshotId) {
    const { data, error } = await supabase
        .from('asset_context')
        .select('*')
        .eq('id', snapshotId)
        .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Helper function to extract asset UUIDs from TipTap JSON natively in JS.
   * This is used to know WHICH graphs to snapshot.
   */
  static extractMentionAssetIds(json, ids = new Set()) {
    if (!json) return Array.from(ids);
    
    if (json.type === 'mention' && json.attrs && json.attrs.id) {
      ids.add(json.attrs.id);
    }
    
    if (Array.isArray(json.content)) {
      json.content.forEach(child => this.extractMentionAssetIds(child, ids));
    } else if (typeof json === 'object') {
      Object.values(json).forEach(val => {
        if (typeof val === 'object' || Array.isArray(val)) {
          this.extractMentionAssetIds(val, ids);
        }
      });
    }

    return Array.from(ids);
  }
}


export { SnapshotOrchestrator };
