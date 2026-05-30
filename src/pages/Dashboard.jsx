import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileImage, X, RefreshCw, TrendingUp, Calendar, Zap, Sliders, CheckCircle2, Repeat, ExternalLink, Square } from 'lucide-react';

const Dashboard = ({ posts: allPosts, accounts = [], onUpdate, onUseMedia, user, onViewAll }) => {
  const posts = allPosts.filter(p => p.status !== 'Deleted');
  const [selectedPost, setSelectedPost] = useState(null);
  const [stoppingIds, setStoppingIds] = useState({});

  const handleStopLive = async (post) => {
    if (!window.confirm("Apakah Anda yakin ingin menghentikan siaran live ini secara paksa?")) return;
    
    setStoppingIds(prev => ({ ...prev, [post.id]: true }));
    try {
      const account = accounts.find(a => a.id === post.accountId);
      let serverUrl = account?.liveServerUrl || "https://irvancharis-live1.hf.space";
      serverUrl = serverUrl.replace(/\/$/, "");
      
      const HF_SECRET = 'SnooplinkSuperSecret123';
      
      const stopUrl = `${serverUrl}/stop_stream?postId=${post.id}&secret=${HF_SECRET}`;
      console.log("Triggering stop live:", stopUrl);
      
      const res = await fetch(stopUrl, {
        method: 'POST'
      });
      
      const resData = await res.json();
      if (resData.status === 'success' || res.ok) {
        alert("Sinyal penghentian siaran live berhasil dikirim ke server.");
        if (onUpdate) {
          await onUpdate(post.id, { 
            status: 'Failed',
            error_log: 'Siaran dihentikan secara manual oleh pengguna dari Dashboard.'
          });
        }
      } else {
        throw new Error(resData.message || "Gagal menghubungi server live.");
      }
    } catch (err) {
      console.error(err);
      if (window.confirm("Gagal menghubungi server live. Apakah Anda ingin menghentikan paksa status di database Firestore saja?")) {
        if (onUpdate) {
          await onUpdate(post.id, {
            status: 'Failed',
            error_log: 'Siaran dihentikan paksa oleh pengguna di database (Server offline).'
          });
        }
      }
    } finally {
      setStoppingIds(prev => ({ ...prev, [post.id]: false }));
      setSelectedPost(null);
    }
  };

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
          <div className="stat-value">
            {user?.role === 'admin' || user?.email === 'irvancharis@gmail.com' ? `${todayPostsCount} / Tidak Terbatas` : `${todayPostsCount} / ${dailyLimit}`}
          </div>
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
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Judul</th>
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
                posts.slice(0, 5).map(post => (
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '300px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-main)' }}>
                          {post.postType === 'live'
                            ? (post.ytTitle || post.ytTitleTemplate || 'Tanpa Judul')
                            : (post.ytTitle || post.ytTitleTemplate || (post.content ? (post.content.split('\n')[0].substring(0, 50) + (post.content.length > 50 ? '...' : '')) : 'Tanpa Judul'))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {post.postType === 'live' && (
                            <span style={{ 
                              background: '#fee2e2', 
                              color: '#ef4444', 
                              fontSize: '0.6rem', 
                              padding: '0.05rem 0.3rem', 
                              borderRadius: '4px', 
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.1rem',
                              border: '1px solid #fca5a5'
                            }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                              LIVE
                            </span>
                          )}
                          {post.isAutoLoop && (
                            <span style={{ 
                              background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', 
                              color: '#7c3aed', 
                              fontSize: '0.6rem', 
                              padding: '0.05rem 0.3rem', 
                              borderRadius: '4px', 
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.15rem',
                              border: '1px solid #ddd6fe'
                            }}>
                              <Repeat size={10} />
                              AUTO LOOP
                            </span>
                          )}
                        </div>
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
                        {post.ytMetadataWarning && (
                          <div style={{ 
                            fontSize: '0.6rem', 
                            color: '#d97706', 
                            fontStyle: 'italic', 
                            paddingLeft: '0.5rem',
                            maxWidth: '180px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            marginTop: '0.2rem'
                          }}>
                            ⚠️ {post.ytMetadataWarning}
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
                  {selectedPost.url && (
                    <a 
                      href={selectedPost.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn"
                      style={{ 
                        background: selectedPost.url.includes('localhost') ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)', 
                        color: '#fff', 
                        border: 'none', 
                        fontSize: '0.85rem', 
                        marginTop: '0.5rem', 
                        padding: '0.6rem 1.2rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        textDecoration: 'none'
                      }}
                    >
                      {selectedPost.url.includes('localhost') ? '🚀 Tonton Video Hasil Render' : '📺 Tonton di YouTube'}
                      <ExternalLink size={14} />
                    </a>
                  )}
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

            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {selectedPost.postType === 'live' && <Zap size={16} color="#ef4444" />}
                    {selectedPost.postType === 'live' ? 'Detail Live Stream' : 'Detail Postingan'}
                  </h3>

                  {selectedPost.isAutoLoop && (
                    <div style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                      color: '#7c3aed',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: '1px solid #ddd6fe',
                      marginBottom: '1rem'
                    }}>
                      <Repeat size={12} />
                      JADWAL AUTO LOOP (SIARAN BERULANG 24/7)
                    </div>
                  )}

                  {selectedPost.ytTitle && (
                    <div style={{ fontWeight: 750, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                      Judul: {selectedPost.ytTitle}
                    </div>
                  )}
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{selectedPost.content}</p>

                  {selectedPost.platform === 'youtube' && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      {selectedPost.ytTags && (
                        <div style={{ marginBottom: '0.8rem' }}>
                          <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Tags Video:</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {selectedPost.ytTags.split(',').map((tag, i) => (
                              <span key={i} style={{ 
                                background: '#eff6ff', 
                                color: 'var(--primary)', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                border: '1px solid #bfdbfe'
                              }}>
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ marginBottom: '0.8rem' }}>
                        <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.8rem' }}>Altered Content (AI Label):</strong>
                        <span style={{ 
                          fontWeight: 700, 
                          fontSize: '0.8rem',
                          background: (selectedPost.ytAlteredContent === 'no') ? '#f1f5f9' : '#fef3c7',
                          color: (selectedPost.ytAlteredContent === 'no') ? '#475569' : '#d97706',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          display: 'inline-block',
                          border: (selectedPost.ytAlteredContent === 'no') ? '1px solid #cbd5e1' : '1px solid #fde68a'
                        }}>
                          {selectedPost.ytAlteredContent === 'no' ? 'Tidak' : 'Ya - Konten diubah/sintetis (AI)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                  {selectedPost.postType === 'live' && (selectedPost.status === 'LIVE' || selectedPost.status === 'Processing') && (
                    <button 
                      className="btn"
                      onClick={() => handleStopLive(selectedPost)}
                      disabled={stoppingIds[selectedPost.id]}
                      style={{ 
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                        color: '#fff', 
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                        cursor: stoppingIds[selectedPost.id] ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Square size={16} fill="#fff" />
                      <span>{stoppingIds[selectedPost.id] ? 'Menghentikan...' : 'Hentikan Live'}</span>
                    </button>
                  )}
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
