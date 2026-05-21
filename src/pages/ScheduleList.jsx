import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Image as ImageIcon,
  Video,
  FileImage,
  X,
  RefreshCw,
  Edit,
  Save,
  Lock,
  Layers,
  FileText,
  Radio,
  Repeat
} from 'lucide-react';

const ScheduleList = ({ posts, onDelete, onUpdate, onUseMedia, user, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'post', 'live'
  const [selectedPost, setSelectedPost] = useState(null);

  const isVideo = (post) => {
    if (post.mediaType?.startsWith('video/')) return true;
    const url = post.mediaUrl;
    if (!url) return false;
    return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i);
  };

  const getDirectLink = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com') && url.includes('id=')) {
      const id = url.split('id=')[1].split('&')[0];
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return url;
  };

  const isStatusCompleted = (status) => {
    const s = status?.toLowerCase();
    return s === 'published' || s === 'completed' || s === 'complete';
  };

  const filteredPosts = posts.filter(post => {
    if (post.status === 'Deleted') return false;
    const matchesSearch = post.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'All' || 
      post.status?.toLowerCase() === statusFilter.toLowerCase();
      
    // Type filter (live, post, recurring)
    const matchesType = typeFilter === 'all' || 
      (typeFilter === 'live' && post.postType === 'live') || 
      (typeFilter === 'post' && post.postType !== 'live' && !post.isRecurring) ||
      (typeFilter === 'recurring' && post.isRecurring === true);
      
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <>
      {/* Tab pembeda live, post, dan recurring dengan Flat Icons */}
      <div style={{ display: 'flex', marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'inline-flex', 
          background: '#f1f5f9', 
          padding: '0.3rem', 
          borderRadius: '12px',
          gap: '0.2rem',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap'
        }}>
          {[
            { value: 'all', label: 'Semua Jadwal', icon: <Layers size={14} /> },
            { value: 'post', label: 'Post Reguler', icon: <FileText size={14} /> },
            { value: 'live', label: 'Live Stream', icon: <Radio size={14} /> },
            { value: 'recurring', label: 'Jadwal Berulang', icon: <Repeat size={14} /> }
          ].map(opt => {
            const isSelected = typeFilter === opt.value;
            let activeColor = 'var(--text-main)';
            if (isSelected) {
              if (opt.value === 'post') activeColor = 'var(--primary)';
              else if (opt.value === 'live') activeColor = '#ef4444';
              else if (opt.value === 'recurring') activeColor = '#10b981';
            }
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                style={{
                  padding: '0.5rem 1.1rem',
                  border: 'none',
                  background: isSelected ? '#fff' : 'transparent',
                  color: isSelected ? activeColor : 'var(--text-muted)',
                  fontWeight: 700,
                  borderRadius: '9px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="list-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem' }}>
        <div className="list-filters-inner" style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <div className="input-group search-group" style={{ marginBottom: 0, flex: 1, position: 'relative', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Cari konten postingan..." 
              style={{ paddingLeft: '2.8rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          <select 
            style={{ width: '200px' }} 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">Semua Status</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Published">Published</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pratinjau</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Platform & Akun</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Isi Konten</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Jadwal Tayang</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '6rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 500 }}>Tidak ada jadwal postingan yang ditemukan.</p>
                  </td>
                </tr>
              ) : (
                filteredPosts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)', transition: '0.2s' }} className="table-row-hover">
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div 
                        onClick={() => setSelectedPost(post)}
                        style={{ width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden', background: isVideo(post) ? '#eef2ff' : '#f0fdf4', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        {post.mediaUrl ? (
                          isVideo(post) ? <Video size={20} color="var(--primary)" /> : <FileImage size={20} color="#10b981" />
                        ) : (
                          <ImageIcon size={20} color="#cbd5e1" />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div className={`social-badge social-${post.platform === 'facebook' ? 'fb' : (post.platform === 'instagram' ? 'ig' : (post.platform === 'youtube' ? 'yt' : 'tt'))}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                           <i className={`fab fa-${post.platform === 'facebook' ? 'facebook-f' : post.platform}`}></i>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{post.accountName || 'Social Account'}</div>
                            {post.postType === 'live' && (
                              <span style={{ 
                                background: '#fee2e2', 
                                color: '#ef4444', 
                                fontSize: '0.65rem', 
                                padding: '0.1rem 0.4rem', 
                                borderRadius: '6px', 
                                fontWeight: 850,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                border: '1px solid #fca5a5'
                              }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                LIVE
                              </span>
                            )}
                            {post.isAutoLoop && (
                              <span style={{ 
                                background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', 
                                color: '#7c3aed', 
                                fontSize: '0.65rem', 
                                padding: '0.1rem 0.4rem', 
                                borderRadius: '6px', 
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                border: '1px solid #ddd6fe'
                              }}>
                                <Repeat size={10} />
                                AUTO LOOP
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '0.1rem' }}>{post.platform}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {post.content}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Clock size={14} />
                        {post.isRecurring ? (
                          <span style={{ fontWeight: 650, color: 'var(--primary)' }}>
                            <Repeat size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.3rem' }} />
                            Setiap {post.daysOfWeek?.map(d => {
                              const days = {
                                'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
                                'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
                              };
                              return days[d] || d;
                            }).join(', ')} pukul {post.scheduledTime}
                          </span>
                        ) : (
                          <span>{post.time}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}>
                        <div style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: isStatusCompleted(post.status) ? '#dcfce7' : (post.status === 'Error' ? '#fee2e2' : '#e0e7ff'),
                          color: isStatusCompleted(post.status) ? '#166534' : (post.status === 'Error' ? '#991b1b' : '#3730a3')
                        }}>
                          {isStatusCompleted(post.status) ? <CheckCircle2 size={12} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>}
                          {post.status.toUpperCase()}
                        </div>
                        {post.status === 'Error' && post.error_log && (
                          <div style={{ fontSize: '0.65rem', color: '#ef4444', maxWidth: '150px', fontStyle: 'italic', padding: '0 0.4rem' }}>
                            Error: {post.error_log}
                          </div>
                        )}
                        {post.ytMetadataWarning && (
                          <div style={{ 
                            fontSize: '0.65rem', 
                            color: '#d97706', 
                            fontStyle: 'italic', 
                            padding: '0 0.4rem',
                            maxWidth: '150px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            marginTop: '0.2rem'
                          }}>
                            ⚠️ Gagal update metadata YouTube (Tags/Altered Content) karena masalah izin. Silakan hubungkan ulang akun YouTube Anda dan centang opsi izin mengelola video.
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isStatusCompleted(post.status) && (
                          <button 
                            className="btn" 
                            style={{ padding: '0.5rem', background: '#e0e7ff', color: 'var(--primary)', borderRadius: '8px' }}
                            onClick={() => onEdit(post)}
                            title="Edit Jadwal"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {!isStatusCompleted(post.status) ? (
                          <button 
                            className="btn" 
                            style={{ padding: '0.5rem', background: '#fee2e2', color: '#ef4444', borderRadius: '8px' }}
                            onClick={() => onDelete(post.id)}
                            title="Hapus Jadwal"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <div 
                            style={{ padding: '0.5rem', color: '#94a3b8', display: 'flex', justifyContent: 'center', cursor: 'not-allowed' }}
                            title="Jadwal yang sudah selesai/tayang tidak dapat dihapus atau diedit."
                          >
                            <Lock size={16} />
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
              {isVideo(selectedPost) ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <video 
                    src={selectedPost.mediaUrl} 
                    controls 
                    autoPlay 
                    style={{ maxWidth: '100%', maxHeight: '60vh' }}
                  />
                  <a 
                    href={selectedPost.mediaUrl.includes('drive.google.com') ? selectedPost.mediaUrl.replace('uc?id=', 'file/d/').split('&')[0] + '/view' : selectedPost.mediaUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn"
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '0.8rem', marginTop: '0.5rem', padding: '0.6rem 1.2rem' }}
                  >
                    Tonton di Google Drive
                  </a>
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
                    {selectedPost.postType === 'live' && <Radio size={16} color="#ef4444" />}
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

                  {selectedPost.postType === 'live' && (
                    <div style={{ 
                      marginTop: '1.5rem', 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      padding: '1rem', 
                      borderRadius: '12px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      fontSize: '0.85rem'
                    }}>
                      <div>
                        <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Mode Stream Key:</strong>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {selectedPost.streamKeyMode === 'auto' ? 'Buat Otomatis (Auto)' : 'Manual (RTMP)'}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Durasi Live:</strong>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {selectedPost.liveDuration === '24/7' ? (
                            <>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                              24/7 Non-stop
                            </>
                          ) : `${selectedPost.liveDuration} Menit`}
                        </span>
                      </div>
                      {selectedPost.streamKey && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Stream Key:</strong>
                          <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-main)' }}>
                            ••••••••••••
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    onUseMedia(selectedPost.mediaUrl);
                    setSelectedPost(null);
                  }}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <RefreshCw size={18} />
                  <span>Gunakan Lagi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default ScheduleList;
