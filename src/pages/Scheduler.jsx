import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Send, Grid, X, Video, FileImage, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Scheduler = ({ onSchedule, initialMedia, onClearInitial, accounts, posts, user }) => {
  const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });
  
  // YouTube specific state
  const [ytTitle, setYtTitle] = useState('');
  const [ytTags, setYtTags] = useState('');
  const [ytPrivacy, setYtPrivacy] = useState('public');
  const [ytCategoryId, setYtCategoryId] = useState('22');
  const [ytThumbnailPreview, setYtThumbnailPreview] = useState(null);
  const [ytThumbnailFile, setYtThumbnailFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

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
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
        }
      }
    } catch (e) {}
    return url;
  };

  useEffect(() => {
    if (initialMedia) {
      setPreview(initialMedia);
    }
    return () => onClearInitial?.();
  }, [initialMedia]);

  useEffect(() => {
    // Auto-select first available account if none selected
    if (accounts.length > 0 && selectedAccountIds.length === 0) {
      setSelectedAccountIds([accounts[0].id]);
    }
  }, [accounts, selectedAccountIds]);

  const toggleAccountSelection = (accId) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accId)) {
        return prev.filter(id => id !== accId);
      } else {
        return [...prev, accId];
      }
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 200 * 1024 * 1024) {
        setAlertModal({
          show: true,
          title: "File Terlalu Besar",
          message: "Ukuran file media Anda terlalu besar! Batas maksimal pengunggahan berkas adalah 200MB."
        });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const hasYoutubeSelected = accounts.some(a => selectedAccountIds.includes(a.id) && a.platform === 'youtube');
  const hasFacebookSelected = accounts.some(a => selectedAccountIds.includes(a.id) && a.platform === 'facebook');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAccountIds.length === 0) {
      setAlertModal({
        show: true,
        title: "Akun Belum Dipilih",
        message: "Harap pilih setidaknya satu akun sosial media tujuan postingan Anda!"
      });
      return;
    }
    
    if (hasYoutubeSelected) {
      if (!ytTitle || !content || !date || !time) {
        setAlertModal({
          show: true,
          title: "Formulir Belum Lengkap",
          message: "Harap isi Judul YouTube, Deskripsi, Tanggal, dan Waktu penjadwalan!"
        });
        return;
      }
    } else {
      if (!content || !date || !time) {
        setAlertModal({
          show: true,
          title: "Formulir Belum Lengkap",
          message: "Harap isi Konten deskripsi, Tanggal, dan Waktu penjadwalan!"
        });
        return;
      }
    }
    
    const isSuperAdmin = user?.role === 'admin' || user?.email === 'irvancharis@gmail.com';

    // Storage capacity limit validation
    const storageLimit = user?.storageLimit !== undefined ? user.storageLimit : 100; // in MB
    const currentStorageUsed = user?.storageUsed || 0; // in MB
    let incomingSizeInMb = 0;
    if (file) {
      incomingSizeInMb += file.size / (1024 * 1024);
    }
    if (ytThumbnailFile) {
      incomingSizeInMb += ytThumbnailFile.size / (1024 * 1024);
    }

    if (!isSuperAdmin && (currentStorageUsed + incomingSizeInMb > storageLimit)) {
      setAlertModal({
        show: true,
        title: "Penyimpanan Penuh",
        message: `Kapasitas penyimpanan Anda tidak mencukupi! Anda mencoba mengunggah file sebesar ${incomingSizeInMb.toFixed(2)} MB, sedangkan sisa penyimpanan Anda hanya ${(storageLimit - currentStorageUsed).toFixed(2)} MB (Limit Paket Anda: ${storageLimit} MB). Silakan hapus beberapa media di Galeri atau hubungi admin untuk meningkatkan kapasitas.`
      });
      return;
    }
    
    // Daily scheduling limit validation
    const dailyLimit = user?.dailyPostLimit !== undefined ? user.dailyPostLimit : 5;
    const targetDate = date; // e.g. "2026-05-18"
    const postsOnSameDate = (posts || []).filter(p => p.time && p.time.startsWith(targetDate) && p.status !== 'Failed' && p.status !== 'Deleted');

    if (!isSuperAdmin && (postsOnSameDate.length + selectedAccountIds.length > dailyLimit)) {
      setAlertModal({
        show: true,
        title: "Batas Posting Terlampaui",
        message: `Batas posting harian terlampaui! Anda hanya diizinkan menjadwalkan maksimal ${dailyLimit} postingan per hari. Anda saat ini memiliki ${postsOnSameDate.length} postingan pada ${targetDate}, dan mencoba menambahkan ${selectedAccountIds.length} postingan baru.`
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setUploadStage('Mempersiapkan pengunggahan...');

    const targetAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));

    await onSchedule({ 
      content, 
      accounts: targetAccounts,
      time: `${date} ${time}`, 
      mediaUrl: preview || "",
      mediaType: file ? file.type : (preview?.startsWith('data:video') ? 'video/mp4' : 'image/jpeg'),
      fileName: file ? file.name : (posts?.find(p => p.mediaUrl === preview)?.fileName || 'Media_Galeri'),
      fileSize: file ? file.size : (posts?.find(p => p.mediaUrl === preview)?.fileSize || 0),
      file: file, // Pass the file object for Storage upload
      linkUrl: hasFacebookSelected ? linkUrl : '',
      ...(hasYoutubeSelected && {
        ytTitle,
        ytTags,
        ytPrivacy,
        ytCategoryId,
        ytThumbnail: ytThumbnailPreview,
        ytThumbnailFile: ytThumbnailFile
      })
    }, (progress) => {
      setUploadProgress(progress.percent);
      if (progress.stage) {
        setUploadStage(progress.stage);
      }
    });
    setUploading(false);
    setUploadProgress(0);
    setUploadStage('');
  };

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem', background: '#fff' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Buat Postingan Baru</h2>
        <p className="stat-label">Jadwalkan konten media sosial Anda dengan mudah</p>
      </div>
      {/* Daily Limit Notice */}
      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '16px', 
        padding: '1.2rem', 
        marginBottom: '2rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Batas Jadwal Harian: 
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
             {user?.role === 'admin' || user?.email === 'irvancharis@gmail.com' ? 'Tidak Terbatas' : `${user?.dailyPostLimit !== undefined ? user.dailyPostLimit : 5} Post/Hari`}
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Ditetapkan secara resmi oleh Admin
        </span>
      </div>

      <form className="scheduler-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="input-group" style={{ margin: 0 }}>
            <label className="stat-label" style={{ fontSize: '1rem', color: 'var(--primary)', borderBottom: '2px solid #eef2ff', paddingBottom: '0.8rem', marginBottom: '1.2rem', display: 'block' }}>1. Pilih Akun Tujuan (Bisa Pilih Banyak)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {accounts.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                  Belum ada akun yang terhubung. Silakan hubungkan akun di menu Accounts.
                </div>
              ) : (
                accounts.map(acc => {
                  const isSelected = selectedAccountIds.includes(acc.id);
                  return (
                    <div 
                      key={acc.id}
                      style={{ 
                        padding: '1rem', 
                        background: isSelected ? '#eef2ff' : '#f8fafc',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        borderRadius: '16px',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none'
                      }}
                      onClick={() => toggleAccountSelection(acc.id)}
                    >
                      <div className={`social-badge social-${acc.platform === 'facebook' ? 'fb' : (acc.platform === 'youtube' ? 'yt' : (acc.platform === 'instagram' ? 'ig' : 'tt'))}`} style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}>
                         <i className={`fab fa-${acc.platform === 'facebook' ? 'facebook-f' : acc.platform}`}></i>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{acc.username || acc.name || 'Account'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>{acc.platform}</span>
                      </div>
                      {isSelected && (
                        <div style={{ marginLeft: 'auto', color: 'var(--primary)' }}>
                          <CheckCircle2 size={20} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ background: '#f8fafc', height: '1px', width: '100%' }}></div>

          <div className="input-group" style={{ margin: 0 }}>
            <label className="stat-label" style={{ fontSize: '1rem', color: 'var(--primary)', borderBottom: '2px solid #eef2ff', paddingBottom: '0.8rem', marginBottom: '1.2rem', display: 'block' }}>2. Lengkapi Konten</label>
            
            {hasYoutubeSelected && (
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="stat-label">Judul Video YouTube <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  placeholder="Masukkan judul video..." 
                  style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0' }}
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="input-group">
              <label className="stat-label">
                {hasYoutubeSelected ? 'Deskripsi Video YouTube' : 'Konten Postingan'} <span style={{color: 'red'}}>*</span>
              </label>
              <textarea 
                rows={hasYoutubeSelected ? 5 : 8} 
                placeholder={hasYoutubeSelected ? 'Tulis deskripsi video Anda di sini...' : 'Tulis sesuatu yang menarik di sini...'}
                style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0' }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>

            {hasFacebookSelected && (
              <div className="input-group" style={{ marginTop: '1.5rem' }}>
                <label className="stat-label">Tautan Link Web (Opsional - Clickable Image Link)</label>
                <input 
                  type="url" 
                  placeholder="https://toko-anda.com/produk" 
                  style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0' }}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  💡 <strong>Info:</strong> Jika diisi, postingan Facebook akan diterbitkan sebagai <strong>Link Post</strong>. Pengunjung Facebook dapat mengklik gambar pratinjau untuk langsung pergi ke tautan website ini.
                </p>
              </div>
            )}

            {hasYoutubeSelected && (
              <>
                <div className="input-group" style={{ marginTop: '1.5rem' }}>
                  <label className="stat-label">Tags (Pisahkan dengan koma)</label>
                  <input 
                    type="text" 
                    placeholder="vlog, tutorial, tips" 
                    style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0' }}
                    value={ytTags}
                    onChange={(e) => setYtTags(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="stat-label">Kategori YouTube</label>
                    <select 
                      style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0' }}
                      value={ytCategoryId}
                      onChange={(e) => setYtCategoryId(e.target.value)}
                    >
                      <option value="22">Orang & Blog</option>
                      <option value="20">Game</option>
                      <option value="10">Musik</option>
                      <option value="24">Hiburan</option>
                      <option value="27">Pendidikan</option>
                      <option value="28">Sains & Teknologi</option>
                      <option value="1">Film & Animasi</option>
                      <option value="2">Otomotif</option>
                      <option value="15">Hewan & Peliharaan</option>
                      <option value="17">Olahraga</option>
                      <option value="19">Perjalanan & Acara</option>
                      <option value="23">Komedi</option>
                      <option value="25">Berita & Politik</option>
                      <option value="26">Cara & Gaya</option>
                      <option value="29">Nirlaba & Aktivisme</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="stat-label">Visibilitas</label>
                    <select 
                      style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0' }}
                      value={ytPrivacy}
                      onChange={(e) => setYtPrivacy(e.target.value)}
                    >
                      <option value="public">Publik</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Privat</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="stat-label">Pilih / Unggah Media</label>
              <button 
                type="button" 
                className="btn" 
                style={{ padding: '0.4rem 0.8rem', background: '#eef2ff', color: 'var(--primary)', fontSize: '0.75rem', borderRadius: '8px' }}
                onClick={() => setShowMediaModal(true)}
              >
                <Grid size={14} />
                Buka Galeri
              </button>
            </div>
            <label style={{ 
              border: '2.5px dashed #e2e8f0', 
              borderRadius: '20px', 
              height: '220px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginTop: '0.5rem',
              cursor: 'pointer',
              background: '#f8fafc',
              overflow: 'hidden',
              position: 'relative',
              transition: '0.3s'
            }}>
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {preview ? (
                preview.startsWith('data:video') ? (
                  <video src={preview} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={getDirectLink(preview)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <ImageIcon size={24} color="var(--primary)" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Klik untuk pilih media</span>
                </div>
              )}
            </label>
          </div>
          
          {hasYoutubeSelected && (
            <div className="input-group" style={{ marginTop: '1.5rem' }}>
              <label className="stat-label">Upload Thumbnail Kustom (Opsional)</label>
              <label style={{ 
                border: '2px dashed #cbd5e1', 
                borderRadius: '16px', 
                height: '140px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginTop: '0.5rem',
                cursor: 'pointer',
                background: '#f1f5f9',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setYtThumbnailFile(f);
                      const r = new FileReader();
                      r.onloadend = () => setYtThumbnailPreview(r.result);
                      r.readAsDataURL(f);
                    }
                  }} 
                />
                {ytThumbnailPreview ? (
                  <img src={ytThumbnailPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                    <FileImage size={18} /> Klik untuk pilih thumbnail
                  </div>
                )}
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="stat-label">Tanggal</label>
              <input type="date" style={{ marginTop: '0.5rem', background: '#f8fafc' }} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="stat-label">Waktu</label>
              <input type="time" style={{ marginTop: '0.5rem', background: '#f8fafc' }} value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', padding: '1.2rem', fontSize: '1rem' }}
            disabled={uploading}
          >
            {uploading ? 'Memproses...' : (
              <>
                <Send size={20} />
                <span>Jadwalkan Postingan</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* MEDIA SELECTION MODAL */}
      {showMediaModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '2rem' }} onClick={() => setShowMediaModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, background: '#ffffff', position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Pilih dari Galeri</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Gunakan foto dan video yang pernah Anda unggah</p>
              </div>
              <button 
                onClick={() => setShowMediaModal(false)}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: '0.2s' }}
                className="btn-hover-bg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid" style={{ overflowY: 'auto', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', padding: '2rem' }}>
              {(() => {
                const uniqueMedia = [];
                const seenUrls = new Set();
                (posts || []).forEach(post => {
                  if (post.mediaUrl && !seenUrls.has(post.mediaUrl)) {
                    seenUrls.add(post.mediaUrl);
                    uniqueMedia.push(post);
                  }
                });
                
                if (uniqueMedia.length === 0) {
                  return (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '16px', border: '2px dashed var(--border-color)' }}>
                      <ImageIcon size={64} style={{ opacity: 0.1, margin: '0 auto 1.5rem', color: 'var(--primary)' }} />
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Belum ada media</h4>
                      <p style={{ fontSize: '0.9rem' }}>Galeri ini akan menampilkan foto dan video yang pernah Anda unggah sebelumnya.</p>
                    </div>
                  );
                }

                return uniqueMedia.map(post => (
                 <div 
                   key={post.id} 
                   onClick={() => { setPreview(post.mediaUrl); setFile(null); setShowMediaModal(false); }}
                   style={{ cursor: 'pointer', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', transition: '0.3s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                   className="media-card-hover"
                 >
                   <div style={{ height: '140px', background: '#f1f5f9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                     {!isVideo(post) ? (
                       <img src={getDirectLink(post.mediaUrl)} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                       <>
                         <div style={{ width: '100%', height: '100%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Video color="var(--primary)" size={48} opacity={0.5} />
                         </div>
                         <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <div style={{ background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '50%' }}>
                             <Video color="var(--primary)" size={20} />
                           </div>
                         </div>
                       </>
                     )}
                   </div>
                   <div style={{ padding: '1rem' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                       {post.fileName || 'Media_Galeri'}
                     </div>
                   </div>
                 </div>
              ))})()}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              .media-card-hover:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
                border-color: var(--primary) !important;
              }
              .btn-hover-bg:hover {
                background: #f1f5f9 !important;
                color: var(--text-main) !important;
              }
            `}} />
          </div>
        </div>,
        document.body
      )}
      {uploading && createPortal(
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          background: 'rgba(15, 23, 42, 0.65)', 
          backdropFilter: 'blur(10px)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            color: 'var(--text-main)',
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
            {/* Spinning/pulsing upload indicator with percentage inside */}
            <div style={{ position: 'relative', marginBottom: '2rem', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', border: '5px solid #f1f5f9', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }}></div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {uploadProgress}%
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem', letterSpacing: '-0.5px' }}>
              {uploadStage || 'Menyimpan Jadwal...'}
            </h3>
            
            {/* Progress Bar Container */}
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#f1f5f9', 
              borderRadius: '999px', 
              overflow: 'hidden', 
              margin: '1.5rem 0',
              border: '1px solid #e2e8f0',
              position: 'relative'
            }}>
              <div style={{ 
                width: `${uploadProgress}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))', 
                borderRadius: '999px',
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)'
              }}></div>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, lineHeight: '1.6', margin: 0 }}>
              Proses pengunggahan sedang berjalan. Mohon jangan tutup halaman ini agar tidak terjadi kegagalan.
            </p>
          </div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {alertModal.show && (
            <div style={{ 
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
              background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 
            }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="card" 
                style={{ width: '450px', padding: '2.5rem', textAlign: 'center', border: 'none', background: '#fff', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}
              >
                <div style={{ width: '64px', height: '64px', background: '#fffbeb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#d97706', border: '1px solid #fde68a', flexShrink: 0 }}>
                  <Info size={32} style={{ display: 'block' }} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                  {alertModal.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6', fontWeight: 500 }}>
                  {alertModal.message}
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '0.9rem', borderRadius: '14px', margin: '0 auto' }}
                  onClick={() => setAlertModal({ show: false, title: '', message: '' })}
                >
                  Mengerti
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default Scheduler;
