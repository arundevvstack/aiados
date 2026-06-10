import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MemoryContext = createContext();

export const useMemory = () => useContext(MemoryContext);

export const MemoryProvider = ({ children }) => {
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  const [assets, setAssets] = useState({
    characters: [],
    locations: [],
    props: [],
    wardrobe: []
  });

  const [story, setStory] = useState({});
  const [scripts, setScripts] = useState([]);
  const [shots, setShots] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Get currently authenticated user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const userId = session.user.id;

        // 2. Get the user's workspaces via membership
        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .limit(1);

        if (!memberships || memberships.length === 0) { setLoading(false); return; }
        const workspaceId = memberships[0].workspace_id;

        // 3. Fetch that specific workspace
        const { data: ws } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
        if (ws) setWorkspace(ws);

        // 4. Fetch Projects for Workspace
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (projectsData && projectsData.length > 0) {
          setProjects(projectsData);
          setActiveProject(projectsData[0].id);

          // 5. Fetch Story
          const { data: storiesData } = await supabase.from('stories').select('*').eq('project_id', projectsData[0].id);
          if (storiesData && storiesData.length > 0) setStory(storiesData[0]);

          // 6. Fetch Assets
          const { data: assetsData } = await supabase.from('assets').select('*').eq('project_id', projectsData[0].id);
          if (assetsData) {
            setAssets({
              characters: assetsData.filter(a => a.type === 'character'),
              locations: assetsData.filter(a => a.type === 'location'),
              props: assetsData.filter(a => a.type === 'prop'),
              wardrobe: assetsData.filter(a => a.type === 'wardrobe')
            });
          }
        } else {
          setProjects([]);
        }
      } catch (err) {
        console.error('[GlobalMemoryContext] Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const createProject = async (name) => {
    if (!workspace) return null;
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name, workspace_id: workspace.id }])
      .select()
      .single();
    if (error) { console.error('Create project error:', error); return null; }
    setProjects(prev => [data, ...prev]);
    setActiveProject(data.id);
    return data;
  };

  const updateAsset = async (type, id, updates) => {
    setAssets(prev => ({
      ...prev,
      [type]: prev[type].map(item => item.id === id ? { ...item, ...updates } : item)
    }));
    await supabase.from('assets').update(updates).eq('id', id);
  };

  const getAssetDetails = (id) => {
    if (!id) return null;
    for (const key in assets) {
      const found = assets[key].find(item => item.id === id);
      if (found) return found;
    }
    return null;
  };

  return (
    <MemoryContext.Provider value={{
      workspace, projects, activeProject, setActiveProject,
      assets, updateAsset, getAssetDetails,
      story, setStory,
      scripts, setScripts,
      shots, setShots,
      selectedAsset, setSelectedAsset,
      loading, createProject
    }}>
      {children}
    </MemoryContext.Provider>
  );
};
