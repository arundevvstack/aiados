import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { Video, Loader, Filter, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ShotList() {
  const { workspace, activeProject } = useMemory();
  const [filterScene, setFilterScene] = useState('All');

  const { data: shots, isLoading } = useQuery({
    queryKey: ['shot_library', activeProject],
    queryFn: async () => {
      if (!workspace?.id || !activeProject) return [];
      const { data, error } = await supabase
        .from('shot_library')
        .select('*')
        .eq('project_id', activeProject)
        .order('scene_number', { ascending: true })
        .order('shot_number', { ascending: true });
        
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!activeProject && !!workspace?.id
  });

  if (!activeProject) {
    return <div className="p-6 text-muted">Please select a project from the Dashboard first.</div>;
  }

  // Extract unique scenes for filtering
  const scenes = ['All', ...Array.from(new Set((shots || []).map(s => `Scene ${s.scene_number}`)))];
  
  const filteredShots = (shots || []).filter(s => {
    if (filterScene === 'All') return true;
    return `Scene ${s.scene_number}` === filterScene;
  });

  return (
    <div className="p-6" style={{ maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(206,27,34,0.1)', padding: '12px', borderRadius: '12px' }}>
            <Video size={24} color="var(--primary-color)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Shot Timeline</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Cinematic shot list and scene coverage.</p>
          </div>
        </div>

        {shots?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={filterScene}
              onChange={e => setFilterScene(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', 
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text-main)', outline: 'none'
              }}
            >
              {scenes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader className="spin" color="var(--primary-color)" /></div>
        ) : shots?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
            <Video size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
            <h3>No Shots Planned</h3>
            <p>Run the campaign orchestrator to extract scenes and plan cinematic shots.</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Scene</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Shot</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Type</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Lens</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Movement</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Description</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Continuity</th>
                </tr>
              </thead>
              <tbody>
                {filteredShots.map((shot, idx) => (
                  <tr key={shot.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>S{shot.scene_number.toString().padStart(2, '0')}</td>
                    <td style={{ padding: '16px' }}>{shot.shot_number.toString().padStart(3, '0')}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{shot.shot_type}</span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{shot.lens}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{shot.camera_movement}</td>
                    <td style={{ padding: '16px', maxWidth: '300px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>
                        {shot.description}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {shot.continuity_score >= 0.9 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-color)', fontSize: '0.85rem' }}>
                          <CheckCircle size={14} /> Passed
                        </div>
                      ) : shot.continuity_score > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--highlight-color)', fontSize: '0.85rem' }}>
                          <AlertTriangle size={14} /> Flagged
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
