import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileImage, X, Play, RefreshCw, Trash2 } from 'lucide-react';

const MediaLibrary = ({ posts, onUseMedia, onDelete }) => {
  const [selectedPost, setSelectedPost] = useState(null);

  const isVideo = (post) => {
    if (post.mediaType?.startsWith('video/')) return true;
    const url = post.mediaUrl;
    if (!url) return false;
    return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i);
  };

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

  const uniqueMedia = [];
  const seenUrls = new Set();
  posts.forEach(post => {
    if (post.mediaUrl && !seenUrls.has(post.mediaUrl)) {
      seenUrls.add(post.mediaUrl);
      uniqueMedia.push(post);
    }
  });

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
      {uniqueMedia.length === 0 ? (
        <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '6rem', background: '#fff' }}>
          <ImageIcon size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Belum ada media yang diunggah.</p>
        </div>
      ) : (
        uniqueMedia.map(post => (
          <div key={post.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', border: '1px solid var(--border-color)', borderRadius: '16px', cursor: 'pointer', transition: '0.2s', position: 'relative' }} onClick={() => setSelectedPost(post)}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isVideo(post) ? '#eef2ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isVideo(post) ? <Video color="var(--primary)" /> : <FileImage color="#10b981" />}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.fileName || (isVideo(post) ? 'Video_Media' : 'Image_Media')}
              </div>
            </div>
            <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem' }}>
              <div className={`social-badge social-${post.platform === 'instagram' ? 'ig' : (post.platform === 'tiktok' ? 'tt' : (post.platform === 'youtube' ? 'yt' : 'fb'))}`} style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                 <i className={`fab fa-${post.platform === 'facebook' ? 'facebook-f' : post.platform}`}></i>
              </div>
            </div>
          </div>
        ))
      )}

      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: 0, overflow: 'hidden', background: '#fff', position: 'relative' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedPost(null); }}
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
                    onError={(e) => {
                      console.log("Video playback failed, likely due to Drive processing or permissions.");
                    }}
                  />
                  <div style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.7, textAlign: 'center', marginTop: '0.5rem' }}>
                    Jika video tidak muncul, Google Drive mungkin masih memproses file Anda.
                  </div>
                  <a 
                    href={selectedPost.mediaUrl.includes('drive.google.com') ? selectedPost.mediaUrl.replace('uc?id=', 'file/d/').split('&')[0] + '/view' : selectedPost.mediaUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn"
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '0.8rem', marginTop: '0.5rem', padding: '0.6rem 1.2rem' }}
                  >
                    Tonton di Google Drive (Tab Baru)
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>{selectedPost.fileName || 'Media Galeri'}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Diunggah pada {selectedPost.time ? selectedPost.time.split(' ')[0] : 'N/A'}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn"
                  style={{ background: '#fee2e2', color: '#ef4444', border: 'none' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(selectedPost);
                    setSelectedPost(null);
                  }}
                >
                  <Trash2 size={18} />
                  <span>Hapus</span>
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
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
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
