/**
 * ADGRAVITY OS — CheckpointEngine
 * 
 * Manages resumable campaign pipeline state.
 * Every stage of the CampaignOrchestrator writes a checkpoint.
 * If any stage fails, the pipeline halts. It can be resumed from the last
 * successful checkpoint without restarting from scratch.
 * 
 * States: PENDING → RUNNING → COMPLETED | FAILED | PAUSED
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const CheckpointStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused',
};

export class CheckpointEngine {
  constructor(campaignId, workspaceId) {
    this.campaignId = campaignId;
    this.workspaceId = workspaceId;
    this.checkpoints = {};
  }

  /**
   * Mark a stage as RUNNING.
   */
  async start(stage) {
    console.log(`[Checkpoint] ${stage}: RUNNING`);
    this.checkpoints[stage] = { status: CheckpointStatus.RUNNING, startedAt: new Date().toISOString() };
    await this._persist(stage, CheckpointStatus.RUNNING);
  }

  /**
   * Mark a stage as COMPLETED with optional output data.
   */
  async complete(stage, output = {}) {
    console.log(`[Checkpoint] ${stage}: COMPLETED`);
    this.checkpoints[stage] = {
      status: CheckpointStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      output,
    };
    await this._persist(stage, CheckpointStatus.COMPLETED, output);
  }

  /**
   * Mark a stage as FAILED and record the reason.
   * The pipeline must halt immediately after this is called.
   */
  async fail(stage, reason) {
    console.error(`[Checkpoint] ${stage}: FAILED — ${reason}`);
    this.checkpoints[stage] = {
      status: CheckpointStatus.FAILED,
      failedAt: new Date().toISOString(),
      reason,
    };
    await this._persist(stage, CheckpointStatus.FAILED, { reason });
  }

  /**
   * Check if a stage was already completed (for resume support).
   */
  isCompleted(stage) {
    return this.checkpoints[stage]?.status === CheckpointStatus.COMPLETED;
  }

  /**
   * Get output from a previously completed stage.
   */
  getOutput(stage) {
    return this.checkpoints[stage]?.output || null;
  }

  /**
   * Load existing checkpoints from DB (for pipeline resume).
   */
  async load() {
    const { data } = await supabase
      .from('campaign_checkpoints')
      .select('*')
      .eq('campaign_id', this.campaignId);

    if (data) {
      for (const row of data) {
        this.checkpoints[row.stage] = {
          status: row.status,
          output: row.output,
          completedAt: row.completed_at,
        };
      }
    }
    return this.checkpoints;
  }

  /**
   * Get full checkpoint summary.
   */
  getSummary() {
    return {
      campaignId: this.campaignId,
      checkpoints: this.checkpoints,
      lastFailed: Object.entries(this.checkpoints).find(([, v]) => v.status === CheckpointStatus.FAILED)?.[0] || null,
    };
  }

  async _persist(stage, status, output = {}) {
    await supabase
      .from('campaign_checkpoints')
      .upsert([{
        campaign_id: this.campaignId,
        workspace_id: this.workspaceId,
        stage,
        status,
        output,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'campaign_id,stage' });
  }
}
