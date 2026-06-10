/**
 * ADGRAVITY OS — RateLimiter
 * 
 * Tenant-level rate limiting enforced at the service layer.
 * Prevents queue injection abuse and provider cost explosions.
 * 
 * Default limit: 100 render jobs per workspace per rolling hour.
 * Configurable via environment variable RENDER_HOURLY_LIMIT.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RENDER_HOURLY_LIMIT = parseInt(process.env.RENDER_HOURLY_LIMIT || '100', 10);

export class RateLimiter {

  /**
   * Check if a workspace is within its hourly render quota.
   * Queries render_cost_ledger for the rolling 1-hour window.
   * 
   * @param {string} workspaceId
   * @returns {Promise<{ allowed: boolean, used: number, limit: number, remaining: number }>}
   */
  static async checkRenderQuota(workspaceId) {
    if (!workspaceId) throw new Error('[RateLimiter] workspaceId is required.');

    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('render_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', windowStart);

    if (error) {
      // Fail open on DB error — do not block legitimate requests due to monitoring failure
      console.error('[RateLimiter] Quota check failed (failing open):', error.message);
      return { allowed: true, used: 0, limit: RENDER_HOURLY_LIMIT, remaining: RENDER_HOURLY_LIMIT };
    }

    const used = count || 0;
    const remaining = Math.max(0, RENDER_HOURLY_LIMIT - used);
    const allowed = used < RENDER_HOURLY_LIMIT;

    if (!allowed) {
      console.warn(`[RateLimiter] Workspace ${workspaceId} BLOCKED — quota exceeded: ${used}/${RENDER_HOURLY_LIMIT} renders/hour`);
    }

    return { allowed, used, limit: RENDER_HOURLY_LIMIT, remaining };
  }

  /**
   * Check AI job quota (story/script generations) — separate limit from renders.
   * Default: 50 AI jobs per workspace per rolling hour.
   * 
   * @param {string} workspaceId
   * @returns {Promise<{ allowed: boolean, used: number, limit: number }>}
   */
  static async checkAIJobQuota(workspaceId) {
    if (!workspaceId) throw new Error('[RateLimiter] workspaceId is required.');

    const AI_JOB_LIMIT = parseInt(process.env.AI_JOB_HOURLY_LIMIT || '50', 10);
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('ai_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', windowStart);

    if (error) {
      return { allowed: true, used: 0, limit: AI_JOB_LIMIT };
    }

    const used = count || 0;
    const allowed = used < AI_JOB_LIMIT;

    if (!allowed) {
      console.warn(`[RateLimiter] Workspace ${workspaceId} AI JOB BLOCKED: ${used}/${AI_JOB_LIMIT}/hour`);
    }

    return { allowed, used, limit: AI_JOB_LIMIT, remaining: Math.max(0, AI_JOB_LIMIT - used) };
  }

  /**
   * Assert render quota is within limits. Throws if exceeded.
   * Use inside RenderQueueEngine.enqueue() to block abuse at the service layer.
   * 
   * @param {string} workspaceId
   * @throws {Error} if quota exceeded
   */
  static async assertRenderQuota(workspaceId) {
    const quota = await this.checkRenderQuota(workspaceId);
    if (!quota.allowed) {
      throw new Error(
        `Rate limit exceeded: workspace ${workspaceId} has used ${quota.used}/${quota.limit} renders this hour. ` +
        `Quota resets on a rolling 60-minute window.`
      );
    }
    return quota;
  }
}
