import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthService } from '../../services/authService';
import { WorkspaceService } from '../../services/workspaceService';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { supabase } from '../../lib/supabase';
import { Loader } from 'lucide-react';

export default function ProtectedRoute() {
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    async function validateSession() {
      try {
        console.log('[ProtectedRoute] Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw new Error('No active session.');
        const user = session.user;
        console.log('[ProtectedRoute] Session valid. User ID:', user.id);

        console.log('[ProtectedRoute] Fetching workspaces...');
        const workspaces = await WorkspaceService.getUserWorkspaces();
        console.log('[ProtectedRoute] Workspaces returned:', workspaces);

        if (workspaces && workspaces.length > 0) {
          setActiveWorkspace(workspaces[0].id);
          setIsAuthenticated(true);
        } else {
          console.warn('[ProtectedRoute] No workspace found for user. Blocking access.');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('[ProtectedRoute] Auth validation failed:', err.message);
        setIsAuthenticated(false);
      } finally {
        setIsAuthenticating(false);
      }
    }
    
    validateSession();
  }, [setActiveWorkspace]);

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader className="w-8 h-8 text-[#CE1B22] animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
