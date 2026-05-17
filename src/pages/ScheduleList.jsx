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
  Save
} from 'lucide-react';

const ScheduleList = ({ posts, onDelete, onUpdate, onUseMedia }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Edit States
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleEditClick = (post) => {
    setEditingPost(post);
    setEditContent(post.content);
    if (post.time) {
      const [d, t] = post.time.split(' ');
      setEditDate(d || '');
      setEditTime(t || '');
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent || !editDate || !editTime) return alert("Harap isi semua kolom!");
    setIsSaving(true);
    try {
      await onUpdate(editingPost.id, {
        content: editContent,
        time: `${editDate} ${editTime}`
      });
      setEditingPost(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
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
                        <div className={`social-badge social-${post.platform === 'facebook' ? 'fb' : (post.platform === 'instagram' ? 'ig' : 'tt')}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                           <i className={`fab fa-${post.platform === 'facebook' ? 'facebook-f' : post.platform}`}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{post.accountName || 'Social Account'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{post.platform}</div>
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
                        <span>{post.time}</span>
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
                          background: post.status === 'Published' ? '#dcfce7' : (post.status === 'Error' ? '#fee2e2' : '#e0e7ff'),
                          color: post.status === 'Published' ? '#166534' : (post.status === 'Error' ? '#991b1b' : '#3730a3')
                        }}>
                          {post.status === 'Published' ? <CheckCircle2 size={12} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>}
                          {post.status.toUpperCase()}
                        </div>
                        {post.status === 'Error' && post.error_log && (
                          <div style={{ fontSize: '0.65rem', color: '#ef4444', maxWidth: '150px', fontStyle: 'italic', padding: '0 0.4rem' }}>
                            Error: {post.error_log}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {post.status === 'Scheduled' && (
                          <button 
                            className="btn" 
                            style={{ padding: '0.5rem', background: '#e0e7ff', color: 'var(--primary)', borderRadius: '8px' }}
                            onClick={() => handleEditClick(post)}
                            title="Edit Jadwal"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        <button 
                          className="btn" 
                          style={{ padding: '0.5rem', background: '#fee2e2', color: '#ef4444', borderRadius: '8px' }}
                          onClick={() => onDelete(post.id)}
                          title="Hapus Jadwal"
                        >
                          <Trash2 size={16} />
                        </button>
                        {post.status === 'Published' && (
                          <button className="btn" style={{ padding: '0.5rem', background: '#f1f5f9', color: 'var(--text-muted)', borderRadius: '8px' }}>
                            <ExternalLink size={16} />
                          </button>
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

            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, marginRight: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem' }}>Detail Postingan</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{selectedPost.content}</p>
              </div>
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
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: '#fff', position: 'relative' }}>
            <button 
              onClick={() => setEditingPost(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Edit Jadwal Posting</h3>
            
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="stat-label">Konten Postingan</label>
              <textarea 
                rows={5} 
                style={{ marginTop: '0.5rem', background: '#f8fafc' }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="stat-label">Tanggal</label>
                <input type="date" style={{ marginTop: '0.5rem', background: '#f8fafc' }} value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="stat-label">Waktu</label>
                <input type="time" style={{ marginTop: '0.5rem', background: '#f8fafc' }} value={editTime} onChange={e => setEditTime(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }} onClick={() => setEditingPost(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSaving}>
                <Save size={18} />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleList;
