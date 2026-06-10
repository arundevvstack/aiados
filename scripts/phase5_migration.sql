-- ============================================================================
-- ADGRAVITY OS - PHASE 5 MIGRATION: CREATIVE GENERATION FRAMEWORK
-- Description: Creates generation tracking tables, provider capabilities,
--              consistency reports, and review queues.
-- ============================================================================

-- 1. Create provider_capabilities
CREATE TABLE IF NOT EXISTS public.provider_capabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  supports_story BOOLEAN DEFAULT true,
  supports_script BOOLEAN DEFAULT true,
  supports_extraction BOOLEAN DEFAULT true,
  supports_json BOOLEAN DEFAULT true,
  supports_streaming BOOLEAN DEFAULT false,
  supports_tools BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  supports_audio BOOLEAN DEFAULT false,
  max_context INTEGER NOT NULL,
  cost_per_1k_input NUMERIC NOT NULL,
  cost_per_1k_output NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_provider_model UNIQUE (provider, model)
);
ALTER TABLE public.provider_capabilities ENABLE ROW LEVEL SECURITY;

-- Insert Capabilities
INSERT INTO public.provider_capabilities (provider, model, max_context, cost_per_1k_input, cost_per_1k_output)
VALUES 
('openai', 'gpt-4o', 128000, 0.005, 0.015),
('anthropic', 'claude-3-5-sonnet', 200000, 0.003, 0.015),
('gemini', 'gemini-1.5-pro', 2000000, 0.0035, 0.0105)
ON CONFLICT DO NOTHING;

-- 2. Create generation_versions
CREATE TABLE IF NOT EXISTS public.generation_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'story', 'script', 'extraction'
  status TEXT NOT NULL DEFAULT 'drafted', -- 'drafted', 'validated', 'rejected', 'accepted', 'review_required'
  version INTEGER NOT NULL DEFAULT 1,
  graph_hash TEXT NOT NULL,
  compression_hash TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  provider_hash TEXT NOT NULL,
  result_hash TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.generation_versions ENABLE ROW LEVEL SECURITY;

-- 3. Create story_generations & script_generations
CREATE TABLE IF NOT EXISTS public.story_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.generation_versions(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.story_generations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.script_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.generation_versions(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.script_generations ENABLE ROW LEVEL SECURITY;

-- 4. Create consistency_reports
CREATE TABLE IF NOT EXISTS public.consistency_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.generation_versions(id) ON DELETE CASCADE,
  hard_failures JSONB,
  quality_score NUMERIC,
  coverage_score NUMERIC,
  missing_assets JSONB,
  dependency_violations JSONB,
  relationship_violations JSONB,
  rejection_reason TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.consistency_reports ENABLE ROW LEVEL SECURITY;

-- 5. Create generation_review_queue
CREATE TABLE IF NOT EXISTS public.generation_review_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id UUID NOT NULL REFERENCES public.generation_versions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  assigned_to UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.generation_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS bypass for Phase 5 Testing
DROP POLICY IF EXISTS "Permissive provider_capabilities" ON public.provider_capabilities;
CREATE POLICY "Permissive provider_capabilities" ON public.provider_capabilities USING (true);

DROP POLICY IF EXISTS "Permissive generation_versions" ON public.generation_versions;
CREATE POLICY "Permissive generation_versions" ON public.generation_versions USING (true);

DROP POLICY IF EXISTS "Permissive story_generations" ON public.story_generations;
CREATE POLICY "Permissive story_generations" ON public.story_generations USING (true);

DROP POLICY IF EXISTS "Permissive script_generations" ON public.script_generations;
CREATE POLICY "Permissive script_generations" ON public.script_generations USING (true);

DROP POLICY IF EXISTS "Permissive consistency_reports" ON public.consistency_reports;
CREATE POLICY "Permissive consistency_reports" ON public.consistency_reports USING (true);

DROP POLICY IF EXISTS "Permissive generation_review_queue" ON public.generation_review_queue;
CREATE POLICY "Permissive generation_review_queue" ON public.generation_review_queue USING (true);

NOTIFY pgrst, 'reload schema';
