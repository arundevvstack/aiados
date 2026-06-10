import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { Database, Search, Filter, Edit, Trash2, X, Save, Users, MapPin, Box, Loader } from 'lucide-react';
import { ActivityLogService } from '../services/activityLogService';

export default function AssetEngine() {
  const { workspace, activeProject, selectedAsset, setSelectedAsset } = useMemory();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingAsset, setEditingAsset] = useState(null);
  const [editJson, setEditJson] = useState('');

  // Fetch all assets for the project
  const { data: rawAssets, isLoading } = useQuery({
    queryKey: ['assets', activeProject],
    queryFn: async () => {
      if (!workspace?.id || !activeProject) return [];
      const { data, error } = await supabase
        .from('asset_collections')
        .select('*')
        .eq('project_id', activeProject)
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!activeProject && !!workspace?.id
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase
        .from('asset_collections')
        .update({
          asset_name: updates.name,
          asset_type: updates.type,
          attributes: updates.attributes
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['assets', activeProject]);
      setEditingAsset(null);
      // Analytics Tracking
      ActivityLogService.logAssetEdited(variables.id, variables.updates.type).catch(console.warn);
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('asset_collections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries(['assets', activeProject]);
      if (selectedAsset?.id === deletedId) setSelectedAsset(null);
    }
  });

  if (!activeProject) {
    return <div className="p-6 text-muted">Please select a project from the Dashboard first.</div>;
  }

  // Parse assets and normalize structure for UI
  const assets = (rawAssets || []).map(a => ({
    id: a.id,
    name: a.asset_name,
    type: a.asset_type,
    ...a.attributes // expand properties (age, style, description, etc)
  }));

  const filteredAssets = assets.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleEditClick = (asset) => {
    setEditingAsset(asset);
    setEditJson(JSON.stringify(asset, null, 2));
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(editJson);
      const { id, name, type, ...attributes } = parsed;
      updateAssetMutation.mutate({ id, updates: { name, type, attributes } });
      if (selectedAsset?.id === id) {
        setSelectedAsset(parsed);
      }
    } catch (err) {
      alert('Invalid JSON format');
    }
  };

  const AssetCard = ({ asset }) => {
    const isSelected = selectedAsset?.id === asset.id;
    const Icon = asset.type === 'character' ? Users : asset.type === 'location' ? MapPin : Box;
    
    return (
      <div 
        onClick={() => setSelectedAsset(asset)}
        style={{ 
          background: isSelected ? 'rgba(206,27,34,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isSelected ? 'var(--primary-color)' : 'var(--panel-border)'}`,
          borderRadius: '12px', padding: '16px', cursor: 'pointer',
          transition: 'all 0.2s ease', position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '8px', color: 'var(--text-muted)' }}>
              <Icon size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              {asset.type}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => handleEditClick(asset)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><Edit size={14} /></button>
            <button onClick={() => deleteAssetMutation.mutate(asset.id)} style={{ background: 'transparent', border: 'none', color: 'var(--highlight-color)', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
          </div>
        </div>
        <h3 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>{asset.name}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {asset.description || asset.style || 'No description available.'}
        </p>
      </div>
    );
  };

  return (
    <div className="p-6" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
            <Database size={24} color="var(--secondary-color)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Asset Memory</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage extracted project identities.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search assets..."
            style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '8px 12px 8px 36px', color: 'var(--text-main)' }}
          />
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '4px' }}>
          {['all', 'character', 'location', 'prop', 'vehicle'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                background: filterType === type ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', borderRadius: '6px', padding: '6px 12px',
                color: filterType === type ? '#fff' : 'var(--text-muted)',
                fontSize: '0.85rem', textTransform: 'capitalize', cursor: 'pointer'
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader className="spin" /></div>
        ) : filteredAssets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
            No assets found matching the criteria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingAsset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Edit Asset Intelligence JSON</h3>
              <button onClick={() => setEditingAsset(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <textarea
              value={editJson}
              onChange={e => setEditJson(e.target.value)}
              style={{ width: '100%', height: '300px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '16px', color: 'var(--success-color)', fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setEditingAsset(null)} style={{ background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={updateAssetMutation.isLoading} style={{ background: 'var(--primary-color)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {updateAssetMutation.isLoading ? <Loader size={14} className="spin" /> : <Save size={14} />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
