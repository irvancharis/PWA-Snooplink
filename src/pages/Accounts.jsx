import React, { useState } from 'react';
import { Plus, X, Info, ShieldCheck, HelpCircle, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Accounts = ({ accounts, onAdd }) => {
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [formData, setFormData] = useState({
    name: '', platform: 'facebook', handle: '', pageId: '', accessToken: '', appId: '', apiSecret: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.accessToken) return alert("Nama Akun dan Access Token wajib diisi!");
    onAdd(formData);
    setShowModal(false);
    setFormData({ name: '', platform: 'facebook', handle: '', pageId: '', accessToken: '', appId: '', apiSecret: '' });
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
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="grid">
        {accounts.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', background: '#fff', border: '2px dashed #e2e8f0' }}>
             <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>Belum ada akun developer yang terhubung.</p>
             <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={() => setShowModal(true)}>
               <Plus size={20} /> Hubungkan Akun Pertama
             </button>
          </div>
        ) : (
          <>
            {accounts.map(acc => (
              <div key={acc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#fff' }}>
                <div className={`social-badge social-${acc.platform === 'instagram' ? 'ig' : (acc.platform === 'tiktok' ? 'tt' : 'fb')}`}>
                  <i className={`fab fa-${acc.platform === 'facebook' ? 'facebook-f' : acc.platform}`}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{acc.name}</h3>
                  <p className="stat-label" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{acc.handle}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                    <span style={{ fontSize: '0.65rem', color: '#10b981', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #d1fae5' }}>TERHUBUNG</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--primary)', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #dbeafe' }}>AUTO-POST: AKTIF</span>
                  </div>
                </div>
              </div>
            ))}
            <div 
              className="card" 
              style={{ border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '120px', background: 'transparent' }}
              onClick={() => setShowModal(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <Plus size={24} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>Tambah Akun Baru</span>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
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
              style={{ width: showHelp ? '1000px' : '600px', maxHeight: '95vh', padding: 0, display: 'flex', overflow: 'hidden', border: 'none', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Hubungkan Akun</h2>
                    <p className="stat-label">PENGATURAN API DEVELOPER</p>
                  </div>
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    style={{ background: showHelp ? 'var(--primary)' : '#f1f5f9', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '12px', color: showHelp ? 'white' : 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600, fontSize: '0.8rem', transition: '0.3s' }}
                  >
                    <HelpCircle size={16} />
                    {showHelp ? "Tutup Panduan" : "Butuh Bantuan?"}
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="input-group" style={{ flex: 1.5 }}>
                      <label className="stat-label">NAMA AKUN</label>
                      <input type="text" placeholder="Contoh: Fanspage Bisnis Saya" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="stat-label">PLATFORM</label>
                      <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} style={{ width: '100%' }}>
                        <option value="facebook">Facebook Page</option>
                        <option value="instagram">Instagram Business</option>
                        <option value="tiktok">TikTok Business</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group" style={{ marginBottom: '2.5rem' }}>
                    <label className="stat-label">USERNAME SOSIAL (@HANDLE)</label>
                    <input type="text" placeholder="@username_bisnis" value={formData.handle} onChange={e => setFormData({...formData, handle: e.target.value})} style={{ width: '100%' }} />
                  </div>

                  <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '24px', border: '1.5px solid #e2e8f0', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem', color: 'var(--primary)' }}>
                      <ShieldCheck size={22} />
                      <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.5px' }}>KREDENSIAL API</span>
                    </div>

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="stat-label" style={{ fontSize: '0.75rem' }}>
                          {formData.platform === 'tiktok' ? 'BUSINESS ACCOUNT ID' : 'PAGE ID'}
                        </label>
                        <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }} onClick={() => setShowHelp(true)}>LIHAT PANDUAN</span>
                      </div>
                      <input type="text" placeholder="Masukkan ID dari dashboard developer" value={formData.pageId} onChange={e => setFormData({...formData, pageId: e.target.value})} style={{ width: '100%' }} />
                    </div>

                    <div className="input-group" style={{ marginBottom: formData.platform === 'tiktok' ? '1.5rem' : 0 }}>
                      <label className="stat-label" style={{ fontSize: '0.75rem' }}>ACCESS TOKEN (PERMANENT)</label>
                      <textarea rows={3} placeholder="Tempel token akses di sini..." style={{ fontSize: '0.85rem', padding: '1rem', width: '100%', border: '1.5px solid #e2e8f0' }} value={formData.accessToken} onChange={e => setFormData({...formData, accessToken: e.target.value})} />
                    </div>

                    {formData.platform === 'tiktok' && (
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                          <label className="stat-label" style={{ fontSize: '0.75rem' }}>CLIENT KEY</label>
                          <input type="text" placeholder="App Key" value={formData.appId} onChange={e => setFormData({...formData, appId: e.target.value})} style={{ width: '100%' }} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                          <label className="stat-label" style={{ fontSize: '0.75rem' }}>CLIENT SECRET</label>
                          <input type="password" placeholder="••••••••" value={formData.apiSecret} onChange={e => setFormData({...formData, apiSecret: e.target.value})} style={{ width: '100%' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1.2rem', marginTop: '3rem' }}>
                    <button type="button" className="btn" style={{ background: '#f1f5f9', flex: 1, color: 'var(--text-muted)', justifyContent: 'center' }} onClick={() => setShowModal(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Simpan Akun</button>
                  </div>
                </form>
              </div>

              <AnimatePresence>
                {showHelp && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '400px', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    style={{ background: '#f8fafc', borderLeft: '1.5px solid #e2e8f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ padding: '3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
                        <HelpCircle size={22} color="var(--primary)" />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Panduan Cepat</h3>
                      </div>

                      <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1.5px solid #e2e8f0', marginBottom: '2rem' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                          {guides[formData.platform === 'tiktok' ? 'tiktok' : 'facebook'].title}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {guides[formData.platform === 'tiktok' ? 'tiktok' : 'facebook'].steps.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1.2rem' }}>
                              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>{idx + 1}</span>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: 500 }}>{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <a href={guides[formData.platform === 'tiktok' ? 'tiktok' : 'facebook'].link} target="_blank" rel="noreferrer" className="btn" style={{ background: 'var(--text-main)', color: 'white', width: '100%', justifyContent: 'center', borderRadius: '16px', fontSize: '0.85rem' }}>
                        Dokumentasi Resmi <ExternalLink size={14} style={{ marginLeft: '0.5rem' }} />
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
