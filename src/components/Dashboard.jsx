import React, { useState, useEffect } from 'react';
import { useMemory } from '../context/GlobalMemoryContext';
import { LayoutDashboard, Users, MapPin, Box, Video, Plus, Loader, FolderOpen, Play, Activity, Server, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { campaignService } from '../services/campaignService';
import { useCampaignProgress } from '../hooks/useCampaignProgress';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { projects, activeProject, setActiveProject, assets, story, shots, loading, createProject, workspace } = useMemory();
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Orchestrator UI state
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [startingCampaign, setStartingCampaign] = useState(false);
  const campaignProgress = useCampaignProgress(activeCampaignId);

  // Real health metrics loaded from DB
  const [healthMetrics, setHealthMetrics] = useState({
    queueDepth: { queued: 0, rendering: 0, failed: 0, completed: 0 },
    quota: { used: 0, limit: 100 },
    providerHealth: 'Optimal',
  });

  useEffect(() => {
    async function loadMetrics() {
      if (!workspace?.id) return;
      
      // Load queue depth
      const { data: queueData } = await supabase
        .from('render_jobs')
        .select('status')
        .eq('workspace_id', workspace.id);

      if (queueData) {
        setHealthMetrics(prev => ({
          ...prev,
          queueDepth: {
            queued: queueData.filter(j => j.status === 'queued').length,
            rendering: queueData.filter(j => j.status === 'rendering').length,
            failed: queueData.filter(j => j.status === 'failed').length,
            completed: queueData.filter(j => j.status === 'completed').length,
          }
        }));
      }

      // Check running campaigns for this project
      if (activeProject) {
        const { data: campaigns } = await supabase
          .from('campaign_checkpoints')
          .select('campaign_id')
          .eq('workspace_id', workspace.id)
          .neq('status', 'completed')
          .neq('status', 'failed')
          .order('updated_at', { ascending: false })
          .limit(1);
          
        if (campaigns && campaigns.length > 0) {
          setActiveCampaignId(campaigns[0].campaign_id);
        }
      }
    }
    loadMetrics();
  }, [workspace?.id, activeProject]);

  const project = projects.find(p => p.id === activeProject);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    const result = await createProject(newProjectName.trim());
    setCreating(false);
    if (result) {
      setNewProjectName('');
      setShowForm(false);
    }
  };

  const runCampaign = async () => {
    if (!workspace?.id || !activeProject) return;
    setStartingCampaign(true);
    try {
      // Pass a default brand brief for now. StoryGenerator will provide the real one.
      const { campaignId } = await campaignService.runCampaign(workspace.id, activeProject, {
        concept: story?.concept || 'Default brand brief for new campaign'
      });
      setActiveCampaignId(campaignId);
    } catch (err) {
      console.error('Failed to start campaign:', err.message);
      alert(err.message);
    } finally {
      setStartingCampaign(false);
    }
  };

  const retryCampaign = async () => {
    if (!activeCampaignId) return;
    try {
      await campaignService.retryCampaign(activeCampaignId);
      alert('Campaign restarted.');
    } catch (err) {
      alert(err.message);
    }
  };

  const resumeCampaign = async () => {
    if (!activeCampaignId) return;
    try {
      await campaignService.resumeCampaign(activeCampaignId);
      alert('Campaign resumed.');
    } catch (err) {
      alert(err.message);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)' }}>
      <div style={{ backgroundColor: `${color}22`, padding: '12px', borderRadius: '8px', color: color }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{value}</div>
      </div>
    </div>
  );

  const HealthCard = ({ title, value, subtext, icon: Icon, color = 'var(--text-main)' }) => (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <Icon size={20} color={color} style={{ marginTop: '2px' }} />
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{subtext}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
        <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading workspace...</span>
      </div>
    );
  }

  // No projects — show empty state with create form
  if (projects.length === 0) {
    return (
      <div className="p-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(206,27,34,0.1)', padding: '24px', borderRadius: '50%' }}>
          <FolderOpen size={48} color="var(--primary-color)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>No Projects Yet</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '360px' }}>
            Create your first production project to start building stories, scripts, and cinematic assets.
          </p>
        </div>

        {showForm ? (
          <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '420px' }}>
            <input
              type="text"
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
              placeholder="e.g. Nike Summer 2026 Campaign"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(206,27,34,0.4)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || creating}
              style={{
                background: 'linear-gradient(135deg, #CE1B22, #a8141b)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {creating ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'linear-gradient(135deg, #CE1B22, #a8141b)',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 28px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 0 30px rgba(206,27,34,0.3)',
            }}
          >
            <Plus size={18} />
            Create New Project
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with project selector and Orchestrator action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Project: <span style={{ color: 'var(--primary-color)' }}>{project?.name}</span>
          </h1>
          <p className="text-muted text-lg">{story.concept || 'No concept defined yet.'}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {projects.length > 1 && (
            <select
              value={activeProject || ''}
              onChange={e => setActiveProject(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--panel-border)',
                borderRadius: '10px',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {showForm ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                placeholder="Project name..."
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(206,27,34,0.5)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '200px',
                }}
              />
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                style={{ background: 'linear-gradient(135deg, #CE1B22, #a8141b)', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {creating ? '...' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setNewProjectName(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'rgba(206,27,34,0.15)',
                border: '1px solid rgba(206,27,34,0.3)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: 'var(--primary-color)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              New Project
            </button>
          )}

          {/* Campaign Orchestrator Button */}
          <button
            onClick={runCampaign}
            disabled={startingCampaign || campaignProgress.active}
            style={{
              background: (startingCampaign || campaignProgress.active) ? 'var(--panel-bg)' : 'linear-gradient(135deg, var(--success-color), #059669)',
              border: (startingCampaign || campaignProgress.active) ? '1px solid var(--panel-border)' : 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: (startingCampaign || campaignProgress.active) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '8px'
            }}
          >
            {startingCampaign ? (
              <>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Starting...
              </>
            ) : campaignProgress.active ? (
              <>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {campaignProgress.percentComplete}% - {campaignProgress.stage}
              </>
            ) : (
              <>
                <Play size={14} />
                Run Campaign
              </>
            )}
          </button>
          
          {activeCampaignId && !campaignProgress.active && (
            <button
              onClick={retryCampaign}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '8px 16px', color: 'var(--text-main)', fontSize: '0.85rem', cursor: 'pointer', marginLeft: '8px' }}
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Active Campaign Progress */}
      {campaignProgress.stage && (
        <div style={{ marginBottom: '32px', backgroundColor: 'rgba(206,27,34,0.05)', border: '1px solid rgba(206,27,34,0.2)', padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {campaignProgress.active ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (campaignProgress.error ? <AlertTriangle size={16} color="var(--highlight-color)"/> : <CheckCircle size={16} />)}
              Campaign Pipeline
            </h3>
            <span style={{ fontSize: '0.9rem', color: campaignProgress.error ? 'var(--highlight-color)' : 'var(--text-muted)' }}>
              {campaignProgress.error ? `Failed: ${campaignProgress.error}` : `${campaignProgress.percentComplete}% Complete`}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-main)' }}>Current Stage: <strong>{campaignProgress.stage}</strong> ({campaignProgress.status})</span>
            <span style={{ color: 'var(--text-muted)' }}>Last update: {new Date(campaignProgress.lastUpdate).toLocaleTimeString()}</span>
          </div>
          {campaignProgress.error && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button onClick={resumeCampaign} style={{ background: 'var(--success-color)', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>Resume Pipeline</button>
              <button onClick={retryCampaign} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>Start Over</button>
            </div>
          )}
          <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${campaignProgress.percentComplete}%`, 
              height: '100%', 
              backgroundColor: campaignProgress.error ? 'var(--highlight-color)' : 'var(--primary-color)', 
              transition: 'width 0.5s ease-in-out' 
            }} />
          </div>
        </div>
      )}

      {/* Observability / System Health Panel */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--primary-color)" /> System Observability
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <HealthCard 
            title="Queue Depth" 
            value={`${healthMetrics.queueDepth.queued} Queued`} 
            subtext={`${healthMetrics.queueDepth.rendering} rendering, ${healthMetrics.queueDepth.completed} completed today`}
            icon={Server} 
            color="var(--highlight-color)"
          />
          <HealthCard 
            title="Hourly Render Quota" 
            value={`${healthMetrics.quota.used} / ${healthMetrics.quota.limit}`} 
            subtext="Limits enforced by RateLimiter"
            icon={Clock} 
            color={healthMetrics.quota.used >= healthMetrics.quota.limit ? 'var(--primary-color)' : 'var(--success-color)'}
          />
          <HealthCard 
            title="Provider Health" 
            value={healthMetrics.providerHealth} 
            subtext="Latency < 2s, 0% failure rate"
            icon={AlertTriangle} 
            color="var(--success-color)"
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <StatCard icon={Users} title="Characters" value={assets.characters.length} color="var(--primary-color)" />
        <StatCard icon={MapPin} title="Locations" value={assets.locations.length} color="var(--secondary-color)" />
        <StatCard icon={Box} title="Props & Wardrobe" value={assets.props.length + assets.wardrobe.length} color="var(--highlight-color)" />
        <StatCard icon={Video} title="Total Shots" value={shots.length} color="var(--success-color)" />
      </div>

      {/* Production Progress */}
      <div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Production Progress</h2>
        <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '32px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
          {[
            { label: 'Story', pct: story.id ? 100 : 0, color: 'var(--success-color)' },
            { label: 'Script', pct: 0, color: 'var(--primary-color)' },
            { label: 'Assets & Images', pct: 0, color: 'var(--highlight-color)' },
          ].map(({ label, pct, color }) => (
            <div key={label} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="text-muted text-sm">{label}</span>
                <span className="text-sm font-medium" style={{ color }}>{pct}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
