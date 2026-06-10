-- Phase 8 Migration: Canonical Image Rendering Engine
-- DO NOT RUN DIRECTLY IN BASH. THIS IS INTENDED FOR SUPABASE.

DO $$ 
BEGIN 

    -- 1. Render Jobs
    CREATE TABLE IF NOT EXISTS public.render_jobs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        shot_id UUID NOT NULL, -- Logical reference to shot_library
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        status TEXT DEFAULT 'queued', -- queued, rendering, validation, review, approved, failed, cancelled, archived
        render_spec_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
    );

    ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

    -- 2. Render Versions
    CREATE TABLE IF NOT EXISTS public.render_versions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        render_id UUID NOT NULL REFERENCES public.render_jobs(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        approval_state TEXT NOT NULL DEFAULT 'queued',
        is_canonical BOOLEAN DEFAULT false,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_render_version UNIQUE (render_id, version)
    );

    ALTER TABLE public.render_versions ENABLE ROW LEVEL SECURITY;

    -- 3. Render Consistency Reports
    CREATE TABLE IF NOT EXISTS public.render_consistency_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        render_version_id UUID NOT NULL REFERENCES public.render_versions(id) ON DELETE CASCADE,
        identity_consistency NUMERIC DEFAULT 100,
        shot_consistency NUMERIC DEFAULT 100,
        composition_consistency NUMERIC DEFAULT 100,
        brand_consistency NUMERIC DEFAULT 100,
        overall_score NUMERIC DEFAULT 100,
        hard_failures JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.render_consistency_reports ENABLE ROW LEVEL SECURITY;

    -- 4. Render Review Queue
    CREATE TABLE IF NOT EXISTS public.render_review_queue (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        render_version_id UUID NOT NULL REFERENCES public.render_versions(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        status TEXT DEFAULT 'pending', -- pending, resolved, rejected
        reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.render_review_queue ENABLE ROW LEVEL SECURITY;

    -- 5. Render Cost Ledger
    CREATE TABLE IF NOT EXISTS public.render_cost_ledger (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        render_job_id UUID NOT NULL REFERENCES public.render_jobs(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        resolution TEXT,
        aspect_ratio TEXT,
        generation_time_ms INTEGER NOT NULL DEFAULT 0,
        input_cost_usd NUMERIC NOT NULL DEFAULT 0.00,
        output_cost_usd NUMERIC NOT NULL DEFAULT 0.00,
        total_cost_usd NUMERIC NOT NULL DEFAULT 0.00,
        billing_month INTEGER NOT NULL,
        billing_year INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.render_cost_ledger ENABLE ROW LEVEL SECURITY;

    -- 6. Render Audit Trail
    CREATE TABLE IF NOT EXISTS public.render_audit_trail (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        render_job_id UUID NOT NULL REFERENCES public.render_jobs(id) ON DELETE CASCADE,
        graph_hash TEXT NOT NULL,
        context_hash TEXT NOT NULL,
        visual_manifest_hash TEXT NOT NULL,
        shot_spec_hash TEXT NOT NULL,
        render_spec_hash TEXT NOT NULL,
        provider_hash TEXT NOT NULL,
        result_hash TEXT NOT NULL,
        audit_version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.render_audit_trail ENABLE ROW LEVEL SECURITY;

    -- 7. Render Lineage
    CREATE TABLE IF NOT EXISTS public.render_lineage (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        parent_render_id UUID REFERENCES public.render_versions(id) ON DELETE SET NULL,
        child_render_id UUID NOT NULL REFERENCES public.render_versions(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL, -- Iteration, Fix, Up-res, Style-transfer
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.render_lineage ENABLE ROW LEVEL SECURITY;

    -- 8. Provider Health Metrics
    CREATE TABLE IF NOT EXISTS public.provider_health_metrics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        success_rate NUMERIC DEFAULT 100.0,
        failure_rate NUMERIC DEFAULT 0.0,
        avg_latency_ms INTEGER DEFAULT 0,
        avg_cost_usd NUMERIC DEFAULT 0.00,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_provider_model UNIQUE (provider, model)
    );

    ALTER TABLE public.provider_health_metrics ENABLE ROW LEVEL SECURITY;

    -- Drop existing permissive policies if re-running
    DROP POLICY IF EXISTS "Permissive render_jobs" ON public.render_jobs;
    DROP POLICY IF EXISTS "Permissive render_versions" ON public.render_versions;
    DROP POLICY IF EXISTS "Permissive render_consistency_reports" ON public.render_consistency_reports;
    DROP POLICY IF EXISTS "Permissive render_review_queue" ON public.render_review_queue;
    DROP POLICY IF EXISTS "Permissive render_cost_ledger" ON public.render_cost_ledger;
    DROP POLICY IF EXISTS "Permissive render_audit_trail" ON public.render_audit_trail;
    DROP POLICY IF EXISTS "Permissive render_lineage" ON public.render_lineage;
    DROP POLICY IF EXISTS "Permissive provider_health_metrics" ON public.provider_health_metrics;

    -- Create permissive policies for development validation
    CREATE POLICY "Permissive render_jobs" ON public.render_jobs FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive render_versions" ON public.render_versions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive render_consistency_reports" ON public.render_consistency_reports FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive render_review_queue" ON public.render_review_queue FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive render_cost_ledger" ON public.render_cost_ledger FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive render_audit_trail" ON public.render_audit_trail FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive render_lineage" ON public.render_lineage FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Permissive provider_health_metrics" ON public.provider_health_metrics FOR ALL USING (true) WITH CHECK (true);

END $$;
