import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * ADGRAVITY OS — useCampaignProgress
 * 
 * Subscribes to Supabase Realtime events to track campaign orchestration progress.
 * Replaces fake setTimeouts with real database-driven UI updates.
 * 
 * Listens to:
 * - campaign_checkpoints (Orchestrator stage progression)
 */
export function useCampaignProgress(campaignId) {
  const [progress, setProgress] = useState({
    active: false,
    stage: null,
    status: null,
    percentComplete: 0,
    lastUpdate: null,
    error: null,
  });

  useEffect(() => {
    if (!campaignId) {
      setProgress(p => ({ ...p, active: false }));
      return;
    }

    setProgress({
      active: true,
      stage: 'Initializing',
      status: 'pending',
      percentComplete: 0,
      lastUpdate: new Date().toISOString(),
      error: null,
    });

    const calculatePercent = (stage, status) => {
      const stages = [
        'story_generation',
        'script_generation',
        'asset_extraction',
        'visual_identity',
        'shot_planning',
        'render_queue'
      ];
      const index = stages.indexOf(stage);
      if (index === -1) return 0;
      
      const base = (index / stages.length) * 100;
      const boost = status === 'completed' ? (100 / stages.length) : 0;
      return Math.min(100, Math.round(base + boost));
    };

    const formatStageName = (stage) => {
      return stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Load initial state
    const fetchCurrentState = async () => {
      const { data } = await supabase
        .from('campaign_checkpoints')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        const latest = data[0];
        setProgress({
          active: latest.status !== 'failed' && latest.stage !== 'render_queue' || latest.status === 'running',
          stage: formatStageName(latest.stage),
          status: latest.status,
          percentComplete: calculatePercent(latest.stage, latest.status),
          lastUpdate: latest.updated_at,
          error: latest.status === 'failed' ? 'Stage failed' : null,
        });
      }
    };
    
    fetchCurrentState();

    // Subscribe to realtime changes
    const channel = supabase.channel(`campaign_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_checkpoints',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const record = payload.new;
          setProgress({
            active: record.status !== 'failed' && !(record.stage === 'render_queue' && record.status === 'completed'),
            stage: formatStageName(record.stage),
            status: record.status,
            percentComplete: calculatePercent(record.stage, record.status),
            lastUpdate: record.updated_at,
            error: record.status === 'failed' ? (record.output?.reason || 'Unknown error') : null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  return progress;
}
