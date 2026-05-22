import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, RefreshCw, Server, CheckCircle2, AlertCircle, PlayCircle, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HF_SECRET = 'SnooplinkSuperSecret123'; // Default shared secret

const StreamingServers = ({ user }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', accountId: '', accountName: '' });
  const [statuses, setStatuses] = useState({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'social_accounts'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accData);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'streaming_nodes'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serverData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServers(serverData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  // Check the status of a specific server
  const checkServerStatus = async (serverId, serverUrl) => {
    setStatuses(prev => ({ ...prev, [serverId]: { loading: true } }));
    try {
      // clean the url trailing slash
      const cleanUrl = serverUrl.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/status?secret=${HF_SECRET}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatuses(prev => ({ 
        ...prev, 
        [serverId]: { 
          loading: false, 
          status: data.status, 
          postId: data.postId,
          logs: data.logs 
        } 
      }));
    } catch (err) {
      console.error(err);
      setStatuses(prev => ({ 
        ...prev, 
        [serverId]: { 
          loading: false, 
          status: 'OFFLINE', 
          error: err.message 
        } 
      }));
    }
  };

  // Check status of all servers
  const checkAllServers = async () => {
    setCheckingAll(true);
    const promises = servers.map(server => checkServerStatus(server.id, server.url));
    await Promise.all(promises);
    setCheckingAll(false);
  };

  useEffect(() => {
    if (servers.length > 0 && Object.keys(statuses).length === 0) {
      checkAllServers();
    }
  }, [servers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) {
      alert("Nama Server dan URL wajib diisi!");
      return;
    }

    // Clean URL
    let formattedUrl = formData.url.trim().replace(/\/$/, "");
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      await addDoc(collection(db, 'streaming_nodes'), {
        userId: user.id,
        name: formData.name.trim(),
        url: formattedUrl,
        accountId: formData.accountId || null,
        accountName: formData.accountName || null,
        createdAt: serverTimestamp()
      });
      setFormData({ name: '', url: '', accountId: '', accountName: '' });
      setShowModal(false);
    } catch (err) {
      alert("Gagal menambahkan server: " + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus server "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'streaming_nodes', id));
    } catch (err) {
      alert("Gagal menghapus server: " + err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Memuat data server...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="stat-label" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Daftar Hugging Face Spaces untuk penyeimbang beban streaming otomatis (*Auto Load Balancing*).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={checkAllServers} 
            disabled={checkingAll}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px', padding: '0 1.2rem', borderRadius: '12px' }}
          >
            <RefreshCw size={16} className={checkingAll ? 'animate-spin' : ''} />
            <span>Pindai Ulang</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setFormData({ name: '', url: '', accountId: '', accountName: '' });
              setShowModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px', padding: '0 1.2rem', borderRadius: '12px' }}
          >
            <Plus size={18} />
            <span>Tambah Server</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {servers.map((server) => {
          const state = statuses[server.id] || { loading: true };
          return (
            <div 
              key={server.id} 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)', 
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Server size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{server.name}</h4>
                      <a href={server.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                        <span>Buka Space</span>
                        <ExternalLink size={12} />
                      </a>
                      {server.accountName ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '6px', marginTop: '0.4rem', fontWeight: 600 }}>
                          Terikat: {server.accountName}
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '6px', marginTop: '0.4rem', fontWeight: 600 }}>
                          Semua Akun (Umum)
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(server.id, server.name)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px' }}
                    title="Hapus Server"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ marginTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    {state.loading ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <RefreshCw size={12} className="animate-spin" />
                        Mengecek...
                      </span>
                    ) : state.status === 'IDLE' ? (
                      <span style={{ fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={14} />
                        KOSONG (SIAP)
                      </span>
                    ) : state.status === 'STREAMING' ? (
                      <span style={{ fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <PlayCircle size={14} />
                        SIARAN AKTIF
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }} title={state.error}>
                        <AlertCircle size={14} />
                        OFFLINE / TIDUR
                      </span>
                    )}
                  </div>
                  {state.status === 'STREAMING' && state.postId && (
                    <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>ID Postingan: {state.postId}</span>
                      {state.logs && state.logs.length > 0 && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Log terakhir: {state.logs[state.logs.length - 1]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.2rem', paddingTop: '0.8rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => checkServerStatus(server.id, server.url)} 
                  disabled={state.loading}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: '8px' }}
                >
                  <RefreshCw size={12} className={state.loading ? 'animate-spin' : ''} />
                  <span>Cek Status</span>
                </button>
              </div>
            </div>
          );
        })}

        {servers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 2rem', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1' }}>
            <Server size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>Belum ada server streaming</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
              Klik tombol "Tambah Server" untuk mendaftarkan URL Space Hugging Face Anda ke dalam pool penyeimbang beban otomatis.
            </p>
          </div>
        )}
      </div>

      {/* Modal Tambah Server */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="card"
              style={{ width: '100%', maxWidth: '450px', position: 'relative', zIndex: 10, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#fff', borderRadius: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Tambah Server Streaming</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Nama Server / Label</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Server Live 1" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem 1rem', borderRadius: '12px' }}
                    required
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>URL Space Hugging Face</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: https://irvancharis-live1.hf.space" 
                    value={formData.url} 
                    onChange={e => setFormData({ ...formData, url: e.target.value })} 
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem 1rem', borderRadius: '12px' }}
                    required
                  />
                  <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pastikan menyertakan skema HTTP/HTTPS lengkap. Gunakan URL langsung Hugging Face Space (direct Space URL).
                  </small>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Hubungkan ke Akun Sosial (Opsional)</label>
                  <select 
                    value={formData.accountId || ''} 
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedAcc = accounts.find(a => a.id === selectedId);
                      setFormData({ 
                        ...formData, 
                        accountId: selectedId,
                        accountName: selectedAcc ? `${selectedAcc.platform.toUpperCase()} - ${selectedAcc.name || selectedAcc.username}` : ''
                      });
                    }}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '100%', padding: '0.75rem 1rem', borderRadius: '12px' }}
                  >
                    <option value="">Semua Akun / Umum (Load Balancing)</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.platform.toUpperCase()} - {acc.name || acc.username}
                      </option>
                    ))}
                  </select>
                  <small style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pilih akun tertentu jika Anda ingin membatasi server ini khusus untuk menyiarkan akun tersebut.
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Batal</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan Server</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamingServers;
