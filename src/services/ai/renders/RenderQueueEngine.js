/**
 * ADGRAVITY OS — RenderQueueEngine (Hardened)
 * 
 * Orchestrates render job queueing via an IQueueProvider abstraction.
 * Today: PostgresQueueProvider (persistent, crash-safe).
 * Future: BullMQQueueProvider (distributed workers for Motion Intelligence).
 * 
 * NO in-memory queue. All state persists in PostgreSQL.
 */

import { PostgresQueueProvider } from '../../queue/PostgresQueueProvider.js';

// Configurable via environment. Default: PostgreSQL.
const QUEUE_PROVIDER = process.env.QUEUE_PROVIDER || 'postgres';

function buildQueueProvider() {
  if (QUEUE_PROVIDER === 'postgres') {
    return new PostgresQueueProvider();
  }
  // Future: if (QUEUE_PROVIDER === 'bullmq') return new BullMQQueueProvider();
  throw new Error(`[RenderQueueEngine] Unknown queue provider: ${QUEUE_PROVIDER}`);
}

export class RenderQueueEngine {
  constructor() {
    this.provider = buildQueueProvider();
    this.workerId = `worker_${process.pid}_${Date.now()}`;
    this.pollIntervalMs = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '2000', 10);
    this._pollTimer = null;
    this._processing = new Set(); // Track in-flight job IDs to prevent double-processing
  }

  /**
   * Initialize the engine. Runs crash recovery for stalled jobs then starts polling.
   * Must be called once on server startup.
   */
  async initialize() {
    console.log(`[RenderQueueEngine] Initializing worker: ${this.workerId}`);

    // Crash recovery: re-queue jobs stuck in 'rendering' for > 10 minutes
    const recovered = await this.provider.recoverStalledJobs(600_000);
    if (recovered > 0) {
      console.warn(`[RenderQueueEngine] Recovered ${recovered} stalled jobs from previous crash.`);
    }

    console.log('[RenderQueueEngine] Ready. Polling started.');
    return { workerId: this.workerId, recovered };
  }

  /**
   * Enqueue a new render job.
   * @param {Object} jobData - { workspaceId, projectId, shotId, renderSpec, priority }
   * @returns {Promise<{ id, status, createdAt }>}
   */
  async enqueue(jobData) {
    return this.provider.enqueue(jobData);
  }

  /**
   * Enqueue a batch of render jobs atomically.
   * @param {Array<Object>} jobs - Array of job data objects.
   * @returns {Promise<Array<{ id, status }>>}
   */
  async enqueueBatch(jobs) {
    const results = await Promise.all(
      jobs.map(job => this.provider.enqueue(job).catch(err => ({ error: err.message })))
    );
    const succeeded = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);
    console.log(`[RenderQueueEngine] Batch enqueued: ${succeeded.length} succeeded, ${failed.length} failed.`);
    return { succeeded, failed };
  }

  /**
   * Process the next available job using the provided processor function.
   * @param {Function} processor - async (job) => result
   */
  async processNext(processor) {
    if (typeof processor !== 'function') {
      throw new Error('[RenderQueueEngine] processor must be a function.');
    }

    const job = await this.provider.dequeue(this.workerId);
    if (!job) return null; // Queue empty

    if (this._processing.has(job.id)) {
      console.warn(`[RenderQueueEngine] Duplicate dequeue detected for job ${job.id}. Skipping.`);
      return null;
    }

    this._processing.add(job.id);

    try {
      console.log(`[RenderQueueEngine] Processing job: ${job.id}`);
      const result = await processor(job);
      await this.provider.ack(job.id, result || {});
      return { jobId: job.id, status: 'completed', result };
    } catch (err) {
      console.error(`[RenderQueueEngine] Job ${job.id} failed:`, err.message);

      // Retry up to MAX_RETRIES, then permanently fail
      try {
        await this.provider.retry(job.id);
      } catch (retryErr) {
        await this.provider.fail(job.id, err.message);
      }

      return { jobId: job.id, status: 'failed', error: err.message };
    } finally {
      this._processing.delete(job.id);
    }
  }

  /**
   * Get current queue depth for a workspace.
   * @param {string} workspaceId
   */
  async getQueueDepth(workspaceId = null) {
    return this.provider.getDepth(workspaceId);
  }

  /**
   * Gracefully shut down the engine.
   */
  async shutdown() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    // Wait for in-flight jobs to complete (max 30 seconds)
    const deadline = Date.now() + 30_000;
    while (this._processing.size > 0 && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('[RenderQueueEngine] Shutdown complete.');
  }
}
