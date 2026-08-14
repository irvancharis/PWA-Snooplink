import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, AlertTriangle, CheckCircle, FileText, Sparkles, ShieldAlert, ArrowRight, Zap, Play, Server } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const Recovery = ({ accounts = [], user }) => {
  const [selectedAccId, setSelectedAccId] = useState('');
  const [channelInput, setChannelInput] = useState('');
  const [activeTab, setActiveTab] = useState('channel'); // 'channel', 'metadata', 'sanitizer', 'seo'

  // Loading States
  const [scanning, setScanning] = useState(false);
  const [pingingId, setPingingId] = useState(null);
  const [sanitizing, setSanitizing] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [scanningMetadata, setScanningMetadata] = useState(false);

  // Result States
  const [channelResult, setChannelResult] = useState(null);
  const [metadataResult, setMetadataResult] = useState(null);
  const [sanitizerResult, setSanitizerResult] = useState(null);
  const [seoResult, setSeoResult] = useState(null);

  // Bulk Ping Status
  const [bulkPingActive, setBulkPingActive] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkLogs, setBulkLogs] = useState('');

  // Form Inputs
  const [metadataInput, setMetadataInput] = useState({ url: '', title: '', description: '', tags: '' });
  const [sanitizerInput, setSanitizerInput] = useState('');
  const [seoInput, setSeoInput] = useState({ niche: '', keywords: '' });

  // Configurable Recovery Server URL
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('snooplink_recovery_backend') || 'http://127.0.0.1:5000';
  });
  const [servers, setServers] = useState([]);

  // Fetch registered streaming/recovery nodes from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'streaming_nodes'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serverData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServers(serverData);
    });
    return unsubscribe;
  }, [user]);

  const BACKEND_URL = backendUrl.replace(/\/$/, "");

  // Filter YouTube accounts
  const ytAccounts = accounts.filter(a => a.platform === 'youtube');

  // Pre-fill input when selecting a connected account
  const handleAccountChange = (e) => {
    const accId = e.target.value;
    setSelectedAccId(accId);
    if (accId) {
      const acc = ytAccounts.find(a => a.id === accId);
      if (acc) {
        setChannelInput(acc.handle || acc.name || '');
      }
    } else {
      setChannelInput('');
    }
  };

  const runChannelCheck = async (e) => {
    if (e) e.preventDefault();
    if (!channelInput) return;

    setScanning(true);
    setChannelResult(null);
    setBulkPingActive(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/check-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelInput })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setChannelResult(data);
      } else {
        alert(data.message || 'Gagal memeriksa status channel.');
      }
    } catch (err) {
      console.error(err);
      alert(`Gagal terhubung ke Server Pemulihan di (${BACKEND_URL}). Pastikan server Flask berjalan di latar belakang atau pilih server Hugging Face Space yang aktif di panel atas.`);
    } finally {
      setScanning(false);
    }
  };

  const runInstantPing = async (videoId) => {
    setPingingId(videoId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ping-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoId })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        alert('Ping Pemulihan terkirim sukses ke Google & Ping-o-matic!');
      } else {
        alert(data.message || 'Gagal mengirim sinyal ping.');
      }
    } catch (err) {
      alert('Koneksi server gagal.');
    } finally {
      setPingingId(null);
    }
  };

  const runBulkPing = async (videoIds) => {
    if (!videoIds || videoIds.length === 0) return;
    setBulkPingActive(true);
    setBulkProgress({ current: 0, total: videoIds.length });
    setBulkLogs('Memulai ping pemulihan massal...\n');

    let completed = 0;
    for (let i = 0; i < videoIds.length; i++) {
      const vid = videoIds[i];
      setBulkLogs(prev => prev + `[${i + 1}/${videoIds.length}] Mengirim ping video ID: ${vid}...\n`);
      try {
        const res = await fetch(`${BACKEND_URL}/api/ping-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: vid })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          setBulkLogs(prev => prev + ` -> Sukses! Google PubSub & Ping-o-matic terkirim.\n`);
        } else {
          setBulkLogs(prev => prev + ` -> Gagal: ${data.message || 'Respon error'}\n`);
        }
      } catch (err) {
        setBulkLogs(prev => prev + ` -> Gagal: Koneksi terputus.\n`);
      }
      completed++;
      setBulkProgress({ current: completed, total: videoIds.length });
    }
    setBulkLogs(prev => prev + `\nSelesai! Semua video terdaftar berhasil di-ping.`);
  };

  const handleInstantAudit = (videoId, title) => {
    setMetadataInput({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: title || '',
      description: '',
      tags: ''
    });
    setActiveTab('metadata');
  };

  const fetchMetadataDetails = async () => {
    if (!metadataInput.url) return;
    setScanningMetadata(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: metadataInput.url })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setMetadataInput(prev => ({
          ...prev,
          title: data.title || '',
          description: data.description || '',
          tags: data.tags || ''
        }));
        setMetadataResult(data);
      } else {
        alert(data.message || 'Gagal mengambil detail video.');
      }
    } catch (err) {
      alert(`Gagal terhubung ke server Pemulihan di (${BACKEND_URL}).`);
    } finally {
      setScanningMetadata(false);
    }
  };

  const runMetadataScan = async (e) => {
    e.preventDefault();
    setScanningMetadata(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: metadataInput.title,
          description: metadataInput.description,
          tags: metadataInput.tags
        })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setMetadataResult(data);
      } else {
        alert(data.message || 'Gagal menganalisis metadata.');
      }
    } catch (err) {
      alert(`Koneksi gagal ke server Pemulihan di (${BACKEND_URL}).`);
    } finally {
      setScanningMetadata(false);
    }
  };

  const runSanitizer = async (e) => {
    e.preventDefault();
    if (!sanitizerInput) return;
    setSanitizing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/clean-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sanitizerInput })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSanitizerResult(data);
      } else {
        alert(data.message || 'Gagal melakukan sanitasi deskripsi.');
      }
    } catch (err) {
      alert(`Koneksi gagal ke server Pemulihan di (${BACKEND_URL}).`);
    } finally {
      setSanitizing(false);
    }
  };

  const runSeoGenerator = async (e) => {
    e.preventDefault();
    if (!seoInput.niche) return;
    setGeneratingSeo(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/generate-seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: seoInput.niche, keywords: seoInput.keywords })
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSeoResult(data);
      } else {
        alert(data.message || 'Gagal menghasilkan metadata SEO.');
      }
    } catch (err) {
      alert(`Koneksi gagal ke server Pemulihan di (${BACKEND_URL}).`);
    } finally {
      setGeneratingSeo(false);
    }
  };

  const getSpamColor = (score) => {
    if (score >= 40) return '#ef4444';
    if (score >= 15) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Recovery Backend Server Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 1.5rem',
        background: '#f8fafc',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: '#e0f2fe', 
            color: '#0284c7', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Server size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Server Pemulihan (Backend)</h4>
            <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pilih server Flask atau Hugging Face Space aktif untuk memproses indeksasi dan SEO.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>PILIH SERVER TERDAFTAR</span>
            <select
              value={backendUrl}
              onChange={(e) => {
                const url = e.target.value;
                setBackendUrl(url);
                localStorage.setItem('snooplink_recovery_backend', url);
              }}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                minWidth: '240px',
                cursor: 'pointer'
              }}
            >
              <option value="http://127.0.0.1:5000">Server Lokal (http://127.0.0.1:5000)</option>
              {servers.map(server => (
                <option key={server.id} value={server.url}>{server.name} ({server.url})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>ATAU INPUT URL CUSTOM</span>
            <input
              type="text"
              placeholder="https://..."
              value={backendUrl}
              onChange={(e) => {
                const url = e.target.value;
                setBackendUrl(url);
                localStorage.setItem('snooplink_recovery_backend', url);
              }}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                width: '260px'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Top Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '1rem', paddingBottom: '0.2rem' }}>
        {[
          { id: 'channel', label: 'Channel Recovery', icon: RefreshCw },
          { id: 'metadata', label: 'Spam Scanner', icon: Search },
          { id: 'sanitizer', label: 'Description Sanitizer', icon: ShieldAlert },
          { id: 'seo', label: 'Safe SEO Generator', icon: Sparkles }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.2rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: activeTab === tab.id ? 'var(--primary)' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: '0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="card" style={{ background: '#fff', padding: '2rem', border: '1px solid #f1f5f9', borderRadius: '24px' }}>
        
        {/* TAB 1: Channel Recovery */}
        {activeTab === 'channel' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Channel Visibility & Re-Ping</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Periksa posisi pencarian channel Anda secara real-time dan kirim sinyal recovery massal untuk memulihkan traffic penonton.
            </p>

            <form onSubmit={runChannelCheck} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label className="stat-label" style={{ marginBottom: '0.5rem', display: 'block' }}>AKUN TERHUBUNG</label>
                  <select value={selectedAccId} onChange={handleAccountChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <option value="">-- Gunakan Akun Terhubung --</option>
                    {ytAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.handle || '@no_handle'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2, minWidth: '280px' }}>
                  <label className="stat-label" style={{ marginBottom: '0.5rem', display: 'block' }}>ATAU MASUKKAN HANDLE CHANNEL MANUAL</label>
                  <input
                    type="text"
                    placeholder="Contoh: @MrBeast atau https://youtube.com/@handle"
                    value={channelInput}
                    onChange={e => setChannelInput(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={scanning}>
                {scanning ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                <span>{scanning ? 'Menganalisis Channel...' : 'Mulai Analisis & Pemindaian Visibility'}</span>
              </button>
            </form>

            {/* Results Grid */}
            {channelResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s' }}>
                
                {/* Visibility Alert */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.2rem',
                  borderRadius: '16px',
                  border: `1px solid ${channelResult.result === 'safe' ? '#dcfce7' : (channelResult.result === 'warning' ? '#fef3c7' : '#fee2e2')}`,
                  background: channelResult.result === 'safe' ? '#f0fdf4' : (channelResult.result === 'warning' ? '#fffbeb' : '#fef2f2'),
                  color: channelResult.result === 'safe' ? '#16a34a' : (channelResult.result === 'warning' ? '#d97706' : '#ef4444')
                }}>
                  {channelResult.result === 'safe' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                  <div>
                    <strong style={{ fontSize: '1rem', display: 'block', textTransform: 'uppercase' }}>
                      Status Indeks: {channelResult.result === 'safe' ? 'AMAN' : (channelResult.result === 'warning' ? 'PERINGATAN' : 'TERBATASI (SHADOWBANNED)')}
                    </strong>
                    <span style={{ fontSize: '0.88rem' }}>{channelResult.description}</span>
                  </div>
                </div>

                {/* Channel Details Card */}
                {channelResult.channel_info && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <img src={channelResult.channel_info.thumbnail} alt="Avatar" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} />
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{channelResult.channel_info.title}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0' }}>{channelResult.channel_info.handle} • ID: {channelResult.channel_info.channel_id}</p>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Peringkat: <strong style={{ color: 'var(--primary)' }}>#{channelResult.rank || 'Tersembunyi'}</strong></span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subs: <strong>{channelResult.channel_info.subscribers}</strong></span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Video: <strong>{channelResult.channel_info.video_count}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optimization List */}
                {channelResult.optimizations && channelResult.optimizations.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Hasil Audit Optimasi Metadata Channel:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {channelResult.optimizations.map((opt, i) => (
                        <div key={i} style={{ borderLeft: `4px solid ${opt.type === 'danger' ? '#ef4444' : '#f59e0b'}`, paddingLeft: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: opt.type === 'danger' ? '#ef4444' : '#d97706' }}>{opt.title}</span>
                          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0' }}><strong>Saat ini:</strong> {opt.current}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}><strong>Solusi:</strong> {opt.expected}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video list with Bulk Ping */}
                {channelResult.videos && channelResult.videos.length > 0 && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Konten Terbaru & Pemulihan Massal</h4>
                      <button
                        onClick={() => runBulkPing(channelResult.videos.map(v => v.video_id))}
                        className="btn btn-primary"
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                        disabled={bulkPingActive}
                      >
                        <Zap size={14} />
                        <span>Re-Ping Semua Konten</span>
                      </button>
                    </div>

                    {/* Bulk Ping progress bar */}
                    {bulkPingActive && (
                      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span>Mengirim Sinyal Indeksasi Massal...</span>
                          <span>{bulkProgress.current} / {bulkProgress.total}</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s' }}></div>
                        </div>
                        <pre style={{ maxHeight: '120px', overflowY: 'auto', background: '#0f172a', color: '#38bdf8', padding: '0.8rem', borderRadius: '8px', fontSize: '0.72rem', marginTop: '0.8rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                          {bulkLogs}
                        </pre>
                      </div>
                    )}

                    {/* Video list grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {channelResult.videos.map(v => (
                        <div key={v.video_id} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
                          <img src={v.thumbnail} alt="Thumb" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '1rem' }}>
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', height: '2.8em' }}>
                                {v.title}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
                                {v.views} • {v.published}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => runInstantPing(v.video_id)}
                                className="btn"
                                style={{ flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem', fontSize: '0.8rem', justifyContent: 'center' }}
                                disabled={pingingId === v.video_id}
                              >
                                {pingingId === v.video_id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                                <span>Ping</span>
                              </button>
                              <button
                                onClick={() => handleInstantAudit(v.video_id, v.title)}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', justifyContent: 'center' }}
                              >
                                Audit
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Spam Scanner */}
        {activeTab === 'metadata' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Metadata Spam Scanner</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Analisis metadata video Anda secara mendalam untuk mendeteksi filter spam tersembunyi yang menghalangi jangkauan video.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <div className="input-group">
                <label className="stat-label">TEMPELKAN URL VIDEO YOUTUBE (UNTUK PRE-FILL OTOMATIS)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Optional: https://www.youtube.com/watch?v=..."
                    value={metadataInput.url}
                    onChange={e => setMetadataInput({ ...metadataInput, url: e.target.value })}
                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
                  <button type="button" onClick={fetchMetadataDetails} className="btn btn-primary" disabled={scanningMetadata}>
                    {scanningMetadata ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                    <span>Ambil</span>
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={runMetadataScan} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group">
                <label className="stat-label">JUDUL VIDEO</label>
                <input
                  type="text"
                  value={metadataInput.title}
                  onChange={e => setMetadataInput({ ...metadataInput, title: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  placeholder="Masukkan judul video..."
                />
              </div>

              <div className="input-group">
                <label className="stat-label">DESKRIPSI VIDEO</label>
                <textarea
                  rows="5"
                  value={metadataInput.description}
                  onChange={e => setMetadataInput({ ...metadataInput, description: e.target.value })}
                  style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  placeholder="Masukkan deskripsi video..."
                />
              </div>

              <div className="input-group">
                <label className="stat-label">TAGS VIDEO (PISAHKAN DENGAN KOMA)</label>
                <input
                  type="text"
                  value={metadataInput.tags}
                  onChange={e => setMetadataInput({ ...metadataInput, tags: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  placeholder="tag1, tag2, tag3..."
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={scanningMetadata}>
                {scanningMetadata ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                <span>Pindai & Analisis Metadata</span>
              </button>
            </form>

            {metadataResult && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc', animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '120px', background: '#fff', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <label className="stat-label" style={{ fontSize: '0.7rem' }}>SPAM SCORE</label>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: getSpamColor(metadataResult.spam_score) }}>{metadataResult.spam_score}%</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '120px', background: '#fff', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <label className="stat-label" style={{ fontSize: '0.7rem' }}>RISK LEVEL</label>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: metadataResult.risk_level === 'High' ? '#ef4444' : (metadataResult.risk_level === 'Moderate' ? '#f59e0b' : '#10b981') }}>
                      {metadataResult.risk_level}
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>Rekomendasi Perbaikan:</h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.2rem' }}>
                  {metadataResult.warnings.map((w, idx) => (
                    <li key={idx} style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Description Sanitizer */}
        {activeTab === 'sanitizer' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Description Sanitizer</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Bersihkan link pendek bermasalah, rapikan kapitalisasi teks berlebihan, dan batasi hashtag secara otomatis agar aman dari flag algoritma spam.
            </p>

            <form onSubmit={runSanitizer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group">
                <label className="stat-label">TEKS DESKRIPSI YANG AKAN DIBERSIHKAN</label>
                <textarea
                  rows="6"
                  value={sanitizerInput}
                  onChange={e => setSanitizerInput(e.target.value)}
                  style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                  placeholder="Tempel deskripsi bermasalah Anda di sini..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={sanitizing}>
                {sanitizing ? <RefreshCw size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                <span>Sanitasi & Bersihkan Deskripsi</span>
              </button>
            </form>

            {sanitizerResult && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="stat-label" style={{ fontSize: '0.75rem', color: '#10b981' }}>HASIL SANITASI (SALIN & TEMPEL KE VIDEO ANDA)</label>
                  <textarea
                    readOnly
                    rows="6"
                    value={sanitizerResult.cleaned_text}
                    onClick={e => e.target.select()}
                    style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#fff', fontFamily: 'inherit', resize: 'none' }}
                  />
                  <small style={{ color: 'var(--text-muted)' }}>*Klik teks untuk menyeleksi semua dan menyalin.</small>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Tindakan yang Dilakukan:</h4>
                  <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {sanitizerResult.actions_taken.map((act, i) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: '#475569' }}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Safe SEO Generator */}
        {activeTab === 'seo' && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Safe SEO Generator</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Tulis metadata SEO yang 100% aman secara instan berdasarkan niche dan kata kunci video Anda.
            </p>

            <form onSubmit={runSeoGenerator} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group">
                <label className="stat-label">NICHE / TOPIK UTAMA VIDEO</label>
                <input
                  type="text"
                  placeholder="Contoh: minecraft survival, unboxing handphone"
                  value={seoInput.niche}
                  onChange={e => setSeoInput({ ...seoInput, niche: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="stat-label">TARGET KATA KUNCI (PISAHKAN DENGAN KOMA)</label>
                <input
                  type="text"
                  placeholder="Contoh: cara main redstone, tutorial redstone pemula"
                  value={seoInput.keywords}
                  onChange={e => setSeoInput({ ...seoInput, keywords: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={generatingSeo}>
                {generatingSeo ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                <span>Buat Metadata SEO Aman</span>
              </button>
            </form>

            {seoResult && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s' }}>
                <div className="input-group">
                  <label className="stat-label">REKOMENDASI JUDUL</label>
                  <input
                    type="text"
                    readOnly
                    value={seoResult.title}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff' }}
                  />
                </div>

                <div className="input-group">
                  <label className="stat-label">REKOMENDASI DESKRIPSI</label>
                  <textarea
                    readOnly
                    rows="6"
                    value={seoResult.description}
                    style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#fff', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="input-group">
                  <label className="stat-label">REKOMENDASI TAGS</label>
                  <input
                    type="text"
                    readOnly
                    value={seoResult.tags}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Recovery;
