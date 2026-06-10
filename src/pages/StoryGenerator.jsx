import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Sparkles, Loader, CheckCircle, Save, RotateCw } from 'lucide-react';
import { ActivityLogService } from '../services/activityLogService';

export default function StoryGenerator() {
  const { workspace, activeProject, story, setStory } = useMemory();
  const queryClient = useQueryClient();

  const [brief, setBrief] = useState(story?.concept || '');
  const [objective, setObjective] = useState(story?.objective || 'Brand Awareness');
  const [audience, setAudience] = useState(story?.audience || 'General');
  const [tone, setTone] = useState(story?.tone || 'Cinematic');

  // Mutation to call AIGateway Edge Function for Story Generation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !activeProject) throw new Error('No active project selected.');

      // Simulate Edge Function latency
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock Response for Alpha
      const variation = Math.floor(Math.random() * 1000);
      const generatedStory = {
        id: story?.id || crypto.randomUUID(),
        concept: brief,
        objective,
        audience,
        tone,
        content: `[GENERATED NARRATIVE - ${tone} TONE - VAR ${variation}]\n\nSCENE START\n\nFADE IN:\n\nINT. VIRTUAL STUDIO - DAY\n\nA dynamic visualization of the core concept: "${brief}".\nThe camera sweeps across the product, highlighting its key features tailored for the ${audience} audience.\n\nThe objective is clear: ${objective}.\n\nFADE OUT.\n\nSCENE END`
      };

      return generatedStory;
    },
    onSuccess: (generatedStory) => {
      setStory(generatedStory);
      queryClient.invalidateQueries(['project_story', activeProject]);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspace?.id || !activeProject || !story?.id) return;
      
      const { error } = await supabase
        .from('campaign_stories')
        .upsert({
          id: story.id,
          project_id: activeProject,
          workspace_id: workspace.id,
          concept: brief,
          objective,
          audience,
          tone,
          content: story.content
        }, { onConflict: 'id' });

      if (error) throw error;
      
      // Analytics Tracking
      ActivityLogService.logStoryGenerated(story.id, activeProject).catch(console.warn);
    }
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!brief.trim()) return;
    generateMutation.mutate();
  };

  if (!activeProject) {
    return <div className="p-6 text-muted">Please select a project from the Dashboard first.</div>;
  }

  return (
    <div className="p-6" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(206,27,34,0.1)', padding: '12px', borderRadius: '12px' }}>
          <BookOpen size={24} color="var(--primary-color)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Story Generator</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Define the creative brief and generate the narrative foundation.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Input Panel */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary-color)" /> Creative Brief
          </h2>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Core Concept
              </label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="e.g. A neon-lit cyberpunk car chase highlighting the new electric engine..."
                style={{
                  width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
                  borderRadius: '12px', padding: '16px', color: 'var(--text-main)', fontSize: '0.95rem', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Objective</label>
                <input
                  type="text" value={objective} onChange={e => setObjective(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Audience</label>
                <input
                  type="text" value={audience} onChange={e => setAudience(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Tone</label>
                <input
                  type="text" value={tone} onChange={e => setTone(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!brief.trim() || generateMutation.isLoading}
              style={{
                marginTop: '12px',
                background: 'linear-gradient(135deg, #CE1B22, #a8141b)',
                border: 'none', borderRadius: '12px', padding: '14px',
                color: '#fff', fontSize: '1rem', fontWeight: 600,
                cursor: (!brief.trim() || generateMutation.isLoading) ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: (!brief.trim() || generateMutation.isLoading) ? 0.7 : 1
              }}
            >
              {generateMutation.isLoading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
              {generateMutation.isLoading ? 'Generating Narrative...' : 'Generate Story'}
            </button>
            {generateMutation.isError && <div style={{ color: 'var(--highlight-color)', fontSize: '0.85rem', marginTop: '8px' }}>Error: {generateMutation.error.message}</div>}
          </form>
        </div>

        {/* Output Panel */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--secondary-color)" /> Generated Narrative
            </h2>
            
            {story?.content && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isLoading}
                  style={{ background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCw size={14} /> Regenerate
                </button>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isLoading}
                  style={{ background: 'var(--success-color)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                >
                  {saveMutation.isLoading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                  {saveMutation.isSuccess ? 'Saved!' : 'Save Story'}
                </button>
              </div>
            )}
            {saveMutation.isError && <div style={{ color: 'var(--highlight-color)', fontSize: '0.85rem', marginTop: '8px', textAlign: 'right' }}>Error saving: {saveMutation.error.message}</div>}
          </div>

          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '24px', border: '1px dashed var(--panel-border)', overflowY: 'auto' }}>
            {generateMutation.isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '16px' }}>
                <Loader size={32} color="var(--primary-color)" style={{ animation: 'spin 1s linear infinite' }} />
                <p>AI is crafting the narrative...</p>
              </div>
            ) : story?.content ? (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {story.content}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Enter a brief and generate a story to see it here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
