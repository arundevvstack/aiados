import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, Eye, Filter, Loader } from 'lucide-react';
import { ActivityLogService } from '../services/activityLogService';

export default function ReviewQueue() {
  const { workspace, activeProject } = useMemory();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected
  const [queueType, setQueueType] = useState('visual'); // generation, visual, render

  const { data: queueItems, isLoading } = useQuery({
    queryKey: ['review_queue', activeProject, queueType, activeTab],
    queryFn: async () => {
      if (!workspace?.id || !activeProject) return [];
      
      const tableName = `${queueType}_review_queue`;
      let statusQuery = activeTab;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('status', statusQuery)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') return []; // Table doesn't exist yet/mock fallback
        throw error;
      }
      return data;
    },
    enabled: !!activeProject && !!workspace?.id
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, comments }) => {
      const tableName = `${queueType}_review_queue`;
      const { error } = await supabase
        .from(tableName)
        .update({ 
          status, 
          reviewer_comments: comments,
          reviewed_at: new Date().toISOString(),
          reviewed_by: workspace.id // Mock reviewer id as workspace id for now
        })
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['review_queue', activeProject, queueType]);
      // Analytics Tracking
      ActivityLogService.logReviewDecision(queueType, variables.id, variables.status).catch(console.warn);
    }
  });

  if (!activeProject) {
    return <div className="p-6 text-muted">Please select a project from the Dashboard first.</div>;
  }

  const QueueCard = ({ item }) => {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeTab === 'pending' ? <Clock size={16} color="var(--highlight-color)" /> : 
             activeTab === 'approved' ? <CheckCircle size={16} color="var(--success-color)" /> : 
             <XCircle size={16} color="var(--primary-color)" />}
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              {queueType} Review • {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
            {item.id.split('-')[0]}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{item.reference_id || 'Generation Result'}</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {JSON.stringify(item.payload || item.context_snapshot)}
          </p>
        </div>

        {activeTab === 'pending' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <button 
              onClick={() => reviewMutation.mutate({ id: item.id, status: 'approved', comments: '' })}
              disabled={reviewMutation.isLoading}
              style={{ flex: 1, background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.3)', borderRadius: '8px', padding: '8px', color: 'var(--success-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <CheckCircle size={16} /> Approve
            </button>
            <button 
              onClick={() => reviewMutation.mutate({ id: item.id, status: 'rejected', comments: 'Rejected by human reviewer' })}
              disabled={reviewMutation.isLoading}
              style={{ flex: 1, background: 'rgba(206, 27, 34, 0.1)', border: '1px solid rgba(206, 27, 34, 0.3)', borderRadius: '8px', padding: '8px', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <XCircle size={16} /> Reject
            </button>
          </div>
        )}
        
        {item.reviewer_comments && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>Comments:</strong> {item.reviewer_comments}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6" style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(206,27,34,0.1)', padding: '12px', borderRadius: '12px' }}>
            <Eye size={24} color="var(--primary-color)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Review Queue</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Human-in-the-loop approval workflows.</p>
          </div>
        </div>

        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '4px' }}>
          {['generation', 'visual', 'render'].map(type => (
            <button
              key={type}
              onClick={() => setQueueType(type)}
              style={{
                background: queueType === type ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none', borderRadius: '6px', padding: '6px 16px',
                color: queueType === type ? '#fff' : 'var(--text-muted)',
                fontSize: '0.85rem', textTransform: 'capitalize', cursor: 'pointer', fontWeight: queueType === type ? 600 : 400
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--panel-border)', marginBottom: '24px', paddingBottom: '12px' }}>
        {['pending', 'approved', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent', border: 'none', 
              color: activeTab === tab ? (tab === 'pending' ? 'var(--highlight-color)' : tab === 'approved' ? 'var(--success-color)' : 'var(--primary-color)') : 'var(--text-muted)',
              fontSize: '1rem', textTransform: 'capitalize', cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {tab === 'pending' ? <Clock size={16} /> : tab === 'approved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {tab}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader className="spin" color="var(--primary-color)" /></div>
        ) : queueItems?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
            <CheckCircle size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
            <h3>No items to review</h3>
            <p>The {queueType} queue is currently empty for {activeTab} items.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {queueItems.map(item => <QueueCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
