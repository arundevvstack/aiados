-- ============================================================================
-- ADGRAVITY OS - PHASE 2 MIGRATION: SMART ASSET ENGINE (PATCH 2)
-- Description: Creates asset_usage table and differential sync RPC function.
--              Updated with Supabase-optimized jsonb_path_query parsing.
-- ============================================================================

-- 0. Update scripts table to support TipTap JSON structure
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS json_content JSONB DEFAULT '{}'::jsonb;

-- 1. Create asset_usage table
CREATE TABLE IF NOT EXISTS public.asset_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  inserted_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Add Unique Constraint to prevent duplicates
ALTER TABLE public.asset_usage 
  DROP CONSTRAINT IF EXISTS uq_asset_usage;
ALTER TABLE public.asset_usage 
  ADD CONSTRAINT uq_asset_usage UNIQUE (workspace_id, project_id, entity_type, entity_id, asset_id);

-- 3. Enable RLS
ALTER TABLE public.asset_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read asset usage" ON public.asset_usage;
CREATE POLICY "Read asset usage" ON public.asset_usage FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Insert asset usage" ON public.asset_usage;
CREATE POLICY "Insert asset usage" ON public.asset_usage FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update asset usage" ON public.asset_usage;
CREATE POLICY "Update asset usage" ON public.asset_usage FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Delete asset usage" ON public.asset_usage;
CREATE POLICY "Delete asset usage" ON public.asset_usage FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

-- 4. RPC Function for Server-Side Synchronization (Optimized)
DROP FUNCTION IF EXISTS public.sync_asset_usage(UUID, UUID, TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.sync_asset_usage(
  p_workspace_id UUID,
  p_project_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID,
  p_document_json JSONB
) RETURNS JSONB AS $$
DECLARE
  v_inserted INT := 0;
  v_deleted INT := 0;
  v_updated INT := 0;
BEGIN
  -- We extract all mention nodes recursively using Postgres 12+ jsonpath.
  -- 'strict $.** ? (@.type == "mention")' finds all nodes anywhere in the tree where type == 'mention'.
  WITH extracted_mentions AS (
    SELECT DISTINCT 
      (obj->'attrs'->>'id')::UUID AS asset_id,
      COALESCE((obj->'attrs'->>'version')::INTEGER, 1) AS version
    FROM jsonb_path_query(p_document_json, 'strict $.** ? (@.type == "mention")') AS obj
    WHERE (obj->'attrs'->>'id') IS NOT NULL
  )
  
  -- 1. DELETE obsolete records
  , deleted_records AS (
    DELETE FROM public.asset_usage
    WHERE workspace_id = p_workspace_id
      AND project_id = p_project_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND asset_id NOT IN (SELECT asset_id FROM extracted_mentions)
    RETURNING id
  )
  
  -- 2. INSERT OR UPDATE existing records
  , upserted_records AS (
    INSERT INTO public.asset_usage (
      workspace_id, project_id, asset_id, entity_type, entity_id, inserted_version, created_by, last_seen_at
    )
    SELECT 
      p_workspace_id, p_project_id, asset_id, p_entity_type, p_entity_id, version, p_user_id, NOW()
    FROM extracted_mentions
    ON CONFLICT ON CONSTRAINT uq_asset_usage 
    DO UPDATE SET 
      inserted_version = EXCLUDED.inserted_version,
      last_seen_at = NOW(),
      updated_at = NOW()
    RETURNING id, (xmax = 0) AS is_insert
  )
  
  SELECT 
    (SELECT COUNT(*) FROM deleted_records) AS del_count,
    (SELECT COUNT(CASE WHEN is_insert THEN 1 END) FROM upserted_records) AS ins_count,
    (SELECT COUNT(CASE WHEN NOT is_insert THEN 1 END) FROM upserted_records) AS upd_count
  INTO v_deleted, v_inserted, v_updated;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
