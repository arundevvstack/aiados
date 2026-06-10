import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { ImageIcon, Loader, Star, History, ArrowRight } from 'lucide-react';

export default function VisualIdentityCenter() {
  const { workspace, activeProject, selectedAsset } = useMemory();
  const queryClient = useQueryClient();

  const { data: manifests, isLoading } = useQuery({
    queryKey: ['visual_manifests', activeProject],
    queryFn: async () => {
      if (!workspace?.id || !activeProject) return [];
      const { data, error } = await supabase
        .from('visual_identity_manifests')
        .select(`
          *,
          canonical_reference_id
        `)
        .eq('project_id', activeProject);
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!activeProject && !!workspace?.id
  });

  const promoteMutation = useMutation({
    mutationFn: async ({ manifestId, versionId }) => {
      const { error } = await supabase
        .from('visual_identity_manifests')
        .update({ canonical_reference_id: versionId, updated_at: new Date().toISOString() })
        .eq('id', manifestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['visual_manifests', activeProject]);
    }
  });

  if (!activeProject) {
    return <div className="p-6 text-muted">Please select a project from the Dashboard first.</div>;
  }

  // Example placeholder for versions since we don't have the full versions table logic mapped in UI yet
  const getMockVersions = (manifestId) => [
    { id: `${manifestId}-v1`, url: 'https://via.placeholder.com/150/111', created_at: '2026-06-01' },
    { id: `${manifestId}-v2`, url: 'https://via.placeholder.com/150/222', created_at: '2026-06-05' },
    { id: `${manifestId}-v3`, url: 'https://via.placeholder.com/150/333', created_at: '2026-06-08' },
  ];

  const ManifestCard = ({ manifest }) => {
    const versions = getMockVersions(manifest.id); // In reality, fetch from visual_identity_versions
    const canonicalId = manifest.canonical_reference_id || versions[versions.length - 1]?.id;

    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <ImageIcon size={16} />
              </div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Visual Manifest
              </span>
            </div>
            <h3 style={{ fontSize: '1.4rem', margin: '0' }}>{manifest.id.split('-')[0]} / {manifest.target_type}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Target ID: {manifest.target_id}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', color: manifest.status === 'approved' ? 'var(--success-color)' : 'var(--highlight-color)' }}>
              Status: {manifest.status}
            </span>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={14} /> Version History & Approvals
          </h4>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
            {versions.map(v => (
              <div 
                key={v.id} 
                style={{ 
                  flexShrink: 0, width: '150px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden',
                  border: v.id === canonicalId ? '2px solid var(--primary-color)' : '1px solid var(--panel-border)',
                  position: 'relative'
                }}
              >
                <img src={v.url} alt="Version" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(v.created_at).toLocaleDateString()}</span>
                  {v.id === canonicalId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Star size={12} fill="var(--primary-color)" /> Canonical
                    </div>
                  ) : (
                    <button
                      onClick={() => promoteMutation.mutate({ manifestId: manifest.id, versionId: v.id })}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                    >
                      Promote <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6" style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <ImageIcon size={24} color="var(--primary-color)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Visual Identity Center</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage visual truth, reference images, and canonical styles.</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader className="spin" color="var(--primary-color)" /></div>
        ) : manifests?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
            <ImageIcon size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
            <h3>No Visual Manifests Found</h3>
            <p>Run the campaign orchestrator to generate visual identities for characters and locations.</p>
          </div>
        ) : (
          <div>
            {manifests.map(m => <ManifestCard key={m.id} manifest={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
