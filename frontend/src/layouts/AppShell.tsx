import { Activity, BarChart3, Cpu, Database, LayoutDashboard, LogOut, Menu, Network, Radio, Settings2, X, Zap } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/AuthContext';
import { useState } from 'react';

const primary = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/datasets', label: 'Datasets', icon: Database },
  { to: '/app/analysis', label: 'Fairness analysis', icon: BarChart3 },
];
const modules = [
  { slug: 'sensor', label: 'Sensor fairness', icon: Radio },
  { slug: 'actuator', label: 'Actuator fairness', icon: Zap },
  { slug: 'communication', label: 'Communication', icon: Network },
  { slug: 'resource_allocation', label: 'Resource allocation', icon: Cpu },
];
const names: Record<string, string> = {
  '/app': 'Overview', '/app/datasets': 'Datasets', '/app/analysis': 'Fairness analysis', '/app/history': 'Analysis history', '/app/profile': 'Profile',
};

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const moduleName = modules.find((item) => location.pathname === `/app/modules/${item.slug}`)?.label;
  const title = moduleName || names[location.pathname] || 'FairIoT workspace';
  const initials = user?.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'F';
  function doLogout() { logout(); navigate('/'); }
  return (
    <div className="app-frame">
      {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, border: 0, background: 'rgba(16,42,67,.22)', zIndex: 29 }} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <Logo />
        <div className="workspace-label">Workspace</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          {primary.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={16} />{label}</NavLink>)}
        </nav>
        <div className="workspace-label">Fairness modules</div>
        <nav className="side-nav" aria-label="Fairness modules">
          {modules.map(({ slug, label, icon: Icon }) => <NavLink key={slug} to={`/app/modules/${slug}`} onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={15} />{label}</NavLink>)}
        </nav>
        <div className="workspace-label">Manage</div>
        <nav className="side-nav">
          <NavLink to="/app/history" onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Activity size={15} />Analysis history</NavLink>
          <NavLink to="/app/profile" onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Settings2 size={15} />Profile</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card"><div className="avatar">{initials}</div><div className="user-meta"><strong>{user?.full_name || 'FairIoT user'}</strong><span>{user?.email}</span></div><button className="icon-button" aria-label="Log out" title="Log out" onClick={doLogout}><LogOut size={15} /></button></div>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((value) => !value)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
            <div className="breadcrumb">Workspace <span style={{ padding: '0 7px', color: '#C2D0D9' }}>/</span><strong>{title}</strong></div>
          </div>
          <div className="topbar-right"><span className="topbar-label"><span className="status-dot" /> Private workspace</span><button className="icon-button" aria-label="Open profile" onClick={() => navigate('/app/profile')}><span className="avatar" style={{ width: 29, height: 29 }}>{initials}</span></button></div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
