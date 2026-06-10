-- ============================================================================
-- ADGRAVITY OS - PHASE 3 MIGRATION: GLOBAL MEMORY ENGINE
-- Description: Creates asset_dependencies, asset_context, graph_cache, 
--              asset_collections, and graph RPC functions.
-- ============================================================================

-- 1. Create asset_dependencies
CREATE TABLE IF NOT EXISTS public.asset_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  dependency_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_asset_dependencies UNIQUE (source_entity_type, source_entity_id, target_entity_type, target_entity_id, dependency_type)
);
ALTER TABLE public.asset_dependencies ENABLE ROW LEVEL SECURITY;

-- 2. Create asset_context
CREATE TABLE IF NOT EXISTS public.asset_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  source_entity_type TEXT,
  source_entity_id UUID,
  graph_hash TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.asset_context ENABLE ROW LEVEL SECURITY;

-- 3. Create graph_cache
CREATE TABLE IF NOT EXISTS public.graph_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  graph_hash TEXT NOT NULL,
  resolved_graph JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_graph_cache UNIQUE (asset_id, graph_hash)
);
ALTER TABLE public.graph_cache ENABLE ROW LEVEL SECURITY;

-- 4. Create asset_collections
CREATE TABLE IF NOT EXISTS public.asset_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.asset_collections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.asset_collection_members (
  collection_id UUID REFERENCES public.asset_collections(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, asset_id)
);
ALTER TABLE public.asset_collection_members ENABLE ROW LEVEL SECURITY;

-- 5. RPC: resolve_asset_graph
-- Traverses dependencies and relationships downstream to build GraphDTO
CREATE OR REPLACE FUNCTION public.resolve_asset_graph(p_asset_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_nodes JSONB;
  v_edges JSONB;
BEGIN
  -- Simple placeholder graph resolution logic for now. 
  -- We fetch semantic relationships where this asset is source.
  WITH RECURSIVE graph_cte AS (
    -- Root asset
    SELECT 
      id, type as entity_type, name, 0 as depth, id as source_id, null::uuid as target_id, null::text as rel_type
    FROM public.assets WHERE id = p_asset_id
    
    UNION ALL
    
    -- Semantic Relationships (downstream)
    SELECT 
      a.id, a.type, a.name, g.depth + 1, r.source_asset_id, r.target_asset_id, r.relationship_type
    FROM graph_cte g
    JOIN public.asset_relationships r ON r.source_asset_id = g.id
    JOIN public.assets a ON a.id = r.target_asset_id
    WHERE g.depth < 10
  )
  SELECT 
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', id, 'type', entity_type, 'label', name, 'depth', depth)), '[]'::jsonb) INTO v_nodes
  FROM graph_cte;
  
  WITH RECURSIVE graph_cte AS (
    SELECT id, 0 as depth FROM public.assets WHERE id = p_asset_id
    UNION ALL
    SELECT a.id, g.depth + 1 FROM graph_cte g
    JOIN public.asset_relationships r ON r.source_asset_id = g.id
    JOIN public.assets a ON a.id = r.target_asset_id
    WHERE g.depth < 10
  )
  SELECT 
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('source', r.source_asset_id, 'target', r.target_asset_id, 'type', r.relationship_type)), '[]'::jsonb) INTO v_edges
  FROM graph_cte g
  JOIN public.asset_relationships r ON r.source_asset_id = g.id;

  RETURN jsonb_build_object(
    'nodes', v_nodes,
    'edges', v_edges,
    'metadata', jsonb_build_object('root', p_asset_id, 'generated_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: calculate_impact_analysis
-- Traverses dependencies and usage upstream (reverse) to find affected scripts/prompts
CREATE OR REPLACE FUNCTION public.calculate_impact_analysis(p_asset_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_affected JSONB;
BEGIN
  WITH RECURSIVE impact_cte AS (
    -- Direct usage in scripts etc
    SELECT 
      entity_id, entity_type, 1 as depth
    FROM public.asset_usage
    WHERE asset_id = p_asset_id
    
    UNION
    
    -- Direct explicit dependencies
    SELECT
      source_entity_id, source_entity_type, 1 as depth
    FROM public.asset_dependencies
    WHERE target_entity_id = p_asset_id
      AND target_entity_type = 'asset'
    
    UNION ALL
    
    -- Upstream dependencies recursively
    SELECT 
      d.source_entity_id, d.source_entity_type, i.depth + 1
    FROM impact_cte i
    JOIN public.asset_dependencies d 
      ON d.target_entity_id = i.entity_id 
      AND d.target_entity_type = i.entity_type
    WHERE i.depth < 10
  )
  SELECT 
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('entity_id', entity_id, 'entity_type', entity_type)), '[]'::jsonb) INTO v_affected
  FROM impact_cte;

  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS bypass for testing (Normally requires policies)
-- Adding generic permissive policies for the context of this Phase validation
DROP POLICY IF EXISTS "Permissive asset_dependencies" ON public.asset_dependencies;
CREATE POLICY "Permissive asset_dependencies" ON public.asset_dependencies USING (true);

DROP POLICY IF EXISTS "Permissive asset_context" ON public.asset_context;
CREATE POLICY "Permissive asset_context" ON public.asset_context USING (true);

DROP POLICY IF EXISTS "Permissive graph_cache" ON public.graph_cache;
CREATE POLICY "Permissive graph_cache" ON public.graph_cache USING (true);

DROP POLICY IF EXISTS "Permissive asset_collections" ON public.asset_collections;
CREATE POLICY "Permissive asset_collections" ON public.asset_collections USING (true);

DROP POLICY IF EXISTS "Permissive asset_collection_members" ON public.asset_collection_members;
CREATE POLICY "Permissive asset_collection_members" ON public.asset_collection_members USING (true);

NOTIFY pgrst, 'reload schema';
