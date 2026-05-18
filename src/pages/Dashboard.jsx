import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileImage, X, RefreshCw, TrendingUp, Calendar, Zap, Sliders, CheckCircle2 } from 'lucide-react';

const Dashboard = ({ posts: allPosts, onUseMedia, user, onViewAll }) => {
  const posts = allPosts.filter(p => p.status !== 'Deleted');
  const [selectedPost, setSelectedPost] = useState(null);

  const isVideo = (post) => {
    if (post.mediaType?.startsWith('video/')) return true;
    const url = post.mediaUrl;
    if (!url) return false;
    return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i);
  };

  const isDriveUrl = (url) => url && url.includes("drive.google.com");

  const getDirectLink = (url) => {
    if (!url) return '';
    try {
      if (url.includes('drive.google.com') && url.includes('id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        }
      }
    } catch (e) { console.error("URL Error", e); }
    return url;
  };

  // Calculate posts scheduled for today
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const todayPostsCount = posts.filter(p => p.time && p.time.startsWith(todayStr) && p.status !== 'Failed' && p.status !== 'Deleted').length;
  const dailyLimit = user?.dailyPostLimit !== undefined ? user.dailyPostLimit : 5;
  const totalPublished = posts.filter(p => p.status?.toLowerCase() === 'published' || p.status?.toLowerCase() === 'success').length;

  return (
    <>
      <div className="grid">
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <CheckCircle2 size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: '#10b981' }} />
          <p className="stat-label">Total Published</p>
          <div className="stat-value">{totalPublished}</div>
          <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <span>Postingan berhasil terbit</span>
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
          <Sliders size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: '#f59e0b' }} />
          <p className="stat-label">Kuota Harian</p>
          <div className="stat-value">{todayPostsCount} / {dailyLimit}</div>
          <div style={{ color: '#f59e0b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <span>Jadwal Hari Ini</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Aktivitas Terbaru</h2>
        <button onClick={onViewAll} style={{ fontSize: '0.85rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Lihat Semua</button>
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
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)', transition: '0.2s', cursor: 'pointer' }} className="table-row-hover" onClick={() => setSelectedPost(post)}>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', background: isVideo(post) ? '#eef2ff' : '#f0fdf4', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {post.mediaUrl ? (
                          isVideo(post) ? <Video size={20} color="var(--primary)" /> : <FileImage size={20} color="#10b981" />
                        ) : (
                          <ImageIcon size={20} color="#cbd5e1" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div className={`social-badge social-${post.platform === 'instagram' ? 'ig' : (post.platform === 'tiktok' ? 'tt' : (post.platform === 'youtube' ? 'yt' : 'fb'))}`} style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: post.status === 'Scheduled' ? '#eef2ff' : (post.status === 'Error' ? '#fee2e2' : '#ecfdf5'),
                          color: post.status === 'Scheduled' ? 'var(--primary)' : (post.status === 'Error' ? '#ef4444' : '#10b981'),
                          padding: '0.4rem 1rem',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: `1px solid ${post.status === 'Scheduled' ? '#dbeafe' : (post.status === 'Error' ? '#fecaca' : '#d1fae5')}`
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                          {post.status.toUpperCase()}
                        </div>
                        {post.status === 'Error' && post.error_log && (
                          <div style={{ fontSize: '0.6rem', color: '#ef4444', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                            {post.error_log}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }} onClick={() => setSelectedPost(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: 0, overflow: 'hidden', background: '#fff', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPost(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <X size={20} />
            </button>

            <div style={{ width: '100%', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', maxHeight: '70vh', padding: '1rem' }}>
              {isDriveUrl(selectedPost?.mediaUrl) ? (
                <div style={{ width: '100%', height: '60vh', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                   <iframe src={selectedPost.mediaUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
                </div>
              ) : isVideo(selectedPost) ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <video 
                    src={selectedPost.mediaUrl} 
                    controls 
                    autoPlay 
                    style={{ maxWidth: '100%', maxHeight: '60vh' }}
                    onError={(e) => {
                      console.log("Video playback failed, likely due to Drive processing or permissions.");
                    }}
                  />
                  <div style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.7, textAlign: 'center', marginTop: '0.5rem' }}>
                    Jika video tidak muncul, Google Drive mungkin masih memproses file Anda.
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <img src={getDirectLink(selectedPost.mediaUrl)} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                  <a 
                    href={selectedPost.mediaUrl.includes('id=') ? `https://drive.google.com/file/d/${selectedPost.mediaUrl.split('id=')[1].split('&')[0]}/view` : selectedPost.mediaUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.7, textDecoration: 'underline' }}
                  >
                    Buka gambar di tab baru jika tidak muncul
                  </a>
                </div>
              )}
            </div>

            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, marginRight: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem' }}>Pratinjau Postingan</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{selectedPost.content}</p>
              </div>
              {onUseMedia && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    onUseMedia(selectedPost.mediaUrl);
                    setSelectedPost(null);
                  }}
                >
                  <RefreshCw size={18} />
                  <span>Gunakan Lagi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .table-row-hover:hover {
          background: #f8fafc;
        }
      `}} />
    </>
  );
};

export default Dashboard;
