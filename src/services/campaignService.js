import { supabase } from '../lib/supabase';
import { ActivityLogService } from './activityLogService';

/**
 * ADGRAVITY OS — Campaign Service
 * 
 * Bridges the frontend to the orchestration backend via Supabase Edge Functions.
 */
export const campaignService = {
  /**
   * Trigger the Campaign Orchestrator to begin running the production pipeline.
   * 
   * @param {string} workspaceId 
   * @param {string} projectId 
   * @param {Object} brandBrief 
   * @returns {Promise<{ campaignId: string }>}
   */
  async runCampaign(workspaceId, projectId, brandBrief = {}) {
    if (!workspaceId || !projectId) {
      throw new Error('workspaceId and projectId are required to run a campaign');
    }

    try {
      // 1. Create Campaign Run
      const { data: runData, error: runError } = await supabase
        .from('campaign_runs')
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          status: 'running',
          trigger_source: 'dashboard',
          brand_brief_snapshot: brandBrief
        })
        .select('id')
        .single();

      if (runError) throw runError;
      const campaignId = runData.id;

      // 2. Insert Checkpoints to simulate pipeline starting
      const checkpoints = [
        { run_id: campaignId, stage: 'story_generation', status: 'running', order_index: 1 },
        { run_id: campaignId, stage: 'asset_extraction', status: 'pending', order_index: 2 },
        { run_id: campaignId, stage: 'visual_identity', status: 'pending', order_index: 3 },
        { run_id: campaignId, stage: 'shot_planning', status: 'pending', order_index: 4 },
        { run_id: campaignId, stage: 'render_queue', status: 'pending', order_index: 5 }
      ];

      const { error: cpError } = await supabase
        .from('campaign_checkpoints')
        .insert(checkpoints);

      if (cpError) throw cpError;

      // Analytics Tracking
      ActivityLogService.logCampaignStarted(campaignId, projectId).catch(console.warn);

      // Simulate step completion via setTimeout since Edge Function isn't running
      setTimeout(async () => {
        await supabase.from('campaign_checkpoints').update({ status: 'completed' }).eq('run_id', campaignId).eq('stage', 'story_generation');
        await supabase.from('campaign_checkpoints').update({ status: 'running' }).eq('run_id', campaignId).eq('stage', 'asset_extraction');
        
        setTimeout(async () => {
          await supabase.from('campaign_checkpoints').update({ status: 'completed' }).eq('run_id', campaignId).eq('stage', 'asset_extraction');
          await supabase.from('campaign_checkpoints').update({ status: 'running' }).eq('run_id', campaignId).eq('stage', 'visual_identity');
        }, 5000);
      }, 5000);

      return { campaignId };
    } catch (error) {
      console.error('[CampaignService] Direct Simulation Error:', error);
      throw new Error(error.message || 'Failed to start campaign orchestration');
    }
  },

  /**
   * Resumes a paused/failed campaign from its last checkpoint
   */
  async resumeCampaign(campaignId) {
    if (!campaignId) throw new Error('campaignId is required');
    try {
      // Simulate resumption
      await supabase.from('campaign_runs').update({ status: 'running' }).eq('id', campaignId);
      
      // Analytics Tracking
      ActivityLogService.log('campaign_resumed', 'campaign_runs', campaignId).catch(console.warn);
      
      return { success: true };
    } catch (error) {
      console.error('[CampaignService] Resume Error:', error);
      throw error;
    }
  },

  /**
   * Complete restart of a failed campaign
   */
  async retryCampaign(campaignId) {
    if (!campaignId) throw new Error('campaignId is required');
    try {
      // Simulate retry - reset all checkpoints
      await supabase.from('campaign_checkpoints').update({ status: 'pending' }).eq('run_id', campaignId);
      await supabase.from('campaign_runs').update({ status: 'running' }).eq('id', campaignId);
      
      // Kickoff step 1
      setTimeout(async () => {
        await supabase.from('campaign_checkpoints').update({ status: 'completed' }).eq('run_id', campaignId).eq('stage', 'story_generation');
      }, 3000);

      // Analytics Tracking
      ActivityLogService.log('campaign_retried', 'campaign_runs', campaignId).catch(console.warn);

      return { success: true };
    } catch (error) {
      console.error('[CampaignService] Retry Error:', error);
      throw error;
    }
  }
};
