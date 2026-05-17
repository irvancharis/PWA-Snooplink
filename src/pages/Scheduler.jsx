import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Send } from 'lucide-react';

const Scheduler = ({ onSchedule, initialMedia, onClearInitial, accounts }) => {
  const [content, setContent] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialMedia) {
      setPreview(initialMedia);
    }
    return () => onClearInitial?.();
  }, [initialMedia]);

  useEffect(() => {
    // Auto-select first available account if none selected
    if (accounts.length > 0 && (!selectedAccountId || !accounts.find(a => a.id === selectedAccountId))) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("File terlalu besar! Maksimal 10MB.");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) return alert("Harap hubungkan akun sosial media terlebih dahulu!");
    if (!content || !date || !time) return alert("Harap isi semua kolom!");
    
    const account = accounts.find(a => a.id === selectedAccountId);
    
    setUploading(true);
    await onSchedule({ 
      content, 
      platform: account.platform, 
      accountId: selectedAccountId,
      accountName: account.username || account.name,
      time: `${date} ${time}`, 
      mediaUrl: preview || "",
      mediaType: file ? file.type : (preview?.startsWith('data:video') ? 'video/mp4' : 'image/jpeg'),
      file: file // Pass the file object for Storage upload
    });
    setUploading(false);
  };

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem', background: '#fff' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Buat Postingan Baru</h2>
        <p className="stat-label">Jadwalkan konten media sosial Anda dengan mudah</p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }}>
        <div>
          <div className="input-group">
            <label className="stat-label">Konten Postingan</label>
            <textarea 
              rows={8} 
              placeholder="Tulis sesuatu yang menarik di sini..." 
              style={{ marginTop: '0.5rem', background: '#f8fafc' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>
          
          <div className="input-group" style={{ marginTop: '2rem' }}>
            <label className="stat-label">Pilih Akun Platform</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.8rem' }}>
              {accounts.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Belum ada akun yang terhubung. Silakan hubungkan akun di menu Accounts.
                </div>
              ) : (
                accounts.map(acc => (
                  <div 
                    key={acc.id}
                    style={{ 
                      padding: '0.6rem 1rem', 
                      background: selectedAccountId === acc.id ? '#eef2ff' : '#f8fafc',
                      border: `1px solid ${selectedAccountId === acc.id ? 'var(--primary)' : 'var(--border-color)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      borderRadius: '12px',
                      transition: '0.2s'
                    }}
                    onClick={() => setSelectedAccountId(acc.id)}
                  >
                    <div className={`social-badge social-${acc.platform === 'facebook' ? 'fb' : (acc.platform === 'instagram' ? 'ig' : 'tt')}`} style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
                       <i className={`fab fa-${acc.platform === 'facebook' ? 'facebook-f' : acc.platform}`}></i>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: selectedAccountId === acc.id ? 'var(--primary)' : 'var(--text-main)' }}>{acc.username || acc.name || 'Account'}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{acc.platform}</span>
                    </div>
                    {selectedAccountId === acc.id && (
                      <div style={{ marginLeft: 'auto', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="input-group">
            <label className="stat-label">Unggah Media (Maks 10MB)</label>
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
                  <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <ImageIcon size={24} color="var(--primary)" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Klik untuk pilih gambar</span>
                </div>
              )}
            </label>
          </div>

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
    </div>
  );
};

export default Scheduler;
