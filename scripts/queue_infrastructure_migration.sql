-- ============================================================================
-- ADGRAVITY OS — QUEUE INFRASTRUCTURE MIGRATION
-- Adds persistent queue support to render_jobs table
-- Implements SKIP LOCKED dequeue RPC for crash-safe concurrent processing
-- ============================================================================

-- 1. Add queue columns to render_jobs if not present
ALTER TABLE public.render_jobs
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS result_hash TEXT,
  ADD COLUMN IF NOT EXISTS render_spec JSONB DEFAULT '{}'::jsonb;

-- 2. Index for efficient queue polling (queued jobs ordered by priority then time)
CREATE INDEX IF NOT EXISTS idx_render_jobs_queue
  ON public.render_jobs (status, priority DESC, created_at ASC)
  WHERE status = 'queued';

-- Index for crash recovery (stalled jobs)
CREATE INDEX IF NOT EXISTS idx_render_jobs_stalled
  ON public.render_jobs (status, claimed_at)
  WHERE status = 'rendering';

-- 3. SKIP LOCKED dequeue RPC — atomically claims next available job
--    Called by PostgresQueueProvider.dequeue()
CREATE OR REPLACE FUNCTION public.dequeue_render_job(p_worker_id TEXT)
RETURNS SETOF public.render_jobs AS $$
BEGIN
  RETURN QUERY
    UPDATE public.render_jobs
    SET
      status = 'rendering',
      worker_id = p_worker_id,
      claimed_at = NOW()
    WHERE id = (
      SELECT id FROM public.render_jobs
      WHERE status = 'queued'
      ORDER BY priority DESC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
