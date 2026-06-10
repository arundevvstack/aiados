import { supabase } from '../lib/supabase.js';
import { BaseService } from './baseService.js';
import { SnapshotOrchestrator } from './snapshotOrchestrator.js';
import { WorkspaceService } from './workspaceService';

export const ScriptService = {
  async getScript(workspaceId, projectId) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    // We assume 1 script per project for MVP
    const script = await BaseService.handleQuery(
      supabase.from('scripts').select('*')
        .eq('project_id', projectId)
        .single(),
      'ScriptService.getScript'
    );
    return script;
  },

  async saveScript(workspaceId, projectId, scriptId, documentJson, documentHtml) {
    await WorkspaceService.validateWorkspaceAccess(workspaceId);
    
    // Update the script table
    const script = await BaseService.handleQuery(
      supabase.from('scripts').update({
        content: documentHtml, // Plain HTML for generic rendering
        json_content: documentJson // Structured TipTap JSON
      }).eq('id', scriptId).select().single(),
      'ScriptService.saveScript'
    );

    // CTO Architecture: Application-Layer Snapshot Orchestration (Phase 3)
    const syncResult = await SnapshotOrchestrator.orchestrateSave(
      workspaceId,
      projectId,
      'script',
      scriptId,
      documentJson
    );

    return { script, syncResult };
  }
};
