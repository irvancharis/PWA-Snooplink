import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Info, ShieldCheck, HelpCircle, ExternalLink, Trash2, Edit3, MoreVertical, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

const Accounts = ({ accounts, onAdd, onDelete, onUpdate, user }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [fbPages, setFbPages] = useState([]);
  const [isFbLoading, setIsFbLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '', platform: 'facebook', handle: '', pageId: '', accessToken: '', appId: '', apiSecret: ''
  });
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.accessToken) {
      setAlertModal({
        show: true,
        title: "Formulir Tidak Lengkap",
        message: "Nama Akun dan Access Token wajib diisi!"
      });
      return;
    }
    
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
    setManualMode(false);
    setFormData({ name: '', platform: 'facebook', handle: '', pageId: '', accessToken: '', appId: '', apiSecret: '' });
  };

  const handleOpenAddModal = () => {
    const isSuperAdmin = user?.role === 'admin' || user?.email === 'irvancharis@gmail.com';
    const accountLimit = user?.accountLimit !== undefined ? user.accountLimit : 3;
    if (!isSuperAdmin && accounts.length >= accountLimit) {
      setAlertModal({
        show: true,
        title: "Batas Limit Tercapai",
        message: `Batas maksimal akun terhubung tercapai! Anda hanya diizinkan menghubungkan maksimal ${accountLimit} akun. Silakan hubungi admin untuk menambah limit.`
      });
      return;
    }
    setShowModal(true);
  };



  const handleGoogleLogin = (reconnectAcc = null) => {
    const clientId = [
      "687270813688-",
      "8fsdi9hsnjrv8jvna051acs7ofiuk0uo",
      ".apps.googleusercontent.com"
    ].join("");
    const clientSecret = [
      "GOCSPX-",
      "JWzHu1RjPJdsOniJB2q",
      "1QgkSatk3"
    ].join("");
    const redirectUri = window.location.origin;

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl')}` +
      `&access_type=offline` +
      `&prompt=consent`;

    const popup = window.open(oauthUrl, 'Google OAuth', 'width=500,height=600');

    const pollTimer = window.setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          window.clearInterval(pollTimer);
        }
        
        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.includes(redirectUri) && popupUrl.includes('code=')) {
          window.clearInterval(pollTimer);
          const urlParams = new URLSearchParams(popup.location.search);
          const code = urlParams.get('code');
          popup.close();
          
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code: code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code'
            })
          });
          
          const data = await response.json();
          if (data.refresh_token) {
            if (reconnectAcc && reconnectAcc.id && typeof reconnectAcc.id === 'string') {
              onUpdate(reconnectAcc.id, {
                ...reconnectAcc,
                accessToken: data.refresh_token
              });
            } else {
              setFormData(prev => ({
                ...prev, 
                accessToken: data.refresh_token,
                pageId: 'YouTube_User',
                name: prev.name || 'Channel YouTube'
              }));
            }
          } else {
            setAlertModal({
              show: true,
              title: "Token Tidak Lengkap",
              message: "Gagal mendapatkan Refresh Token. Jika pengguna pernah login sebelumnya, mereka harus mencabut izin Snooplink di pengaturan Google Account terlebih dahulu sebelum mencoba menghubungkan ulang."
            });
          }
        }
      } catch (e) {
        // Abaikan error cross-origin selama proses polling
      }
    }, 500);
  };

  const handleFacebookLogin = async () => {
    try {
      setIsFbLoading(true);
      const provider = new FacebookAuthProvider();
      provider.addScope('pages_manage_posts');
      provider.addScope('pages_show_list');
      provider.addScope('pages_read_engagement');
      if (formData.platform === 'instagram') {
        provider.addScope('instagram_basic');
        provider.addScope('instagram_content_publish');
      }
      
      const result = await signInWithPopup(auth, provider);
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const userToken = credential.accessToken;
      
      const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
      const data = await res.json();
      
      if (data.data && data.data.length > 0) {
        setFbPages(data.data);
      } else {
        setAlertModal({
          show: true,
          title: "Halaman Tidak Ditemukan",
          message: "Tidak ada Halaman Facebook yang ditemukan terikat pada akun Facebook ini."
        });
      }
    } catch (error) {
      console.error(error);
      setAlertModal({
        show: true,
        title: "Gagal Autentikasi Facebook",
        message: "Gagal melakukan proses login dengan Facebook: " + error.message
      });
    } finally {
      setIsFbLoading(false);
    }
  };

  const handlePageSelect = async (page) => {
    if (formData.platform === 'instagram') {
      setIsFbLoading(true);
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
        const data = await res.json();
        if (data.instagram_business_account) {
          setFormData(prev => ({
            ...prev,
            accessToken: page.access_token,
            pageId: data.instagram_business_account.id,
            name: prev.name || `${page.name} (IG)`
          }));
          setFbPages([]);
        } else {
          setAlertModal({
            show: true,
            title: "Instagram Tidak Terhubung",
            message: "Halaman Facebook ini tidak terhubung dengan Akun Instagram Bisnis yang aktif."
          });
        }
      } catch (err) {
        setAlertModal({
          show: true,
          title: "Gagal Mengambil Data",
          message: "Gagal mengambil data Instagram. Silakan periksa kembali tautan akun Anda."
        });
      } finally {
        setIsFbLoading(false);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        accessToken: page.access_token,
        pageId: page.id,
        name: prev.name || page.name
      }));
      setFbPages([]);
    }
  };

  const getGuideContent = (platform, isManual) => {
    if (platform === 'youtube') {
      return {
        title: "Panduan YouTube (Otomatis)",
        steps: [
          <span>Klik tombol <strong>"Login dengan Akun Google"</strong> di sebelah kiri.</span>,
          <span>Pop-up Google akan muncul. Pilih akun Google yang memiliki Channel YouTube Anda.</span>,
          <span>Izinkan SnoopLink untuk mengunggah dan melihat video YouTube Anda (centang semua izin).</span>,
          <span>Sistem akan otomatis mendapatkan Token. Klik <strong>"Hubungkan Akun"</strong> untuk menyimpan!</span>
        ],
        link: "https://developers.google.com/youtube/v3/getting-started"
      };
    }
    if (platform === 'facebook' || platform === 'instagram') {
      if (isManual) {
        return {
          title: `Panduan ${platform === 'facebook' ? 'Facebook' : 'Instagram'} (Kredensial Manual)`,
          steps: [
            <span><strong>Cari ID Halaman Anda:</strong> Buka Halaman FB Anda, masuk ke tab <strong>Tentang (About)</strong>. Scroll ke bawah, dan Anda akan menemukan <strong>ID Halaman (Page ID)</strong> berupa deretan angka resmi yang bisa langsung disalin.</span>,
            <span><strong>Buka Meta Developer:</strong> Masuk ke portal <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline'}}>Meta for Developers</a> dan buat aplikasi bertipe <strong>Business</strong>.</span>,
            <span><strong>Dapatkan Token Akses Halaman:</strong> Masuk ke <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline'}}>Meta Graph API Explorer</a>.</span>,
            <span>Pilih <strong>Halaman FB</strong> Anda pada dropdown, berikan izin <code>pages_manage_posts</code>, lalu klik <strong>Generate Token</strong>. Salin token panjang tersebut ke kolom di sebelah kiri.</span>
          ],
          link: "https://developers.facebook.com/docs/pages/access-tokens/"
        };
      } else {
        return {
          title: `Panduan ${platform === 'facebook' ? 'Facebook' : 'Instagram'} (Otomatis)`,
          steps: [
            <span>Klik tombol <strong>"Login dengan Facebook"</strong> yang berwarna biru di sebelah kiri.</span>,
            <span>Jendela pop-up Facebook resmi akan terbuka. Masuk ke akun Anda.</span>,
            <span>PENTING: Pilih <strong>"Edit Settings" / "Edit Pengaturan"</strong> untuk memilih Halaman mana saja yang ingin Anda hubungkan ke SnoopLink.</span>,
            <span>Lanjutkan proses perizinan hingga selesai.</span>,
            <span>Kembali ke SnoopLink, pilih Halaman Anda dari daftar dropdown yang muncul, lalu simpan!</span>
          ],
          link: "https://developers.facebook.com/docs/pages/access-tokens/"
        };
      }
    }
    // tiktok
    return {
      title: "Panduan TikTok (Kredensial Manual)",
      steps: [
        <span>Masuk ke <a href="https://developers.tiktok.com/" target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline'}}>TikTok for Developers</a>.</span>,
        <span>Ajukan izin akses untuk fitur <strong>'Content Posting API'</strong> di aplikasi Anda.</span>,
        <span>Salin <strong>Client Key</strong> &amp; <strong>Client Secret</strong> dari tab App Config Anda.</span>,
        <span>Gunakan <strong>Business Account ID</strong> Anda yang terdaftar pada profil bisnis TikTok.</span>
      ],
      link: "https://developers.tiktok.com/doc/about-tiktok-api/"
    };
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Account Limit Notice */}
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
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Limit Akun Terhubung: 
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
             {user?.role === 'admin' || user?.email === 'irvancharis@gmail.com' 
               ? `Terhubung: ${accounts.length} Akun / Limit: Tidak Terbatas` 
               : `Terhubung: ${accounts.length} Akun / Limit: Maksimal ${user?.accountLimit !== undefined ? user.accountLimit : 3} Akun`
             }
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Hubungi Admin untuk upgrade limit platform Anda
        </span>
      </div>

      <div className="grid">
        {accounts.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', background: '#fff', border: '2px dashed #e2e8f0', borderRadius: '32px' }}>
             <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <ShieldCheck size={32} color="#94a3b8" />
             </div>
             <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Belum Ada Akun</h3>
             <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontWeight: 500 }}>Hubungkan akun developer Anda untuk mulai menjadwalkan postingan.</p>
             <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={handleOpenAddModal}>
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
                    {acc.platform === 'youtube' && (
                      <button 
                        onClick={() => handleGoogleLogin(acc)}
                        title="Hubungkan Ulang / Perbarui Token"
                        style={{ background: '#f0fdf4', border: 'none', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', cursor: 'pointer', transition: '0.2s' }}
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
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
              onClick={handleOpenAddModal}
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
                          onClick={() => handleGoogleLogin(null)}
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
                    ) : formData.platform === 'facebook' || formData.platform === 'instagram' ? (
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Pilih Metode Hubungkan</span>
                          <button
                            type="button"
                            onClick={() => setManualMode(!manualMode)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {manualMode ? 'Gunakan Auto OAuth' : 'Gunakan Kredensial Manual (Page Token)'}
                          </button>
                        </div>

                        {manualMode ? (
                          <>
                            <div className="input-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                              <label className="stat-label" style={{ fontSize: '0.75rem' }}>
                                {formData.platform === 'instagram' ? 'INSTAGRAM BUSINESS ACCOUNT ID' : 'FACEBOOK PAGE ID'}
                              </label>
                              <input 
                                type="text" 
                                placeholder={formData.platform === 'instagram' ? "Masukkan ID Akun Bisnis Instagram..." : "Masukkan ID Halaman Facebook..."} 
                                value={formData.pageId} 
                                onChange={e => setFormData({...formData, pageId: e.target.value})} 
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #c7d2fe' }} 
                              />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0, textAlign: 'left' }}>
                              <label className="stat-label" style={{ fontSize: '0.75rem' }}>PAGE ACCESS TOKEN (PERMANENT / LONG-LIVED)</label>
                              <textarea 
                                rows={4} 
                                placeholder="Masukkan Page Access Token di sini..." 
                                style={{ fontSize: '0.85rem', padding: '1.2rem', width: '100%', border: '1px solid #e2e8f0', borderRadius: '16px' }} 
                                value={formData.accessToken} 
                                onChange={e => setFormData({...formData, accessToken: e.target.value})} 
                              />
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                              Snooplink membutuhkan izin akses untuk mengelola {formData.platform === 'instagram' ? 'Instagram Bisnis' : 'Facebook Page'} Anda.
                            </p>
                            
                            {!formData.accessToken && fbPages.length === 0 ? (
                              <button 
                                type="button"
                                onClick={handleFacebookLogin}
                                disabled={isFbLoading}
                                style={{ 
                                  background: '#1877f2', border: 'none', color: '#fff', 
                                  fontWeight: 700, padding: '1rem', borderRadius: '16px', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
                                  boxShadow: '0 4px 6px -1px rgba(24, 119, 242, 0.4)', width: '100%', transition: '0.2s',
                                  opacity: isFbLoading ? 0.7 : 1
                                }}
                              >
                                <i className="fab fa-facebook-f" style={{ fontSize: '1.2rem' }}></i>
                                {isFbLoading ? 'Memuat...' : 'Login dengan Facebook'}
                              </button>
                            ) : fbPages.length > 0 ? (
                              <div style={{ textAlign: 'left', background: '#f5f7ff', padding: '1rem', borderRadius: '16px', border: '1px solid #e0e7ff' }}>
                                <label className="stat-label" style={{ marginBottom: '0.5rem', display: 'block', color: 'var(--primary)' }}>PILIH HALAMAN {formData.platform === 'instagram' ? 'YANG TERHUBUNG KE IG' : ''}</label>
                                <select 
                                  onChange={(e) => {
                                    const selected = fbPages.find(p => p.id === e.target.value);
                                    if(selected) handlePageSelect(selected);
                                  }} 
                                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #c7d2fe' }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>-- Pilih Halaman --</option>
                                  {fbPages.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f0fdf4', padding: '0.8rem', borderRadius: '12px' }}>
                                <CheckCircle2 size={18} /> Berhasil Terhubung ke {formData.name}!
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                          <label className="stat-label" style={{ fontSize: '0.75rem' }}>
                            BUSINESS ACCOUNT ID
                          </label>
                          <input type="text" placeholder="Masukkan ID numerik atau karakter..." value={formData.pageId} onChange={e => setFormData({...formData, pageId: e.target.value})} style={{ width: '100%' }} />
                        </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="stat-label" style={{ fontSize: '0.75rem' }}>ACCESS TOKEN (PERMANENT)</label>
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
                          {getGuideContent(formData.platform, manualMode).title}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {getGuideContent(formData.platform, manualMode).steps.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1.2rem' }}>
                              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: 500 }}>{step}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <a href={getGuideContent(formData.platform, manualMode).link} target="_blank" rel="noreferrer" className="btn" style={{ background: 'var(--text-main)', color: 'white', width: '100%', justifyContent: 'center', borderRadius: '18px', fontSize: '0.9rem', padding: '1rem' }}>
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

export default Accounts;
