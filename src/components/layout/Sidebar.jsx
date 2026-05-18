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
  ShieldCheck
} from 'lucide-react';

const Sidebar = ({ activePage, onNavigate, onLogout, isOpen, onClose, user }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'scheduler', icon: Calendar, label: 'Create Post' },
    { id: 'queue', icon: List, label: 'List Schedule' },
    { id: 'media', icon: ImageIcon, label: 'Media Library' },
    { id: 'accounts', icon: Users, label: 'Accounts' },
  ];

  if (user?.role === 'admin') {
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
            >
              <item.icon size={20} />
              <span>{item.label}</span>
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
