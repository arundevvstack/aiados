-- ============================================================================
-- ADGRAVITY OS — CAMPAIGN ORCHESTRATOR MIGRATION
-- Creates campaign_checkpoints table for resumable pipeline state
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaign_checkpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  output JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_campaign_checkpoints_campaign
  ON public.campaign_checkpoints (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_checkpoints_workspace
  ON public.campaign_checkpoints (workspace_id, status);

-- RLS
ALTER TABLE public.campaign_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_campaign_checkpoints_select" ON public.campaign_checkpoints FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

CREATE POLICY "rls_campaign_checkpoints_insert" ON public.campaign_checkpoints FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

CREATE POLICY "rls_campaign_checkpoints_update" ON public.campaign_checkpoints FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

NOTIFY pgrst, 'reload schema';
