import React, { useState } from 'react';
import { Image as ImageIcon, Send } from 'lucide-react';

const Scheduler = ({ onSchedule }) => {
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 1024 * 1024) {
        alert("File terlalu besar! Maksimal 1MB.");
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
    if (!content || !date || !time) return alert("Harap isi semua kolom!");
    setUploading(true);
    await onSchedule({ content, platform, time: `${date} ${time}`, mediaUrl: preview || "" });
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
            <label className="stat-label">Pilih Platform</label>
            <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.8rem' }}>
              {['facebook', 'instagram', 'tiktok'].map(p => (
                <div 
                  key={p}
                  className={`social-badge social-${p === 'facebook' ? 'fb' : (p === 'instagram' ? 'ig' : 'tt')} ${platform === p ? '' : 'grayscale opacity-50'}`} 
                  style={{ cursor: 'pointer', transform: platform === p ? 'scale(1.1)' : 'scale(1)', transition: '0.3s' }}
                  onClick={() => setPlatform(p)}
                >
                  <i className={`fab fa-${p === 'facebook' ? 'facebook-f' : p}`}></i>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="input-group">
            <label className="stat-label">Unggah Media (Maks 1MB)</label>
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
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {preview ? (
                <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
