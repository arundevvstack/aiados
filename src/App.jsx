import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useMatch } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboard, BookOpen, FileText, Database, Image as ImageIcon, Video, Download, Sparkles, X, CheckCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ScriptEngine from './components/ScriptEngine';
import StoryGenerator from './pages/StoryGenerator';
import AssetEngine from './pages/AssetEngine';
import ReviewQueue from './pages/ReviewQueue';
import VisualIdentityCenter from './pages/VisualIdentityCenter';
import ShotList from './pages/ShotList';
import WorkspaceSettings from './pages/WorkspaceSettings';
import BillingDashboard from './pages/BillingDashboard';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NotificationCenter from './components/NotificationCenter';
import { Settings, CreditCard } from 'lucide-react';
import { useMemory } from './context/GlobalMemoryContext';
import './index.css';

const queryClient = new QueryClient();

const ExportCenter = () => <div className="p-6"><h1>Export Package</h1><p className="text-muted mt-2">Download production assets</p></div>;

const NavItem = ({ to, icon: Icon, label }) => {
  const match = useMatch(to);
  const isActive = Boolean(match);
  return (
    <NavLink to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      <span>{label}</span>
    </NavLink>
  );
};



const AppLayout = () => {
  const { selectedAsset, setSelectedAsset } = useMemory();
  const [aiCommand, setAiCommand] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);

  const handleAiSubmit = async () => {
    if (!aiCommand.trim() || aiLoading) return;
    setAiLoading(true);
    console.log('[AI Command]:', aiCommand);
    setTimeout(() => { setAiLoading(false); setAiCommand(''); }, 1200);
  };

  return (
    <div className="app-container">
      <nav className="sidebar-nav-container glass-panel">
        <div className="brand-header">AD<span>GRAVITY</span></div>
        <div className="nav-menu">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Projects" />
          <div style={{ margin: '16px 0 8px 20px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Production</div>
          <NavItem to="/story" icon={BookOpen} label="Story" />
          <NavItem to="/script" icon={FileText} label="Script" />
          <NavItem to="/assets" icon={Database} label="Assets" />
          <NavItem to="/images" icon={ImageIcon} label="Images" />
          <NavItem to="/shots" icon={Video} label="Shots" />
          <NavItem to="/review" icon={CheckCircle} label="Reviews" />
          <div style={{ margin: '16px 0 8px 20px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Deliverables</div>
          <NavItem to="/exports" icon={Download} label="Exports" />
          <div style={{ margin: '16px 0 8px 20px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>System</div>
          <NavItem to="/settings" icon={Settings} label="Team & Settings" />
          <NavItem to="/billing" icon={CreditCard} label="Billing & Usage" />
        </div>
      </nav>

      <main className="main-workspace glass-panel" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
          <NotificationCenter />
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="story" element={<StoryGenerator />} />
          <Route path="script" element={<ScriptEngine />} />
          <Route path="assets" element={<AssetEngine />} />
          <Route path="images" element={<VisualIdentityCenter />} />
          <Route path="shots" element={<ShotList />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="exports" element={<ExportCenter />} />
          <Route path="settings" element={<WorkspaceSettings />} />
          <Route path="billing" element={<BillingDashboard />} />
        </Routes>
        </div>
      </main>

      <aside className="context-panel glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asset Intelligence</h3>
          {selectedAsset && (
            <button onClick={() => setSelectedAsset(null)} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', padding: '6px', display: 'flex' }}>
              <X size={16} />
            </button>
          )}
        </div>
        {selectedAsset ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'inline-block', background: 'var(--primary-glow)', color: 'var(--primary-color)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>{selectedAsset.type}</div>
              <h4 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)' }}>{selectedAsset.name}</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(selectedAsset).map(([key, value]) => {
                if (['id', 'type', 'name', 'references'].includes(key)) return null;
                return (
                  <div key={key} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{key}</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', padding: '32px', border: '1px dashed var(--panel-border)', borderRadius: '16px' }}>
            Select a smart @asset to view its intelligence matrix.
          </div>
        )}
      </aside>

      <footer className="floating-dock glass-panel">
        <div className="ai-command-wrapper">
          <Sparkles size={24} color="var(--primary-color)" style={{ filter: 'drop-shadow(0 0 8px var(--primary-color))' }} />
          <input
            type="text"
            value={aiCommand}
            onChange={e => setAiCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
            placeholder="Command AI: Generate a cinematic sequence using @amara..."
            className="ai-input"
          />
          <button
            onClick={handleAiSubmit}
            disabled={!aiCommand.trim() || aiLoading}
            style={{
              background: aiCommand.trim() ? 'linear-gradient(135deg, #CE1B22, #a8141b)' : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: '10px', padding: '10px 20px',
              color: aiCommand.trim() ? '#fff' : 'var(--text-muted)',
              fontSize: '0.85rem', fontWeight: 600,
              cursor: aiCommand.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '8px',
              whiteSpace: 'nowrap', transition: 'all 0.2s ease',
              boxShadow: aiCommand.trim() ? '0 0 20px rgba(206,27,34,0.3)' : 'none',
              flexShrink: 0,
            }}
          >
            {aiLoading ? 'Processing...' : '⬆ Send'}
          </button>
        </div>
      </footer>
    </div>
  );
};


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected OS App Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
