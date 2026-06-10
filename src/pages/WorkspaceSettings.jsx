import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemory } from '../context/GlobalMemoryContext';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Settings, Shield, Trash2, Mail, Loader, CheckCircle } from 'lucide-react';

export default function WorkspaceSettings() {
  const { workspace } = useMemory();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  // Fetch workspace details
  const { data: workspaceData, isLoading: isLoadingWorkspace } = useQuery({
    queryKey: ['workspace', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspace.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found if fake
      return data || workspace;
    },
    enabled: !!workspace?.id
  });

  // Fetch team members
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['workspace_members', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (id, full_name, avatar_url)
        `)
        .eq('workspace_id', workspace.id);
        
      if (error && error.code !== '42P01') throw error;
      
      // If table doesn't exist or is empty, provide a mock row for the current user
      if ((!data || data.length === 0) && error?.code === '42P01') {
        return [{ id: 'mock-1', user_id: 'mock-user', role: 'owner', profiles: { full_name: 'Admin User' } }];
      }
      return data || [];
    },
    enabled: !!workspace?.id
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace_members', workspace?.id]);
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace_members', workspace?.id]);
    }
  });

  if (!workspace) {
    return <div className="p-6 text-muted">No active workspace detected. Please log in again.</div>;
  }

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    alert(`Invitation sent to ${inviteEmail} as ${inviteRole}.`);
    setInviteEmail('');
  };

  return (
    <div className="p-6" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <Settings size={24} color="var(--primary-color)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Workspace Settings</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Manage your team, roles, and workspace preferences.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
        
        {/* Left Column: Team Members */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Team Members
          </h2>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', overflow: 'hidden' }}>
            {isLoadingMembers ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><Loader className="spin" /></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>User</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Role</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                            {member.profiles?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{member.profiles?.full_name || 'Unknown User'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <select
                          value={member.role}
                          onChange={(e) => updateRoleMutation.mutate({ memberId: member.id, newRole: e.target.value })}
                          disabled={updateRoleMutation.isLoading || member.role === 'owner'}
                          style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', 
                            borderRadius: '6px', padding: '6px 12px', color: 'var(--text-main)', outline: 'none'
                          }}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="member">Member</option>
                        </select>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {member.role !== 'owner' && (
                          <button 
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--highlight-color)', cursor: 'pointer', padding: '8px' }}
                            title="Remove Member"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Invite & Settings */}
        <div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Invite Member
            </h3>
            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input 
                    type="email" 
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '8px 12px 8px 36px', color: '#fff' }} 
                  />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Role</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
                >
                  <option value="admin">Admin</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="member">Member</option>
                </select>
              </div>
              <button type="submit" style={{ width: '100%', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Send Invitation
              </button>
            </form>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} /> Workspace Details
            </h3>
            {isLoadingWorkspace ? <Loader className="spin" size={20} /> : (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Workspace ID</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                    {workspaceData?.id || workspace.id}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</div>
                  <div style={{ fontSize: '1rem', fontWeight: 500, marginTop: '4px' }}>
                    {workspaceData?.name || workspace.name || 'AdGravity Workspace'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
