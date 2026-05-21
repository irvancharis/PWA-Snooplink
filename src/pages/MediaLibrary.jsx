import React, { useState } from 'react';
import { Image as ImageIcon, Video, FileImage, X, Play, RefreshCw, Trash2, Music, UploadCloud, Eye } from 'lucide-react';

const MediaLibrary = ({ mediaList = [], posts = [], onUseMedia, onDelete, onUploadMedia, user }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  const isVideo = (item) => {
    if (item.mediaType?.startsWith('video/')) return true;
    if (item.category === 'video') return true;
    const url = item.mediaUrl;
    if (!url) return false;
    return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i);
  };

  const isAudio = (item) => {
    if (item.mediaType?.startsWith('audio/')) return true;
    if (item.category === 'musik') return true;
    const url = item.mediaUrl;
    if (!url) return false;
    return url.match(/\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i);
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

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Quota Calculations
  const totalSize = mediaList.reduce((acc, item) => acc + (item.fileSize || 0), 0);
  const storageLimitMB = user?.storageLimit || 100;
  const quotaLimit = storageLimitMB * 1024 * 1024;
  const quotaPercentage = Math.min((totalSize / quotaLimit) * 100, 100);
  const limitText = storageLimitMB >= 1024 ? `${(storageLimitMB / 1024).toFixed(1)} GB` : `${storageLimitMB} MB`;

  // File type detection and upload trigger
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total incoming size against available quota
    const incomingSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize + incomingSize > quotaLimit) {
      alert("Gagal mengunggah: Total file melebihi kuota penyimpanan yang tersisa!");
      return;
    }

    try {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Determine category based on file type
        let category = 'gambar';
        if (file.type.startsWith('video/')) {
          category = 'video';
        } else if (file.type.startsWith('audio/') || file.name.endsWith('.mp3')) {
          category = 'musik';
        }

        const prefix = files.length > 1 ? `[File ${i + 1}/${files.length}] ` : '';
        await onUploadMedia(file, category, ({ percent, stage }) => {
          setUploadProgress(percent);
          setUploadStage(`${prefix}${stage}`);
        });
      }
      alert("Semua media berhasil diunggah dan disimpan ke pustaka.");
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      e.target.value = ''; // Reset file input
    }
  };

  // Filter media based on current active tab
  const filteredMedia = mediaList.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'video') return isVideo(item);
    if (activeTab === 'musik') return isAudio(item);
    if (activeTab === 'gambar') return !isVideo(item) && !isAudio(item);
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Kapasitas Penyimpanan */}
      <div className="card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'center' }}>
           <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>Kapasitas Penyimpanan Pustaka Media</span>
           <span style={{ fontWeight: 800, color: quotaPercentage > 90 ? '#ef4444' : 'var(--primary)' }}>{formatBytes(totalSize)} / {limitText}</span>
        </div>
        <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
           <div style={{ width: `${quotaPercentage}%`, height: '100%', background: quotaPercentage > 90 ? '#ef4444' : 'var(--primary)', transition: 'width 0.5s ease', borderRadius: '6px' }}></div>
        </div>
        <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {quotaPercentage >= 100 ? "Penyimpanan Anda penuh. Hapus beberapa media untuk melanjutkan unggah." : `Maksimal penyimpanan media adalah ${limitText} per akun.`}
        </div>
      </div>

      {/* Uploader Section */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2.5px dashed #cbd5e1', borderRadius: '20px', background: '#f8fafc', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: '0.3s' }}>
        <input 
          type="file" 
          accept="image/*,video/*,audio/*" 
          multiple
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 5 }} 
          onChange={handleFileChange}
          disabled={uploading || quotaPercentage >= 100}
        />
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '56px', height: '56px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <UploadCloud size={28} color="var(--primary)" />
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>Tarik & Lepas File di Sini atau Klik untuk Mengunggah</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mendukung Video (MP4/WebM), Audio (MP3), dan Gambar (PNG/JPG)</p>
        </div>
      </div>

      {/* Tab Filter & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'video', label: 'Video' },
            { id: 'musik', label: 'Musik (MP3)' },
            { id: 'gambar', label: 'Gambar' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                transition: '0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Menampilkan <strong>{filteredMedia.length}</strong> file
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {filteredMedia.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem 2rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--primary)' }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>Belum ada file media dalam kategori ini.</p>
          </div>
        ) : (
          filteredMedia.map(item => {
            const isVid = isVideo(item);
            const isAud = isAudio(item);
            return (
              <div 
                key={item.id} 
                className="card media-card-hover" 
                style={{ 
                  padding: '1.25rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '1rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px', 
                  cursor: 'pointer', 
                  transition: '0.3s', 
                  position: 'relative',
                  background: '#ffffff'
                }} 
                onClick={() => setSelectedMedia(item)}
              >
                <div style={{ 
                  width: '100%', 
                  height: '130px', 
                  borderRadius: '12px', 
                  background: isVid ? '#eef2ff' : (isAud ? '#fef3c7' : '#f0fdf4'), 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {isVid ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                        <Video size={40} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Video</span>
                      </div>
                    </>
                  ) : isAud ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
                      <Music size={40} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Musik</span>
                    </div>
                  ) : (
                    <img src={getDirectLink(item.mediaUrl)} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', overflow: 'hidden', textString: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 0.2rem' }} title={item.fileName}>
                    {item.fileName || 'Media Pustaka'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 600 }}>
                    {item.fileSize ? formatBytes(item.fileSize) : 'Ukuran tidak diketahui'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Uploading Progress Overlay */}
      {uploading && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          background: 'rgba(15, 23, 42, 0.65)', 
          backdropFilter: 'blur(8px)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '3rem 2.5rem',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            width: '100%',
            maxWidth: '460px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ position: 'relative', marginBottom: '2rem', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', border: '5px solid #f1f5f9', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }}></div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {uploadProgress}%
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
              {uploadStage || 'Mengunggah...'}
            </h3>
            
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#f1f5f9', 
              borderRadius: '999px', 
              overflow: 'hidden', 
              margin: '1.5rem 0',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                width: `${uploadProgress}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))', 
                borderRadius: '999px',
                transition: 'width 0.2s ease-out'
              }}></div>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, lineHeight: '1.6', margin: 0 }}>
              File sedang diunggah ke Pustaka Media Anda. Mohon tidak menutup halaman ini.
            </p>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
        </div>
      )}

      {/* Selected Media Preview Modal */}
      {selectedMedia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }} onClick={() => setSelectedMedia(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: 0, overflow: 'hidden', background: '#fff', position: 'relative', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedMedia(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <X size={20} />
            </button>

            <div style={{ width: '100%', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', maxHeight: '70vh', padding: '2rem' }}>
              {isDriveUrl(selectedMedia.mediaUrl) ? (
                // Google Drive custom handlers
                isVideo(selectedMedia) ? (
                  <div style={{ width: '100%', height: '55vh', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                    <iframe src={getPreviewUrl(selectedMedia.mediaUrl)} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview Video" allow="autoplay" />
                  </div>
                ) : isAudio(selectedMedia) ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: '#1e293b', padding: '3rem', borderRadius: '16px' }}>
                    <div style={{ width: '72px', height: '72px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                      <Music size={36} />
                    </div>
                    <audio src={selectedMedia.mediaUrl} controls autoPlay style={{ width: '100%', maxWidth: '400px' }} />
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>Pemutar Audio Google Drive</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '55vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={getDirectLink(selectedMedia.mediaUrl)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px' }} alt="Preview Gambar" />
                  </div>
                )
              ) : isVideo(selectedMedia) ? (
                <video src={selectedMedia.mediaUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: '12px' }} />
              ) : isAudio(selectedMedia) ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: '#1e293b', padding: '3rem', borderRadius: '16px' }}>
                  <div style={{ width: '72px', height: '72px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                    <Music size={36} />
                  </div>
                  <audio src={selectedMedia.mediaUrl} controls autoPlay style={{ width: '100%', maxWidth: '400px' }} />
                </div>
              ) : (
                <img src={selectedMedia.mediaUrl} style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: '12px' }} alt="Preview Gambar" />
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1, marginRight: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.3rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
                  {selectedMedia.fileName || 'Media Pustaka'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                  Format: {selectedMedia.mediaType || 'tidak diketahui'} • {selectedMedia.fileSize ? formatBytes(selectedMedia.fileSize) : 'Ukuran tidak diketahui'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn"
                  style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                  onClick={() => {
                    onDelete(selectedMedia);
                    setSelectedMedia(null);
                  }}
                >
                  <Trash2 size={18} />
                  <span>Hapus</span>
                </button>
                <button 
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                  onClick={() => {
                    onUseMedia(selectedMedia.mediaUrl);
                    setSelectedMedia(null);
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
      <style dangerouslySetInnerHTML={{ __html: `
        .media-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
          border-color: var(--primary) !important;
        }
      `}} />
    </div>
  );
};

export default MediaLibrary;
