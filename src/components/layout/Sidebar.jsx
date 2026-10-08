import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  List,
  Image as ImageIcon, 
  Users, 
  LineChart, 
  Settings, 
  LogOut, 
  Rocket,
  ShieldCheck,
  Server,
  Film,
  RefreshCw
} from 'lucide-react';

const Sidebar = ({ activePage, onNavigate, onLogout, isOpen, onClose, user, posts = [] }) => {
  const unpublishedCount = posts.filter(p => {
    const s = (p.status || '').toLowerCase();
    return s !== 'published' && s !== 'completed';
  }).length;

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'scheduler', icon: Calendar, label: 'Create Post' },
    { id: 'video-editor', icon: Film, label: 'Video Editor' },
    { id: 'queue', icon: List, label: 'List Schedule', badge: unpublishedCount > 0 ? unpublishedCount : null },
    { id: 'media', icon: ImageIcon, label: 'Media Library' },
    { id: 'accounts', icon: Users, label: 'Accounts' },
    { id: 'recovery', icon: RefreshCw, label: 'Recovery Panel' },
  ];

  const isSuperAdmin = user?.role === 'admin' || user?.email === 'irvancharis@gmail.com';

  if (isSuperAdmin) {
    menuItems.push({ id: 'servers', icon: Server, label: 'Streaming Server' });
    menuItems.push({ id: 'admin', icon: ShieldCheck, label: 'Superadmin' });
  }

  const handleNavigate = (id) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo">
          <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={24} color="white" fill="white" />
          </div>
          <span>Snooplink</span>
        </div>
        
        <nav className="nav-links">
          {menuItems.map((item) => (
            <div 
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  minWidth: '20px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.2rem 0.5rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.95rem',
              flexShrink: 0
            }}>
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'User'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || ''}
              </span>
            </div>
          </div>

          <div className="nav-item" onClick={onLogout} style={{ color: '#ef4444', padding: '0.6rem 0.8rem' }}>
            <LogOut size={18} />
            <span>Keluar</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
