-- ============================================================================
-- ADGRAVITY OS - PHASE 4 MIGRATION: AI ORCHESTRATION LAYER
-- Description: Creates ai_models, ai_jobs, and ai_audit_trail to establish
--              the deterministic intelligence infrastructure.
-- ============================================================================

-- 1. Create ai_models
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  context_window INTEGER NOT NULL,
  max_output_tokens INTEGER,
  cost_per_1k_input NUMERIC NOT NULL,
  cost_per_1k_output NUMERIC NOT NULL,
  supports_streaming BOOLEAN DEFAULT false,
  supports_tools BOOLEAN DEFAULT false,
  supports_json_mode BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  provider_status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_ai_models UNIQUE (provider, name)
);
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Insert Mock Models for Phase 4 testing
INSERT INTO public.ai_models (provider, name, context_window, max_output_tokens, cost_per_1k_input, cost_per_1k_output)
VALUES 
('mock_openai', 'gpt-4o', 128000, 4096, 0.005, 0.015),
('mock_anthropic', 'claude-3-5-sonnet', 200000, 8192, 0.003, 0.015),
('mock_gemini', 'gemini-1.5-pro', 2000000, 8192, 0.0035, 0.0105)
ON CONFLICT DO NOTHING;

-- 2. Create ai_jobs
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost NUMERIC,
  request_payload JSONB,
  response_payload JSONB,
  context_size_before INTEGER,
  context_size_after INTEGER,
  compression_ratio NUMERIC,
  graph_resolution_ms INTEGER,
  compression_ms INTEGER,
  prompt_build_ms INTEGER,
  routing_ms INTEGER,
  latency_ms INTEGER,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- 3. Create ai_audit_trail
CREATE TABLE IF NOT EXISTS public.ai_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.ai_jobs(id) ON DELETE CASCADE,
  graph_hash TEXT NOT NULL,
  compression_hash TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  provider_hash TEXT NOT NULL,
  result_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ai_audit_trail ENABLE ROW LEVEL SECURITY;

-- 4. RLS bypass for testing (Phase Validation)
DROP POLICY IF EXISTS "Permissive ai_models" ON public.ai_models;
CREATE POLICY "Permissive ai_models" ON public.ai_models USING (true);

DROP POLICY IF EXISTS "Permissive ai_jobs" ON public.ai_jobs;
CREATE POLICY "Permissive ai_jobs" ON public.ai_jobs USING (true);

DROP POLICY IF EXISTS "Permissive ai_audit_trail" ON public.ai_audit_trail;
CREATE POLICY "Permissive ai_audit_trail" ON public.ai_audit_trail USING (true);

NOTIFY pgrst, 'reload schema';
