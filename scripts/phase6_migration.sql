-- ============================================================================
-- ADGRAVITY OS - PHASE 6 MIGRATION: VISUAL ASSET SYSTEM
-- Description: Creates visual identity manifests, tracking tables, reference
--              managers, and consistency reports.
-- ============================================================================

-- 1. Create visual_identity_manifests
CREATE TABLE IF NOT EXISTS public.visual_identity_manifests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  manifest_version INTEGER NOT NULL DEFAULT 1,
  manifest_hash TEXT NOT NULL,
  identity_rules JSONB DEFAULT '{}'::jsonb,
  appearance_rules JSONB DEFAULT '{}'::jsonb,
  wardrobe_rules JSONB DEFAULT '{}'::jsonb,
  brand_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_asset_manifest_version UNIQUE (asset_id, manifest_version)
);
ALTER TABLE public.visual_identity_manifests ENABLE ROW LEVEL SECURITY;

-- 2. Create visual_assets
CREATE TABLE IF NOT EXISTS public.visual_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  generation_id UUID, -- References generation_versions.id if part of a larger job
  prompt_hash TEXT,
  image_hash TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.visual_assets ENABLE ROW LEVEL SECURITY;

-- 3. Create visual_asset_versions
CREATE TABLE IF NOT EXISTS public.visual_asset_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visual_asset_id UUID NOT NULL REFERENCES public.visual_assets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  approval_status TEXT NOT NULL DEFAULT 'draft', -- draft, generated, validation, review, approved, rejected, canonical
  is_canonical BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_visual_asset_version UNIQUE (visual_asset_id, version)
);
ALTER TABLE public.visual_asset_versions ENABLE ROW LEVEL SECURITY;

-- 4. Create visual_consistency_reports
CREATE TABLE IF NOT EXISTS public.visual_consistency_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visual_asset_version_id UUID NOT NULL REFERENCES public.visual_asset_versions(id) ON DELETE CASCADE,
  identity_score NUMERIC DEFAULT 100,
  appearance_score NUMERIC DEFAULT 100,
  wardrobe_score NUMERIC DEFAULT 100,
  brand_score NUMERIC DEFAULT 100,
  environment_score NUMERIC DEFAULT 100,
  overall_score NUMERIC DEFAULT 100,
  hard_failures JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.visual_consistency_reports ENABLE ROW LEVEL SECURITY;

-- 5. Create visual_review_queue
CREATE TABLE IF NOT EXISTS public.visual_review_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  visual_asset_id UUID NOT NULL REFERENCES public.visual_assets(id) ON DELETE CASCADE,
  visual_asset_version_id UUID NOT NULL REFERENCES public.visual_asset_versions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT DEFAULT 'pending', -- pending, resolved, rejected
  reviewer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.visual_review_queue ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies (Permissive for backend validation)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Permissive visual_identity_manifests" ON public.visual_identity_manifests;
    DROP POLICY IF EXISTS "Permissive visual_assets" ON public.visual_assets;
    DROP POLICY IF EXISTS "Permissive visual_asset_versions" ON public.visual_asset_versions;
    DROP POLICY IF EXISTS "Permissive visual_consistency_reports" ON public.visual_consistency_reports;
    DROP POLICY IF EXISTS "Permissive visual_review_queue" ON public.visual_review_queue;

    CREATE POLICY "Permissive visual_identity_manifests" ON public.visual_identity_manifests FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive visual_assets" ON public.visual_assets FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive visual_asset_versions" ON public.visual_asset_versions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive visual_consistency_reports" ON public.visual_consistency_reports FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive visual_review_queue" ON public.visual_review_queue FOR ALL USING (true) WITH CHECK (true);
END $$;
