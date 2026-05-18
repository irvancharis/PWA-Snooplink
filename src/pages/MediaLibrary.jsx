import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileImage, X, Play, RefreshCw, Trash2 } from 'lucide-react';

const MediaLibrary = ({ posts, onUseMedia, onDelete, user }) => {
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

  const getPreviewUrl = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;
    try {
      let id = null;
      if (url.includes('id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) id = match[1];
      } else {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) id = match[1];
      }
      if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    } catch (e) { console.error("URL Error", e); }
    return url;
  };

  const uniqueMediaMap = new Map();
  posts.forEach(post => {
    if (post.mediaUrl) {
      if (!uniqueMediaMap.has(post.mediaUrl)) {
        const item = { ...post, usedPlatforms: new Set() };
        if (post.platform) item.usedPlatforms.add(post.platform);
        uniqueMediaMap.set(post.mediaUrl, item);
      } else {
        if (post.platform) {
          uniqueMediaMap.get(post.mediaUrl).usedPlatforms.add(post.platform);
        }
      }
    }
  });
  const uniqueMedia = Array.from(uniqueMediaMap.values());

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const totalSize = uniqueMedia.reduce((acc, post) => acc + (post.fileSize || 0), 0);
  const storageLimitMB = user?.storageLimit || 100;
  const quotaLimit = storageLimitMB * 1024 * 1024;
  const quotaPercentage = Math.min((totalSize / quotaLimit) * 100, 100);
  const limitText = storageLimitMB >= 1024 ? `${(storageLimitMB / 1024).toFixed(1)} GB` : `${storageLimitMB} MB`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center' }}>
           <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>Kapasitas Penyimpanan</span>
           <span style={{ fontWeight: 800, color: quotaPercentage > 90 ? '#ef4444' : 'var(--primary)' }}>{formatBytes(totalSize)} / {limitText}</span>
        </div>
        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
           <div style={{ width: `${quotaPercentage}%`, height: '100%', background: quotaPercentage > 90 ? '#ef4444' : 'var(--primary)', transition: 'width 0.5s ease', borderRadius: '6px' }}></div>
        </div>
        <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {quotaPercentage >= 100 ? "Penyimpanan Anda penuh. Hapus beberapa media untuk melanjutkan unggah." : `Maksimal penyimpanan media adalah ${limitText} per akun.`}
        </div>
      </div>

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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 600 }}>
                {post.fileSize ? formatBytes(post.fileSize) : 'Ukuran tidak diketahui'}
              </div>
            </div>
            <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', display: 'flex', gap: '0.4rem' }}>
              {post.usedPlatforms && Array.from(post.usedPlatforms).map(platform => (
                <div key={platform} className={`social-badge social-${platform === 'instagram' ? 'ig' : (platform === 'tiktok' ? 'tt' : (platform === 'youtube' ? 'yt' : 'fb'))}`} style={{ width: '24px', height: '24px', fontSize: '0.7rem' }} title={`Digunakan di ${platform}`}>
                   <i className={`fab fa-${platform === 'facebook' ? 'facebook-f' : platform}`}></i>
                </div>
              ))}
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
              {isDriveUrl(selectedPost?.mediaUrl) ? (
                <div style={{ width: '100%', height: '60vh', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                   <iframe src={getPreviewUrl(selectedPost.mediaUrl)} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>{selectedPost.fileName || 'Media Galeri'}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Diunggah pada {selectedPost.time ? selectedPost.time.split(' ')[0] : 'N/A'} • {selectedPost.fileSize ? formatBytes(selectedPost.fileSize) : 'Ukuran tidak diketahui'}
                </p>
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
  </div>
  );
};

export default MediaLibrary;
