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
  Rocket 
} from 'lucide-react';

const Sidebar = ({ activePage, onNavigate, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'scheduler', icon: Calendar, label: 'Create Post' },
    { id: 'queue', icon: List, label: 'List Schedule' },
    { id: 'media', icon: ImageIcon, label: 'Media Library' },
    { id: 'accounts', icon: Users, label: 'Accounts' },
    { id: 'analytics', icon: LineChart, label: 'Analytics' },
  ];

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

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          <div className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => handleNavigate('settings')}>
            <Settings size={20} />
            <span>Pengaturan</span>
          </div>
          <div className="nav-item" onClick={onLogout} style={{ color: '#ef4444' }}>
            <LogOut size={20} />
            <span>Keluar</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
