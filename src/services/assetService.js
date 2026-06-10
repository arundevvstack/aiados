import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';
import { WorkspaceService } from './workspaceService';
import { ActivityLogService } from './activityLogService';

export const AssetService = {
  async createAsset(workspaceId, projectId, type, name, attributes = {}) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    const asset = await BaseService.handleQuery(
      supabase.from('assets').insert([{
        workspace_id: workspaceId,
        project_id: projectId,
        type,
        name,
        attributes
      }]).select().single(),
      'AssetService.createAsset'
    );

    await ActivityLogService.log('ASSET_CREATED', 'asset', asset.id, { type, name });
    return asset;
  },

  async updateAsset(workspaceId, assetId, updates) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    const asset = await BaseService.handleQuery(
      supabase.from('assets').update(updates)
        .eq('id', assetId)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .select().single(),
      'AssetService.updateAsset'
    );

    await ActivityLogService.log('ASSET_UPDATED', 'asset', assetId, updates);
    return asset;
  },

  async archiveAsset(workspaceId, assetId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    const result = await BaseService.handleQuery(
      supabase.from('assets').update({ deleted_at: new Date().toISOString() })
        .eq('id', assetId)
        .eq('workspace_id', workspaceId)
        .select().single(),
      'AssetService.archiveAsset'
    );

    await ActivityLogService.log('ASSET_ARCHIVED', 'asset', assetId);
    return result;
  },

  async restoreAsset(workspaceId, assetId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    const result = await BaseService.handleQuery(
      supabase.from('assets').update({ deleted_at: null })
        .eq('id', assetId)
        .eq('workspace_id', workspaceId)
        .select().single(),
      'AssetService.restoreAsset'
    );

    await ActivityLogService.log('ASSET_RESTORED', 'asset', assetId);
    return result;
  },

  async getAsset(workspaceId, assetId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    return BaseService.handleQuery(
      supabase.from('assets').select('*')
        .eq('id', assetId)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .single(),
      'AssetService.getAsset'
    );
  },

  async searchAssets(workspaceId, projectId, queryOptions = {}) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    let query = supabase.from('assets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);
      
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (queryOptions.type) {
      query = query.eq('type', queryOptions.type);
    }
    if (queryOptions.search) {
      query = query.ilike('name', `%${queryOptions.search}%`);
    }

    return BaseService.handleQuery(query, 'AssetService.searchAssets');
  },

  async createRelationship(workspaceId, sourceId, targetId, type, metadata = {}) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);

    const rel = await BaseService.handleQuery(
      supabase.from('asset_relationships').insert([{
        source_asset_id: sourceId,
        target_asset_id: targetId,
        relationship_type: type,
        metadata
      }]).select().single(),
      'AssetService.createRelationship'
    );

    await ActivityLogService.log('RELATIONSHIP_CREATED', 'asset_relationship', sourceId, { targetId, type });
    return rel;
  },

  async getAssetRelationships(workspaceId, assetId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    // We fetch relationships where the asset is either the source or target
    return BaseService.handleQuery(
      supabase.from('asset_relationships')
        .select('*')
        .or(`source_asset_id.eq.${assetId},target_asset_id.eq.${assetId}`)
        .is('deleted_at', null),
      'AssetService.getAssetRelationships'
    );
  },

  async removeRelationship(workspaceId, sourceId, targetId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);

    const result = await BaseService.handleQuery(
      supabase.from('asset_relationships')
        .update({ deleted_at: new Date().toISOString() })
        .eq('source_asset_id', sourceId)
        .eq('target_asset_id', targetId)
        .select().single(),
      'AssetService.removeRelationship'
    );

    await ActivityLogService.log('RELATIONSHIP_REMOVED', 'asset_relationship', sourceId, { targetId });
    return result;
  }
};
