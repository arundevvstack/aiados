/**
 * ADGRAVITY OS — IQueueProvider
 * 
 * Queue provider abstraction interface. All queue implementations must conform
 * to this contract. Today: PostgresQueueProvider. Future: BullMQQueueProvider.
 * 
 * This abstraction ensures RenderQueueEngine never needs to be rewritten
 * when the underlying queue infrastructure is upgraded for Motion Intelligence.
 */

export class IQueueProvider {
  /**
   * Enqueue a new job.
   * @param {Object} jobData - { workspaceId, projectId, shotId, renderSpec, priority }
   * @returns {Promise<{ id: string, status: string, createdAt: string }>}
   */
  async enqueue(jobData) {
    throw new Error('IQueueProvider.enqueue() must be implemented by subclass.');
  }

  /**
   * Dequeue the next available job using crash-safe locking.
   * Must use SKIP LOCKED or equivalent to prevent double-processing.
   * @param {string} workerId - Unique ID of the worker claiming this job.
   * @returns {Promise<Object|null>} - Job record or null if queue is empty.
   */
  async dequeue(workerId) {
    throw new Error('IQueueProvider.dequeue() must be implemented by subclass.');
  }

  /**
   * Acknowledge successful job completion. Marks job as 'completed'.
   * @param {string} jobId
   * @param {Object} result - { resultHash, consistencyScore, outputUrl }
   * @returns {Promise<void>}
   */
  async ack(jobId, result) {
    throw new Error('IQueueProvider.ack() must be implemented by subclass.');
  }

  /**
   * Mark a job as failed. Records error reason for audit.
   * @param {string} jobId
   * @param {string} reason - Failure reason string.
   * @returns {Promise<void>}
   */
  async fail(jobId, reason) {
    throw new Error('IQueueProvider.fail() must be implemented by subclass.');
  }

  /**
   * Retry a failed job by re-enqueuing it. Increments retry counter.
   * @param {string} jobId
   * @returns {Promise<void>}
   */
  async retry(jobId) {
    throw new Error('IQueueProvider.retry() must be implemented by subclass.');
  }

  /**
   * Recover jobs stuck in 'rendering' status due to crash.
   * Called on startup. Jobs stuck > staleThresholdMs are re-queued.
   * @param {number} staleThresholdMs - Default: 600000 (10 minutes)
   * @returns {Promise<number>} - Count of recovered jobs.
   */
  async recoverStalledJobs(staleThresholdMs = 600_000) {
    throw new Error('IQueueProvider.recoverStalledJobs() must be implemented by subclass.');
  }

  /**
   * Get queue depth (queued + rendering counts).
   * @param {string} workspaceId - Optional. Filter by workspace.
   * @returns {Promise<{ queued: number, rendering: number, failed: number, completed: number }>}
   */
  async getDepth(workspaceId = null) {
    throw new Error('IQueueProvider.getDepth() must be implemented by subclass.');
  }
}
