import { create } from 'zustand';

export const useWorkspaceStore = create((set) => ({
  activeWorkspaceId: null,
  activeProjectId: null,
  isSidebarOpen: true,

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
