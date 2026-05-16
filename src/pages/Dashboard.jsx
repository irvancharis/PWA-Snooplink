import React from 'react';
import { Image as ImageIcon, TrendingUp, Calendar, Zap } from 'lucide-react';

const Dashboard = ({ posts }) => {
  return (
    <>
      <div className="grid">
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <TrendingUp size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: '#10b981' }} />
          <p className="stat-label">Total Jangkauan</p>
          <div className="stat-value">{(posts.length * 1.2).toFixed(1)}K</div>
          <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <TrendingUp size={14} />
            <span>+12.5% minggu ini</span>
          </div>
        </div>
        
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Calendar size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: 'var(--primary)' }} />
          <p className="stat-label">Terjadwal</p>
          <div className="stat-value">{posts.filter(p => p.status === 'Scheduled').length}</div>
          <div style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <Zap size={14} />
            <span>Kampanye aktif</span>
          </div>
        </div>

        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Zap size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: 'var(--secondary)' }} />
          <p className="stat-label">Platform</p>
          <div className="stat-value">3</div>
          <div style={{ color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 600 }}>FB, IG, TikTok Terhubung</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Aktivitas Terbaru</h2>
        <button style={{ fontSize: '0.85rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Lihat Semua</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pratinjau</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Platform</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Konten</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Jadwal</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ImageIcon size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p style={{ fontWeight: 500 }}>Belum ada aktivitas. Postingan Anda akan muncul di sini.</p>
                </td></tr>
              ) : (
                posts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)', transition: '0.2s' }} className="table-row-hover">
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid var(--border-color)' }}>
                        {post.mediaUrl ? (
                          <img src={post.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={24} color="#cbd5e1" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div className={`social-badge social-${post.platform === 'instagram' ? 'ig' : (post.platform === 'tiktok' ? 'tt' : 'fb')}`} style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                         <i className={`fab fa-${post.platform === 'facebook' ? 'facebook-f' : post.platform}`}></i>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-main)' }}>
                        {post.content}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{post.time}</div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: post.status === 'Scheduled' ? '#eef2ff' : '#ecfdf5',
                        color: post.status === 'Scheduled' ? 'var(--primary)' : '#10b981',
                        padding: '0.4rem 1rem',
                        borderRadius: '50px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: `1px solid ${post.status === 'Scheduled' ? '#dbeafe' : '#d1fae5'}`
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                        {post.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .table-row-hover:hover {
          background: #f8fafc;
        }
      `}} />
    </>
  );
};

export default Dashboard;
