import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';

export const ActivityLogService = {
  /**
   * Logs an action automatically from other services
   */
  async log(action, entityType, entityId, metadata = {}) {
    try {
      const user = await BaseService.requireAuth();
      
      // Determine active workspace from the user's memberships
      // In a real flow, this might be passed explicitly or fetched from state,
      // but to ensure backend safety, we can query it or rely on the caller providing it.
      // For service layer logging, we'll try to find their default/active workspace
      const { data: workspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!workspaces || workspaces.length === 0) return;

      const workspaceId = workspaces[0].workspace_id;

      await supabase.from('activity_logs').insert([{
        workspace_id: workspaceId,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata
      }]);
    } catch (err) {
      // We don't want a logging failure to crash the main transaction
      console.warn('Activity logging failed (non-fatal):', err.message);
    }
  },

  // --- ALPHA VALIDATION INSTRUMENTATION ---

  async logCampaignStarted(campaignId, projectId) {
    return this.log('campaign_started', 'campaign_runs', campaignId, { project_id: projectId });
  },

  async logStoryGenerated(storyId, projectId) {
    return this.log('story_generated', 'campaign_stories', storyId, { project_id: projectId });
  },

  async logAssetEdited(assetId, assetType) {
    return this.log('asset_edited', 'asset_collections', assetId, { asset_type: assetType });
  },

  async logReviewDecision(queueType, itemId, status) {
    return this.log(`review_${status}`, `${queueType}_review_queue`, itemId, { queue_type: queueType });
  }
};
