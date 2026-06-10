-- ============================================================================
-- ADGRAVITY OS — ALPHA HARDENING: SECURITY MIGRATION
-- Drops all 33 permissive USING(true) policies across Phases 3-8
-- Replaces with strict tenant-isolated RLS via workspace_members
-- ============================================================================

-- ============================================================================
-- HELPER: Tenant check subquery (used across all policies)
-- A user can access a row only if they are a non-deleted member of that workspace.
-- ============================================================================

-- ============================================================================
-- PHASE 3: MEMORY ENGINE TABLES
-- ============================================================================

-- asset_dependencies
DROP POLICY IF EXISTS "Permissive asset_dependencies" ON public.asset_dependencies;
CREATE POLICY "rls_asset_dependencies_select" ON public.asset_dependencies FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_dependencies_insert" ON public.asset_dependencies FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_dependencies_update" ON public.asset_dependencies FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_dependencies_delete" ON public.asset_dependencies FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- asset_context
DROP POLICY IF EXISTS "Permissive asset_context" ON public.asset_context;
CREATE POLICY "rls_asset_context_select" ON public.asset_context FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_context_insert" ON public.asset_context FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_context_update" ON public.asset_context FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_context_delete" ON public.asset_context FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- graph_cache
DROP POLICY IF EXISTS "Permissive graph_cache" ON public.graph_cache;
CREATE POLICY "rls_graph_cache_select" ON public.graph_cache FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_graph_cache_insert" ON public.graph_cache FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_graph_cache_update" ON public.graph_cache FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_graph_cache_delete" ON public.graph_cache FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- asset_collections
DROP POLICY IF EXISTS "Permissive asset_collections" ON public.asset_collections;
CREATE POLICY "rls_asset_collections_select" ON public.asset_collections FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_collections_insert" ON public.asset_collections FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_collections_update" ON public.asset_collections FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_asset_collections_delete" ON public.asset_collections FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- asset_collection_members (references asset_collections, no direct workspace_id — inherit via collection)
DROP POLICY IF EXISTS "Permissive asset_collection_members" ON public.asset_collection_members;
CREATE POLICY "rls_asset_collection_members_select" ON public.asset_collection_members FOR SELECT
  USING (collection_id IN (
    SELECT id FROM public.asset_collections
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_asset_collection_members_insert" ON public.asset_collection_members FOR INSERT
  WITH CHECK (collection_id IN (
    SELECT id FROM public.asset_collections
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_asset_collection_members_delete" ON public.asset_collection_members FOR DELETE
  USING (collection_id IN (
    SELECT id FROM public.asset_collections
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- ============================================================================
-- PHASE 4: AI GATEWAY TABLES
-- ============================================================================

-- ai_models: read-only reference table — authenticated users can read, only service role writes
DROP POLICY IF EXISTS "Permissive ai_models" ON public.ai_models;
CREATE POLICY "rls_ai_models_select" ON public.ai_models FOR SELECT
  USING (auth.role() = 'authenticated');

-- ai_jobs
DROP POLICY IF EXISTS "Permissive ai_jobs" ON public.ai_jobs;
CREATE POLICY "rls_ai_jobs_select" ON public.ai_jobs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_ai_jobs_insert" ON public.ai_jobs FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_ai_jobs_update" ON public.ai_jobs FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- ai_audit_trail: write-once, no delete
DROP POLICY IF EXISTS "Permissive ai_audit_trail" ON public.ai_audit_trail;
CREATE POLICY "rls_ai_audit_trail_select" ON public.ai_audit_trail FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_ai_audit_trail_insert" ON public.ai_audit_trail FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- ============================================================================
-- PHASE 5: GENERATION ENGINE TABLES
-- ============================================================================

-- provider_capabilities: read-only reference table
DROP POLICY IF EXISTS "Permissive provider_capabilities" ON public.provider_capabilities;
CREATE POLICY "rls_provider_capabilities_select" ON public.provider_capabilities FOR SELECT
  USING (auth.role() = 'authenticated');

-- generation_versions
DROP POLICY IF EXISTS "Permissive generation_versions" ON public.generation_versions;
CREATE POLICY "rls_generation_versions_select" ON public.generation_versions FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_generation_versions_insert" ON public.generation_versions FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_generation_versions_update" ON public.generation_versions FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- story_generations
DROP POLICY IF EXISTS "Permissive story_generations" ON public.story_generations;
CREATE POLICY "rls_story_generations_select" ON public.story_generations FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_story_generations_insert" ON public.story_generations FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_story_generations_update" ON public.story_generations FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- script_generations
DROP POLICY IF EXISTS "Permissive script_generations" ON public.script_generations;
CREATE POLICY "rls_script_generations_select" ON public.script_generations FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_script_generations_insert" ON public.script_generations FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_script_generations_update" ON public.script_generations FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- consistency_reports
DROP POLICY IF EXISTS "Permissive consistency_reports" ON public.consistency_reports;
CREATE POLICY "rls_consistency_reports_select" ON public.consistency_reports FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_consistency_reports_insert" ON public.consistency_reports FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- generation_review_queue
DROP POLICY IF EXISTS "Permissive generation_review_queue" ON public.generation_review_queue;
CREATE POLICY "rls_generation_review_queue_select" ON public.generation_review_queue FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_generation_review_queue_insert" ON public.generation_review_queue FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_generation_review_queue_update" ON public.generation_review_queue FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- ============================================================================
-- PHASE 6: VISUAL IDENTITY TABLES
-- ============================================================================

-- visual_identity_manifests
DROP POLICY IF EXISTS "Permissive visual_identity_manifests" ON public.visual_identity_manifests;
CREATE POLICY "rls_visual_identity_manifests_select" ON public.visual_identity_manifests FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_identity_manifests_insert" ON public.visual_identity_manifests FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_identity_manifests_update" ON public.visual_identity_manifests FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- visual_assets
DROP POLICY IF EXISTS "Permissive visual_assets" ON public.visual_assets;
CREATE POLICY "rls_visual_assets_select" ON public.visual_assets FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_assets_insert" ON public.visual_assets FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_assets_update" ON public.visual_assets FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- visual_asset_versions
DROP POLICY IF EXISTS "Permissive visual_asset_versions" ON public.visual_asset_versions;
CREATE POLICY "rls_visual_asset_versions_select" ON public.visual_asset_versions FOR SELECT
  USING (visual_asset_id IN (
    SELECT id FROM public.visual_assets
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_visual_asset_versions_insert" ON public.visual_asset_versions FOR INSERT
  WITH CHECK (visual_asset_id IN (
    SELECT id FROM public.visual_assets
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- visual_consistency_reports
DROP POLICY IF EXISTS "Permissive visual_consistency_reports" ON public.visual_consistency_reports;
CREATE POLICY "rls_visual_consistency_reports_select" ON public.visual_consistency_reports FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_consistency_reports_insert" ON public.visual_consistency_reports FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- visual_review_queue
DROP POLICY IF EXISTS "Permissive visual_review_queue" ON public.visual_review_queue;
CREATE POLICY "rls_visual_review_queue_select" ON public.visual_review_queue FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_review_queue_insert" ON public.visual_review_queue FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_visual_review_queue_update" ON public.visual_review_queue FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- ============================================================================
-- PHASE 7: CINEMATIC SHOT TABLES
-- ============================================================================

-- shot_library
DROP POLICY IF EXISTS "Permissive shot_library" ON public.shot_library;
CREATE POLICY "rls_shot_library_select" ON public.shot_library FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_shot_library_insert" ON public.shot_library FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_shot_library_update" ON public.shot_library FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_shot_library_delete" ON public.shot_library FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- shot_versions
DROP POLICY IF EXISTS "Permissive shot_versions" ON public.shot_versions;
CREATE POLICY "rls_shot_versions_select" ON public.shot_versions FOR SELECT
  USING (shot_id IN (
    SELECT id FROM public.shot_library
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_shot_versions_insert" ON public.shot_versions FOR INSERT
  WITH CHECK (shot_id IN (
    SELECT id FROM public.shot_library
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- shot_dependencies
DROP POLICY IF EXISTS "Permissive shot_dependencies" ON public.shot_dependencies;
CREATE POLICY "rls_shot_dependencies_select" ON public.shot_dependencies FOR SELECT
  USING (shot_id IN (
    SELECT id FROM public.shot_library
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_shot_dependencies_insert" ON public.shot_dependencies FOR INSERT
  WITH CHECK (shot_id IN (
    SELECT id FROM public.shot_library
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- shot_consistency_reports
DROP POLICY IF EXISTS "Permissive shot_consistency_reports" ON public.shot_consistency_reports;
CREATE POLICY "rls_shot_consistency_reports_select" ON public.shot_consistency_reports FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_shot_consistency_reports_insert" ON public.shot_consistency_reports FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- scene_coverage_reports
DROP POLICY IF EXISTS "Permissive scene_coverage_reports" ON public.scene_coverage_reports;
CREATE POLICY "rls_scene_coverage_reports_select" ON public.scene_coverage_reports FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_scene_coverage_reports_insert" ON public.scene_coverage_reports FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- production_graph_cache
DROP POLICY IF EXISTS "Permissive production_graph_cache" ON public.production_graph_cache;
CREATE POLICY "rls_production_graph_cache_select" ON public.production_graph_cache FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_production_graph_cache_insert" ON public.production_graph_cache FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_production_graph_cache_update" ON public.production_graph_cache FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- ============================================================================
-- PHASE 8: RENDERING ENGINE TABLES
-- ============================================================================

-- render_jobs
DROP POLICY IF EXISTS "Permissive render_jobs" ON public.render_jobs;
CREATE POLICY "rls_render_jobs_select" ON public.render_jobs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_render_jobs_insert" ON public.render_jobs FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_render_jobs_update" ON public.render_jobs FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- render_versions
DROP POLICY IF EXISTS "Permissive render_versions" ON public.render_versions;
CREATE POLICY "rls_render_versions_select" ON public.render_versions FOR SELECT
  USING (render_job_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_render_versions_insert" ON public.render_versions FOR INSERT
  WITH CHECK (render_job_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- render_consistency_reports
DROP POLICY IF EXISTS "Permissive render_consistency_reports" ON public.render_consistency_reports;
CREATE POLICY "rls_render_consistency_reports_select" ON public.render_consistency_reports FOR SELECT
  USING (render_job_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_render_consistency_reports_insert" ON public.render_consistency_reports FOR INSERT
  WITH CHECK (render_job_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- render_review_queue
DROP POLICY IF EXISTS "Permissive render_review_queue" ON public.render_review_queue;
CREATE POLICY "rls_render_review_queue_select" ON public.render_review_queue FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_render_review_queue_insert" ON public.render_review_queue FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_render_review_queue_update" ON public.render_review_queue FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- render_cost_ledger: write-once, no update, no delete — immutable financial record
DROP POLICY IF EXISTS "Permissive render_cost_ledger" ON public.render_cost_ledger;
CREATE POLICY "rls_render_cost_ledger_select" ON public.render_cost_ledger FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));
CREATE POLICY "rls_render_cost_ledger_insert" ON public.render_cost_ledger FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL));

-- render_audit_trail: write-once, tamper-proof
DROP POLICY IF EXISTS "Permissive render_audit_trail" ON public.render_audit_trail;
CREATE POLICY "rls_render_audit_trail_select" ON public.render_audit_trail FOR SELECT
  USING (render_job_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_render_audit_trail_insert" ON public.render_audit_trail FOR INSERT
  WITH CHECK (render_job_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- render_lineage
DROP POLICY IF EXISTS "Permissive render_lineage" ON public.render_lineage;
CREATE POLICY "rls_render_lineage_select" ON public.render_lineage FOR SELECT
  USING (parent_render_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));
CREATE POLICY "rls_render_lineage_insert" ON public.render_lineage FOR INSERT
  WITH CHECK (parent_render_id IN (
    SELECT id FROM public.render_jobs
    WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  ));

-- provider_health_metrics: read-only for users, service-role writes
DROP POLICY IF EXISTS "Permissive provider_health_metrics" ON public.provider_health_metrics;
CREATE POLICY "rls_provider_health_metrics_select" ON public.provider_health_metrics FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- Add GIN indexes for JSONB columns to prevent query degradation at scale
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_graph_cache_payload ON public.graph_cache USING GIN (graph_payload);
CREATE INDEX IF NOT EXISTS idx_asset_context_payload ON public.asset_context USING GIN (context_payload jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_production_graph_cache_payload ON public.production_graph_cache USING GIN (graph_payload jsonb_path_ops);

-- ============================================================================
-- Force PostgREST schema cache reload
-- ============================================================================
NOTIFY pgrst, 'reload schema';
