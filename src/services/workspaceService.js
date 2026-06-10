import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';
import { ActivityLogService } from './activityLogService';

export const WorkspaceService = {
  async validateWorkspaceAccess(workspaceId) {
    const user = await BaseService.requireAuth();

    const { data: membership, error } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (error || !membership) {
      throw new Error('Unauthorized: You do not have access to this workspace.');
    }

    return membership;
  },

  async getUserWorkspaces() {
    const user = await BaseService.requireAuth();
    
    return BaseService.handleQuery(
      supabase
        .from('workspaces')
        .select(`
          id, name, tier, created_at,
          workspace_members!inner(role)
        `)
        .eq('workspace_members.user_id', user.id)
        .is('deleted_at', null),
      'WorkspaceService.getUserWorkspaces'
    );
  }
};
