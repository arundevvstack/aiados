import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { CreditCard, Activity, DollarSign, Package, Loader, ChevronRight } from 'lucide-react';

export default function BillingDashboard() {
  const { workspace } = useMemory();

  const { data: billingData, isLoading } = useQuery({
    queryKey: ['billing_ledger', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return null;
      const { data, error } = await supabase
        .from('render_cost_ledger')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });
        
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!workspace?.id
  });

  if (!workspace) {
    return <div className="p-6 text-muted">No active workspace detected. Please log in again.</div>;
  }

  // Calculate aggregates
  const totalRenders = billingData?.length || 0;
  const totalCost = (billingData || []).reduce((acc, item) => acc + (item.cost_credits || 0), 0);
  const quotaLimit = 1000; // Mock limit for Alpha
  const percentageUsed = Math.min((totalCost / quotaLimit) * 100, 100);

  return (
    <div className="p-6" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <CreditCard size={24} color="var(--primary-color)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Billing & Usage</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Track your GPU render costs and compute quota.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            <Activity size={18} /> <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>Usage Quota</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            {totalCost.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {quotaLimit.toLocaleString()} cr</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${percentageUsed}%`, height: '100%', 
              background: percentageUsed > 90 ? 'var(--highlight-color)' : 'var(--primary-color)' 
            }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {percentageUsed > 90 ? 'Approaching quota limit.' : 'Compute usage remains within normal bounds.'}
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            <DollarSign size={18} /> <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>Estimated Cost</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            ${(totalCost * 0.05).toFixed(2)}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated at $0.05 per render credit for visual intelligence pipeline.</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(206,27,34,0.1), transparent)', border: '1px solid var(--primary-color)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', marginBottom: '16px' }}>
            <Package size={18} /> <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>Active Plan</h3>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>
            Internal Alpha
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 20px', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Unlimited Team Members</li>
            <li>Real-time Orchestration</li>
            <li>Basic 1080p Render Output</li>
          </ul>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 500 }}>Ledger History</h3>
        </div>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><Loader className="spin" /></div>
        ) : billingData?.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No rendering activity recorded yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--panel-border)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Campaign/Run ID</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Engine Type</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {billingData.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {item.run_id ? item.run_id.split('-')[0] : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {item.engine_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)' }}>
                    {item.cost_credits} cr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
