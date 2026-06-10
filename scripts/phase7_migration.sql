-- Phase 7 Migration: Cinematic Shot System
-- DO NOT RUN DIRECTLY IN BASH. THIS IS INTENDED FOR SUPABASE.

DO $$ 
BEGIN 

    -- 1. Shot Library
    CREATE TABLE IF NOT EXISTS public.shot_library (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        scene_id UUID, -- References scenes (if existing) or freeform
        shot_type TEXT NOT NULL,
        shot_number INTEGER NOT NULL,
        status TEXT DEFAULT 'draft',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_shot_number UNIQUE (project_id, scene_id, shot_number)
    );

    ALTER TABLE public.shot_library ENABLE ROW LEVEL SECURITY;

    -- 2. Shot Versions
    CREATE TABLE IF NOT EXISTS public.shot_versions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        shot_id UUID NOT NULL REFERENCES public.shot_library(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        approval_state TEXT NOT NULL DEFAULT 'draft',
        consistency_status TEXT NOT NULL DEFAULT 'pending',
        specification_payload JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_shot_version UNIQUE (shot_id, version)
    );

    ALTER TABLE public.shot_versions ENABLE ROW LEVEL SECURITY;

    -- 3. Shot Dependencies
    CREATE TABLE IF NOT EXISTS public.shot_dependencies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        shot_id UUID NOT NULL REFERENCES public.shot_library(id) ON DELETE CASCADE,
        dependency_id UUID NOT NULL, -- Logical reference to asset or manifest
        dependency_type TEXT NOT NULL,
        dependency_source TEXT NOT NULL, -- asset, visual_manifest, canonical_reference, etc.
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.shot_dependencies ENABLE ROW LEVEL SECURITY;

    -- 4. Shot Consistency Reports
    CREATE TABLE IF NOT EXISTS public.shot_consistency_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        shot_version_id UUID NOT NULL REFERENCES public.shot_versions(id) ON DELETE CASCADE,
        character_continuity NUMERIC DEFAULT 100,
        wardrobe_continuity NUMERIC DEFAULT 100,
        camera_continuity NUMERIC DEFAULT 100,
        environment_continuity NUMERIC DEFAULT 100,
        overall_score NUMERIC DEFAULT 100,
        hard_failures JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.shot_consistency_reports ENABLE ROW LEVEL SECURITY;

    -- 5. Scene Coverage Reports
    CREATE TABLE IF NOT EXISTS public.scene_coverage_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        scene_id UUID NOT NULL, -- Logical scene reference
        coverage_score NUMERIC DEFAULT 100,
        missing_coverage JSONB DEFAULT '[]'::jsonb,
        camera_distribution JSONB DEFAULT '{}'::jsonb,
        continuity_risk JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.scene_coverage_reports ENABLE ROW LEVEL SECURITY;

    -- 6. Production Graph Cache
    CREATE TABLE IF NOT EXISTS public.production_graph_cache (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        scene_id UUID,
        graph_payload JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.production_graph_cache ENABLE ROW LEVEL SECURITY;

    -- Drop existing permissive policies if re-running
    DROP POLICY IF EXISTS "Permissive shot_library" ON public.shot_library;
    DROP POLICY IF EXISTS "Permissive shot_versions" ON public.shot_versions;
    DROP POLICY IF EXISTS "Permissive shot_dependencies" ON public.shot_dependencies;
    DROP POLICY IF EXISTS "Permissive shot_consistency_reports" ON public.shot_consistency_reports;
    DROP POLICY IF EXISTS "Permissive scene_coverage_reports" ON public.scene_coverage_reports;
    DROP POLICY IF EXISTS "Permissive production_graph_cache" ON public.production_graph_cache;

    -- Create permissive policies for development validation
    CREATE POLICY "Permissive shot_library" ON public.shot_library FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive shot_versions" ON public.shot_versions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive shot_dependencies" ON public.shot_dependencies FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive shot_consistency_reports" ON public.shot_consistency_reports FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive scene_coverage_reports" ON public.scene_coverage_reports FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive production_graph_cache" ON public.production_graph_cache FOR ALL USING (true) WITH CHECK (true);

END $$;
