import React, { useState } from 'react';
import { Plus, X, Info, ShieldCheck, HelpCircle, ExternalLink, Trash2, Edit3, MoreVertical, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const Accounts = ({ accounts, onAdd, onDelete, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [formData, setFormData] = useState({
    name: '', platform: 'facebook', handle: '', pageId: '', accessToken: '', appId: '', apiSecret: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.accessToken) return alert("Nama Akun dan Access Token wajib diisi!");
    
    if (isEditing) {
      onUpdate(formData.id, formData);
    } else {
      onAdd(formData);
    }
    
    handleCloseModal();
  };

  const handleEdit = (acc) => {
    setFormData(acc);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setFormData({ name: '', platform: 'facebook', handle: '', pageId: '', accessToken: '', appId: '', apiSecret: '' });
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/youtube.upload');
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential && credential.accessToken) {
        setFormData(prev => ({
          ...prev, 
          accessToken: credential.accessToken, 
          pageId: result.user.uid,
          name: prev.name || result.user.displayName || 'Channel YouTube'
        }));
      }
    } catch (error) {
      console.error(error);
      alert("Gagal login dengan Google: " + error.message);
    }
  };

  const guides = {
    facebook: {
      title: "Integrasi Meta Business",
      steps: [
        "Masuk ke Meta for Developers Dashboard.",
        "Buat App baru (Type: Business).",
        "Buka Graph API Explorer.",
        "Generate Long-lived Page Access Token.",
        "Page ID tersedia di menu Settings -> Page Info."
      ],
      link: "https://developers.facebook.com/docs/pages/access-tokens/"
    },
    tiktok: {
      title: "Integrasi TikTok Business",
      steps: [
        "Login ke TikTok for Developers.",
        "Ajukan akses 'Content Posting API'.",
        "Ambil Client Key & Secret dari tab App Config.",
        "Gunakan 'Business Account ID' dari profil bisnis Anda."
      ],
      link: "https://developers.tiktok.com/doc/about-tiktok-api/"
    },
    youtube: {
      title: "Integrasi YouTube Data API",
      steps: [
        "Masuk ke Google Cloud Console.",
        "Buat Project baru dan aktifkan YouTube Data API v3.",
        "Buat kredensial OAuth 2.0 Client ID.",
        "Generate Access Token menggunakan OAuth 2.0 Playground."
      ],
      link: "https://developers.google.com/youtube/v3/getting-started"
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="grid">
        {accounts.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '32px' }}>
             <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <ShieldCheck size={32} color="#94a3b8" />
             </div>
             <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Belum Ada Akun</h3>
             <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontWeight: 500 }}>Hubungkan akun developer Anda untuk mulai menjadwalkan postingan.</p>
             <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={() => setShowModal(true)}>
               <Plus size={20} /> Hubungkan Akun Pertama
             </button>
          </div>
        ) : (
          <>
            {accounts.map(acc => (
              <motion.div 
                layout
                key={acc.id} 
                className="card account-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '1.2rem', 
                  background: '#fff', 
                  position: 'relative',
                  padding: '1.8rem',
                  border: '1px solid #f1f5f9',
                  borderRadius: '24px',
                  transition: '0.3s'
                }}
              >
                {/* Header Kartu: Icon & Tombol Aksi */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className={`social-badge social-${acc.platform === 'instagram' ? 'ig' : (acc.platform === 'tiktok' ? 'tt' : (acc.platform === 'youtube' ? 'yt' : 'fb'))}`} style={{ width: '48px', height: '48px', borderRadius: '16px', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)' }}>
                    <i className={`fab fa-${acc.platform === 'facebook' ? 'facebook-f' : acc.platform}`} style={{ fontSize: '1.4rem' }}></i>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button 
                      onClick={() => handleEdit(acc)}
                      style={{ background: '#f8fafc', border: 'none', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', transition: '0.2s' }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button 
                      onClick={() => onDelete(acc.id)}
                      style={{ background: '#fff1f2', border: 'none', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer', transition: '0.2s' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Informasi Akun */}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                    {acc.name}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                    {acc.handle || acc.username || `@${acc.platform}_user`}
                  </p>
                </div>

                {/* Badges Status */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', background: '#f0fdf4', padding: '5px 12px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #dcfce7' }}>
                    <CheckCircle2 size={12} />
                    TERHUBUNG
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', background: '#f5f7ff', padding: '5px 12px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #e0e7ff' }}>
                    AUTO-POST AKTIF
                  </div>
                </div>
              </motion.div>
            ))}
            
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="card" 
              style={{ border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '180px', background: 'transparent', borderRadius: '24px' }}
              onClick={() => setShowModal(true)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={24} color="var(--primary)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Tambah Akun Baru</span>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showModal && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="card" 
              style={{ width: showHelp ? '1000px' : '600px', maxHeight: '95vh', padding: 0, display: 'flex', overflow: 'hidden', border: 'none', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '32px' }}
            >
              <div style={{ flex: 1, padding: '3.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                      {isEditing ? 'Edit Akun' : 'Hubungkan Akun'}
                    </h2>
                    <p className="stat-label" style={{ fontSize: '0.7rem' }}>KONFIGURASI API DEVELOPER</p>
                  </div>
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    style={{ background: showHelp ? 'var(--primary)' : '#f1f5f9', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px', color: showHelp ? 'white' : 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, fontSize: '0.8rem', transition: '0.3s' }}
                  >
                    <HelpCircle size={16} />
                    {showHelp ? "Tutup Panduan" : "Bantuan"}
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="input-group" style={{ flex: 1.5 }}>
                      <label className="stat-label">NAMA AKUN</label>
                      <input 
                        type="text" 
                        placeholder={
                          formData.platform === 'facebook' ? "Fanspage Bisnis Utama" :
                          formData.platform === 'instagram' ? "Akun Bisnis Instagram" :
                          formData.platform === 'tiktok' ? "Akun TikTok Shop/Kreator" :
                          "Channel YouTube Utama"
                        } 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} 
                      />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="stat-label">PLATFORM</label>
                      <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} style={{ width: '100%' }} disabled={isEditing}>
                        <option value="facebook">Facebook Page</option>
                        <option value="instagram">Instagram Business</option>
                        <option value="tiktok">TikTok Business</option>
                        <option value="youtube">YouTube Channel</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group" style={{ marginBottom: '2.5rem' }}>
                    <label className="stat-label">USERNAME SOSIAL (@HANDLE)</label>
                    <input 
                      type="text" 
                      placeholder={
                        formData.platform === 'facebook' ? "@halaman_fb" :
                        formData.platform === 'instagram' ? "@akun_ig" :
                        formData.platform === 'tiktok' ? "@tiktok_id" :
                        "@channel_yt"
                      }
                      value={formData.handle} onChange={e => setFormData({...formData, handle: e.target.value})} style={{ width: '100%' }} 
                    />
                  </div>

                  <div style={{ padding: '2.5rem', background: '#f8fafc', borderRadius: '28px', border: '1px solid #e2e8f0', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem', color: 'var(--primary)' }}>
                      <ShieldCheck size={22} />
                      <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px' }}>KREDENSIAL KEAMANAN</span>
                    </div>

                    {formData.platform === 'youtube' ? (
                      <div className="input-group" style={{ marginBottom: 0, textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                          Snooplink membutuhkan izin akses untuk mengunggah video ke YouTube Channel Anda.
                        </p>
                        <button 
                          type="button"
                          onClick={handleGoogleLogin}
                          style={{ 
                            background: '#fff', border: '1px solid #e2e8f0', color: 'var(--text-main)', 
                            fontWeight: 700, padding: '1rem', borderRadius: '16px', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', width: '100%', transition: '0.2s'
                          }}
                        >
                          <i className="fab fa-google" style={{ color: '#ea4335', fontSize: '1.2rem' }}></i>
                          Login dengan Akun Google
                        </button>
                        {formData.accessToken && (
                          <div style={{ marginTop: '1.2rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f0fdf4', padding: '0.8rem', borderRadius: '12px' }}>
                            <CheckCircle2 size={18} /> Berhasil Terhubung ke Google!
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                          <label className="stat-label" style={{ fontSize: '0.75rem' }}>
                            {formData.platform === 'tiktok' ? 'BUSINESS ACCOUNT ID' : 'PAGE ID'}
                          </label>
                          <input type="text" placeholder="Masukkan ID numerik atau karakter..." value={formData.pageId} onChange={e => setFormData({...formData, pageId: e.target.value})} style={{ width: '100%' }} />
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="stat-label" style={{ fontSize: '0.75rem' }}>PAGE ACCESS TOKEN (PERMANENT)</label>
                          <textarea rows={4} placeholder="Paste token di sini..." style={{ fontSize: '0.85rem', padding: '1.2rem', width: '100%', border: '1px solid #e2e8f0', borderRadius: '16px' }} value={formData.accessToken} onChange={e => setFormData({...formData, accessToken: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1.2rem', marginTop: '3.5rem' }}>
                    <button type="button" className="btn" style={{ background: '#f1f5f9', flex: 1, color: '#64748b', justifyContent: 'center', fontWeight: 700 }} onClick={handleCloseModal}>Batal</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', fontSize: '1rem' }}>
                      {isEditing ? 'Perbarui Akun' : 'Hubungkan Akun'}
                    </button>
                  </div>
                </form>
              </div>

              <AnimatePresence>
                {showHelp && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '450px', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ padding: '3.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
                        <HelpCircle size={24} color="var(--primary)" />
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Bantuan</h3>
                      </div>

                      <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '2.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                          {guides[formData.platform === 'tiktok' ? 'tiktok' : (formData.platform === 'youtube' ? 'youtube' : 'facebook')].title}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {guides[formData.platform === 'tiktok' ? 'tiktok' : (formData.platform === 'youtube' ? 'youtube' : 'facebook')].steps.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1.2rem' }}>
                              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: 500 }}>{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <a href={guides[formData.platform === 'tiktok' ? 'tiktok' : (formData.platform === 'youtube' ? 'youtube' : 'facebook')].link} target="_blank" rel="noreferrer" className="btn" style={{ background: 'var(--text-main)', color: 'white', width: '100%', justifyContent: 'center', borderRadius: '18px', fontSize: '0.9rem', padding: '1rem' }}>
                        Dokumentasi Resmi <ExternalLink size={16} style={{ marginLeft: '0.6rem' }} />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accounts;
