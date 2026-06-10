/**
 * ADGRAVITY OS — PostgresQueueProvider
 * 
 * Implements IQueueProvider using PostgreSQL SKIP LOCKED for crash-safe,
 * concurrent job dequeuing. Persists all state in render_jobs table.
 * 
 * SKIP LOCKED ensures:
 * - No double-processing under concurrent workers
 * - Jobs survive server restarts and pod evictions
 * - Crash recovery re-queues stale jobs automatically on startup
 * 
 * Future: Swap this for BullMQQueueProvider without touching RenderQueueEngine.
 */

import { IQueueProvider } from './IQueueProvider.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class PostgresQueueProvider extends IQueueProvider {
  constructor() {
    super();
    // Use service role key — queue operations require bypassing RLS on the worker side
    this.db = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Enqueue a new render job. Writes directly to render_jobs with status='queued'.
   */
  async enqueue(jobData) {
    const {
      workspaceId,
      projectId,
      shotId = null,
      renderSpec = {},
      priority = 5,
    } = jobData;

    if (!workspaceId || !projectId) {
      throw new Error('[PostgresQueueProvider] workspaceId and projectId are required.');
    }

    const specHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(renderSpec))
      .digest('hex');

    const { data, error } = await this.db
      .from('render_jobs')
      .insert([{
        workspace_id: workspaceId,
        project_id: projectId,
        shot_id: shotId,
        status: 'queued',
        priority,
        render_spec_hash: specHash,
        render_spec: renderSpec,
        retry_count: 0,
        worker_id: null,
        claimed_at: null,
      }])
      .select()
      .single();

    if (error) throw new Error(`[PostgresQueueProvider.enqueue] ${error.message}`);

    console.log(`[Queue] Job enqueued: ${data.id} | workspace: ${workspaceId}`);
    return { id: data.id, status: data.status, createdAt: data.created_at };
  }

  /**
   * Dequeue next job using SKIP LOCKED via Supabase RPC.
   * Atomically claims the job and sets status='rendering'.
   */
  async dequeue(workerId) {
    if (!workerId) throw new Error('[PostgresQueueProvider] workerId is required.');

    // Use a raw Postgres RPC for SKIP LOCKED — Supabase client doesn't support it directly
    const { data, error } = await this.db.rpc('dequeue_render_job', {
      p_worker_id: workerId,
    });

    if (error) {
      console.error('[PostgresQueueProvider.dequeue] RPC error:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    const job = data[0];
    console.log(`[Queue] Job claimed: ${job.id} by worker: ${workerId}`);
    return job;
  }

  /**
   * Acknowledge successful completion.
   */
  async ack(jobId, result = {}) {
    const { error } = await this.db
      .from('render_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_hash: result.resultHash || null,
        worker_id: null,
      })
      .eq('id', jobId);

    if (error) throw new Error(`[PostgresQueueProvider.ack] ${error.message}`);
    console.log(`[Queue] Job acked: ${jobId}`);
  }

  /**
   * Mark job as failed with reason.
   */
  async fail(jobId, reason = 'Unknown failure') {
    const { error } = await this.db
      .from('render_jobs')
      .update({
        status: 'failed',
        failure_reason: reason,
        completed_at: new Date().toISOString(),
        worker_id: null,
      })
      .eq('id', jobId);

    if (error) throw new Error(`[PostgresQueueProvider.fail] ${error.message}`);
    console.warn(`[Queue] Job failed: ${jobId} | Reason: ${reason}`);
  }

  /**
   * Retry a failed job by re-enqueuing it.
   */
  async retry(jobId) {
    const { data: job, error: fetchErr } = await this.db
      .from('render_jobs')
      .select('retry_count')
      .eq('id', jobId)
      .single();

    if (fetchErr || !job) throw new Error(`[PostgresQueueProvider.retry] Job not found: ${jobId}`);

    const MAX_RETRIES = 3;
    if (job.retry_count >= MAX_RETRIES) {
      await this.fail(jobId, `Max retries (${MAX_RETRIES}) exceeded.`);
      return;
    }

    const { error } = await this.db
      .from('render_jobs')
      .update({
        status: 'queued',
        retry_count: job.retry_count + 1,
        worker_id: null,
        claimed_at: null,
        failure_reason: null,
      })
      .eq('id', jobId);

    if (error) throw new Error(`[PostgresQueueProvider.retry] ${error.message}`);
    console.log(`[Queue] Job retried: ${jobId} | Attempt: ${job.retry_count + 1}`);
  }

  /**
   * Crash recovery: re-queue jobs stuck in 'rendering' for longer than staleThresholdMs.
   * Must be called on worker startup.
   */
  async recoverStalledJobs(staleThresholdMs = 600_000) {
    const staleThreshold = new Date(Date.now() - staleThresholdMs).toISOString();

    const { data: stalled, error } = await this.db
      .from('render_jobs')
      .select('id, worker_id, claimed_at')
      .eq('status', 'rendering')
      .lt('claimed_at', staleThreshold);

    if (error) {
      console.error('[PostgresQueueProvider.recoverStalledJobs] Query error:', error.message);
      return 0;
    }

    if (!stalled || stalled.length === 0) {
      console.log('[Queue Recovery] No stalled jobs found.');
      return 0;
    }

    let recovered = 0;
    for (const job of stalled) {
      try {
        await this.retry(job.id);
        recovered++;
        console.warn(`[Queue Recovery] Re-queued stalled job: ${job.id} (was claimed by worker: ${job.worker_id})`);
      } catch (err) {
        console.error(`[Queue Recovery] Failed to recover job ${job.id}:`, err.message);
      }
    }

    console.log(`[Queue Recovery] Recovered ${recovered} / ${stalled.length} stalled jobs.`);
    return recovered;
  }

  /**
   * Get queue depth metrics.
   */
  async getDepth(workspaceId = null) {
    let query = this.db
      .from('render_jobs')
      .select('status');

    if (workspaceId) query = query.eq('workspace_id', workspaceId);

    const { data, error } = await query;
    if (error) return { queued: 0, rendering: 0, failed: 0, completed: 0 };

    return {
      queued: data.filter(j => j.status === 'queued').length,
      rendering: data.filter(j => j.status === 'rendering').length,
      failed: data.filter(j => j.status === 'failed').length,
      completed: data.filter(j => j.status === 'completed').length,
    };
  }
}
