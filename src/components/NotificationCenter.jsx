import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useMemory } from '../context/GlobalMemoryContext';
import { Bell, CheckCircle, Clock, Video, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const { workspace } = useMemory();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Poll for recent activity logs in the workspace
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      
      // Fetch recent 10 logs
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!workspace?.id,
    refetchInterval: 10000 // poll every 10 seconds
  });

  const unreadCount = notifications?.length || 0; // In a real app we'd track read state

  const getIconForAction = (action) => {
    if (action.includes('review')) return <CheckCircle size={16} color="var(--success-color)" />;
    if (action.includes('campaign')) return <Video size={16} color="var(--primary-color)" />;
    return <Clock size={16} color="var(--text-muted)" />;
  };

  const getMessageForAction = (log) => {
    switch (log.action) {
      case 'campaign_started': return `Campaign started for project ${log.metadata?.project_id?.split('-')[0]}`;
      case 'story_generated': return `Story generated for project ${log.metadata?.project_id?.split('-')[0]}`;
      case 'review_approved': return `Approved ${log.metadata?.queue_type} review`;
      case 'review_rejected': return `Rejected ${log.metadata?.queue_type} review`;
      case 'asset_edited': return `Edited ${log.metadata?.asset_type} asset`;
      default: return `New activity: ${log.action}`;
    }
  };

  const handleNotificationClick = (log) => {
    setIsOpen(false);
    if (log.action.includes('review')) navigate('/review');
    else if (log.action.includes('asset')) navigate('/assets');
    else if (log.action.includes('story')) navigate('/story');
    else navigate('/dashboard');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'transparent', border: 'none', cursor: 'pointer', 
          position: 'relative', padding: '8px', display: 'flex', alignItems: 'center' 
        }}
      >
        <Bell size={20} color={isOpen ? '#fff' : 'var(--text-muted)'} />
        {unreadCount > 0 && (
          <div style={{ 
            position: 'absolute', top: '6px', right: '6px', 
            width: '8px', height: '8px', background: 'var(--primary-color)', 
            borderRadius: '50%' 
          }} />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)} 
            style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
          />
          <div style={{ 
            position: 'absolute', top: '100%', right: '0', marginTop: '8px',
            width: '320px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', 
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 100,
            maxHeight: '400px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ padding: '24px', textAlign: 'center' }}><Loader className="spin" size={16} /></div>
              ) : notifications?.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No recent activity
                </div>
              ) : (
                notifications.map(log => (
                  <div 
                    key={log.id} 
                    onClick={() => handleNotificationClick(log)}
                    style={{ 
                      padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', gap: '12px', cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ paddingTop: '2px' }}>{getIconForAction(log.action)}</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{getMessageForAction(log)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
