import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';
import { WorkspaceService } from './workspaceService';
import { ActivityLogService } from './activityLogService';

export const ProjectService = {
  async createProject(workspaceId, name) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    const project = await BaseService.handleQuery(
      supabase.from('projects').insert([{
        workspace_id: workspaceId,
        name,
        status: 'Planning'
      }]).select().single(),
      'ProjectService.createProject'
    );

    await ActivityLogService.log('PROJECT_CREATED', 'project', project.id);
    return project;
  },

  async getProjects(workspaceId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    return BaseService.handleQuery(
      supabase.from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      'ProjectService.getProjects'
    );
  },

  async archiveProject(workspaceId, projectId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    const result = await BaseService.handleQuery(
      supabase.from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId)
        .eq('workspace_id', workspaceId)
        .select().single(),
      'ProjectService.archiveProject'
    );

    await ActivityLogService.log('PROJECT_ARCHIVED', 'project', projectId);
    return result;
  }
};
