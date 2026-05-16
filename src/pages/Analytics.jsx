import React from 'react';
import { BarChart3, TrendingUp, Users, Eye } from 'lucide-react';

const Analytics = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ padding: '1rem', background: '#eef2ff', borderRadius: '16px', color: 'var(--primary)' }}><Users size={24} /></div>
        <div><p className="stat-label">Pengikut Baru</p><div className="stat-value" style={{ fontSize: '1.5rem', margin: 0 }}>+1,284</div></div>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ padding: '1rem', background: '#ecfdf5', borderRadius: '16px', color: '#10b981' }}><Eye size={24} /></div>
        <div><p className="stat-label">Total Tayangan</p><div className="stat-value" style={{ fontSize: '1.5rem', margin: 0 }}>45.2K</div></div>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ padding: '1rem', background: '#fff1f2', borderRadius: '16px', color: '#e11d48' }}><TrendingUp size={24} /></div>
        <div><p className="stat-label">Engagement Rate</p><div className="stat-value" style={{ fontSize: '1.5rem', margin: 0 }}>4.8%</div></div>
      </div>
    </div>

    <div className="card" style={{ padding: '3rem', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Ringkasan Interaksi</h2>
          <p className="stat-label">Performa platform dalam 30 hari terakhir</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['Mingguan', 'Bulanan', 'Tahunan'].map(t => (
            <button key={t} style={{ padding: '0.5rem 1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: t === 'Bulanan' ? 'var(--primary)' : 'white', color: t === 'Bulanan' ? 'white' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
      </div>
      
      <div style={{ height: '320px', display: 'flex', alignItems: 'flex-end', gap: '3rem', padding: '0 2rem' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '100%', height: '65%', background: '#1877f2', borderRadius: '12px 12px 4px 4px', position: 'relative', boxShadow: '0 4px 12px rgba(24, 119, 242, 0.2)' }}>
            <span style={{ position: 'absolute', top: '-2rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 700 }}>65%</span>
          </div>
          <span className="stat-label" style={{ fontSize: '0.75rem' }}>Facebook</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '100%', height: '85%', background: 'linear-gradient(to top, #f09433, #bc1888)', borderRadius: '12px 12px 4px 4px', position: 'relative', boxShadow: '0 4px 12px rgba(188, 24, 136, 0.2)' }}>
            <span style={{ position: 'absolute', top: '-2rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 700 }}>85%</span>
          </div>
          <span className="stat-label" style={{ fontSize: '0.75rem' }}>Instagram</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '100%', height: '45%', background: '#000', borderRadius: '12px 12px 4px 4px', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <span style={{ position: 'absolute', top: '-2rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 700 }}>45%</span>
          </div>
          <span className="stat-label" style={{ fontSize: '0.75rem' }}>TikTok</span>
        </div>
      </div>
    </div>
  </div>
);

export default Analytics;
