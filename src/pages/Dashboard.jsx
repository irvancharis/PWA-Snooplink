import React, { useState, useMemo, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Video, 
  FileImage, 
  X, 
  RefreshCw, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  Repeat, 
  ExternalLink, 
  Square,
  Eye,
  Users,
  Clock,
  Radio,
  Activity,
  Flame,
  Filter,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getFreshAccessToken, fetchChannelDetails, fetchYouTubeDailyAnalytics } from '../services/youtubeAnalytics';

const Dashboard = ({ posts: allPosts = [], accounts = [], onUpdate, onUseMedia, user, onViewAll }) => {
  const posts = allPosts.filter(p => p.status !== 'Deleted');
  const [selectedPost, setSelectedPost] = useState(null);
  const [stoppingIds, setStoppingIds] = useState({});

  // Analytics Controls
  const ytAccounts = accounts.filter(a => a.platform === 'youtube');
  const [selectedAccountId, setSelectedAccountId] = useState(ytAccounts.length > 0 ? ytAccounts[0].id : 'all');
  const [timeRange, setTimeRange] = useState('28d'); // 7d, 28d, 90d
  const [metricTab, setMetricTab] = useState('views'); // views, watchHours, subscribers

  // Live YouTube API state
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [liveYtData, setLiveYtData] = useState({
    channelInfo: null,
    dailyPoints: [],
    totals: { views: 0, watchHours: 0, subscribers: 0 }
  });

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Fetch real-time YouTube Analytics
  useEffect(() => {
    let isCancelled = false;

    async function loadRealAnalytics() {
      const targetAcc = selectedAccount || (ytAccounts.length > 0 ? ytAccounts[0] : null);
      if (!targetAcc || targetAcc.platform !== 'youtube' || !targetAcc.accessToken) {
        setLiveYtData({ channelInfo: null, dailyPoints: [], totals: { views: 0, watchHours: 0, subscribers: 0 } });
        return;
      }

      setLoadingAnalytics(true);
      setAnalyticsError(null);

      try {
        const token = await getFreshAccessToken(targetAcc);
        const channelInfo = await fetchChannelDetails(token);

        // YouTube Analytics API typically has a 2-day processing latency
        const days = timeRange === '7d' ? 7 : timeRange === '28d' ? 28 : 90;
        const now = new Date();
        const endDateObj = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // T-2 days
        const startDateObj = new Date(endDateObj.getTime() - days * 24 * 60 * 60 * 1000);

        const formatDate = (d) => d.toISOString().split('T')[0];
        const startDate = formatDate(startDateObj);
        const endDate = formatDate(endDateObj);

        let dailyPoints = [];
        try {
          dailyPoints = await fetchYouTubeDailyAnalytics(token, startDate, endDate);
        } catch (apiErr) {
          console.warn("YouTube Analytics API error:", apiErr);
          setAnalyticsError(apiErr.message || "Gagal memuat laporan YouTube Analytics.");
        }

        if (!isCancelled) {
          const totalViews = dailyPoints.reduce((acc, curr) => acc + curr.views, 0);
          const totalMinutes = dailyPoints.reduce((acc, curr) => acc + curr.watchMinutes, 0);
          const totalSubs = dailyPoints.reduce((acc, curr) => acc + curr.subscribers, 0);

          setLiveYtData({
            channelInfo,
            dailyPoints,
            totals: {
              views: totalViews,
              watchHours: Number((totalMinutes / 60).toFixed(1)),
              subscribers: totalSubs
            }
          });
        }
      } catch (err) {
        console.error("Error fetching YouTube Analytics:", err);
        if (!isCancelled) {
          setAnalyticsError(err.message || "Gagal memuat data resmi YouTube API.");
        }
      } finally {
        if (!isCancelled) setLoadingAnalytics(false);
      }
    }

    loadRealAnalytics();

    return () => {
      isCancelled = true;
    };
  }, [selectedAccountId, timeRange, accounts]);

  // Chart data formatting
  const chartData = useMemo(() => {
    if (liveYtData.dailyPoints && liveYtData.dailyPoints.length > 0) {
      return liveYtData.dailyPoints.map(p => {
        const d = new Date(p.day);
        const dateLabel = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        return {
          label: dateLabel,
          views: p.views,
          watchHours: p.watchHours,
          subscribers: p.subscribers
        };
      });
    }

    // Default fallback if no real data
    return [
      { label: '01 Okt', views: 0, watchHours: 0, subscribers: 0 },
      { label: '08 Okt', views: 0, watchHours: 0, subscribers: 0 }
    ];
  }, [liveYtData.dailyPoints]);

  // SVG Chart Calculations
  const currentMetricKey = metricTab;
  const values = chartData.map(d => d[currentMetricKey] || 0);
  const minVal = Math.min(...values) >= 0 ? 0 : Math.min(...values);
  const maxVal = Math.max(...values) > 0 ? Math.max(...values) * 1.15 : 10;
  const chartHeight = 220;
  const chartWidth = 700;

  const pointsString = chartData.map((d, i) => {
    const x = chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2;
    const y = chartHeight - (((d[currentMetricKey] || 0) - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPath = chartData.length > 1
    ? `M 0,${chartHeight} L ${pointsString.split(' ').map(p => `L ${p}`).join(' ')} L ${chartWidth},${chartHeight} Z`.replace('M 0,' + chartHeight + ' L L', 'M 0,' + chartHeight + ' L')
    : `M 0,${chartHeight} Z`;

  const handleStopLive = async (post) => {
    if (!window.confirm("Apakah Anda yakin ingin menghentikan siaran live ini secara paksa?")) return;
    
    setStoppingIds(prev => ({ ...prev, [post.id]: true }));
    try {
      const account = accounts.find(a => a.id === post.accountId);
      let serverUrl = account?.liveServerUrl || "https://irvancharis-live1.hf.space";
      serverUrl = serverUrl.replace(/\/$/, "");
      
      const HF_SECRET = 'SnooplinkSuperSecret123';
      const stopUrl = `${serverUrl}/stop_stream?postId=${post.id}&secret=${HF_SECRET}`;
      
      const res = await fetch(stopUrl, { method: 'POST' });
      const resData = await res.json();
      if (resData.status === 'success' || res.ok) {
        alert("Sinyal penghentian siaran live berhasil dikirim ke server.");
        if (onUpdate) {
          await onUpdate(post.id, { 
            status: 'Failed',
            error_log: 'Siaran dihentikan secara manual oleh pengguna dari Dashboard.'
          });
        }
      } else {
        throw new Error(resData.message || "Gagal menghubungi server live.");
      }
    } catch (err) {
      console.error(err);
      if (window.confirm("Gagal menghubungi server live. Apakah Anda ingin menghentikan paksa status di database Firestore saja?")) {
        if (onUpdate) {
          await onUpdate(post.id, {
            status: 'Failed',
            error_log: 'Siaran dihentikan paksa oleh pengguna di database (Server offline).'
          });
        }
      }
    } finally {
      setStoppingIds(prev => ({ ...prev, [post.id]: false }));
      setSelectedPost(null);
    }
  };

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

  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayPostsCount = posts.filter(p => p.time && p.time.startsWith(todayStr) && p.status !== 'Failed' && p.status !== 'Deleted').length;
  const dailyLimit = user?.dailyPostLimit !== undefined ? user.dailyPostLimit : 5;
  const totalPublished = posts.filter(p => p.status?.toLowerCase() === 'published' || p.status?.toLowerCase() === 'success').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Top Stat Overview Grid */}
      <div className="grid">
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <CheckCircle2 size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: '#10b981' }} />
          <p className="stat-label">Total Published</p>
          <div className="stat-value">{totalPublished}</div>
          <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <span>Postingan berhasil terbit</span>
          </div>
        </div>
        
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Calendar size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: 'var(--primary)' }} />
          <p className="stat-label">Terjadwal</p>
          <div className="stat-value">{posts.filter(p => p.status === 'Scheduled').length}</div>
          <div style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <Zap size={14} />
            <span>Kampanye aktif</span>
          </div>
        </div>

        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Sliders size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: '#f59e0b' }} />
          <p className="stat-label">Kuota Harian</p>
          <div className="stat-value">
            {user?.role === 'admin' || user?.email === 'irvancharis@gmail.com' ? `${todayPostsCount} / Tidak Terbatas` : `${todayPostsCount} / ${dailyLimit}`}
          </div>
          <div style={{ color: '#f59e0b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <span>Jadwal Hari Ini</span>
          </div>
        </div>

        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Eye size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.1, color: '#ff0000' }} />
          <p className="stat-label">YouTube Views (28 Hari)</p>
          <div className="stat-value">{loadingAnalytics ? '...' : (liveYtData.totals.views > 0 ? liveYtData.totals.views.toLocaleString('id-ID') : '0')}</div>
          <div style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            <ArrowUpRight size={14} />
            <span>Data Resmi YouTube API</span>
          </div>
        </div>
      </div>

      {/* Channel Analytics & YouTube Real Data Section */}
      <div className="card" style={{ padding: '2.2rem', background: '#fff', borderRadius: '24px' }}>
        {/* Filter & Metric Headers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.2rem', marginBottom: '1.8rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <TrendingUp size={24} color="#ff0000" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                Perkembangan Channel YouTube (Real API)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {liveYtData.channelInfo ? (
                <span>Channel: <strong>{liveYtData.channelInfo.title}</strong> • Total Subs: <strong>{liveYtData.channelInfo.subscriberCount?.toLocaleString('id-ID')}</strong></span>
              ) : (
                "Data analitik resmi terhubung langsung ke YouTube Analytics API"
              )}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            {/* Account Selector */}
            <select 
              value={selectedAccountId} 
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{ 
                minWidth: '180px', 
                padding: '0.5rem 2rem 0.5rem 0.9rem', 
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: '#f8fafc'
              }}
            >
              {ytAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (YouTube)
                </option>
              ))}
            </select>

            {/* Time Range Selector */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '12px', gap: '0.2rem' }}>
              {[
                { id: '7d', label: '7 Hari' },
                { id: '28d', label: '28 Hari' },
                { id: '90d', label: '90 Hari' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id)}
                  style={{
                    border: 'none',
                    background: timeRange === tab.id ? 'var(--primary)' : 'transparent',
                    color: timeRange === tab.id ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    padding: '0.45rem 0.8rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert / Reconnect Warning */}
        {analyticsError && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '1rem 1.2rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#b45309', fontSize: '0.85rem' }}>
            <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <strong>Izin YouTube Analytics Diperlukan:</strong> Token akses akun Anda belum menyertakan izin pembacaan analytics. Silakan masuk ke menu <strong>Accounts</strong> &gt; klik ikon <strong>Hubungkan Ulang (Refresh)</strong> pada akun YouTube untuk memperbarui izin.
            </div>
          </div>
        )}

        {/* Metric Selector Tabs */}
        <div style={{ display: 'flex', background: '#f8fafc', padding: '0.4rem', borderRadius: '14px', border: '1px solid var(--border-color)', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { id: 'views', label: 'Views (Penayangan)', icon: Eye, count: loadingAnalytics ? '...' : liveYtData.totals.views.toLocaleString('id-ID') },
            { id: 'watchHours', label: 'Watch Time (Jam)', icon: Clock, count: loadingAnalytics ? '...' : `${liveYtData.totals.watchHours} Jam` },
            { id: 'subscribers', label: 'Subscribers (+ / -)', icon: Users, count: loadingAnalytics ? '...' : `${liveYtData.totals.subscribers > 0 ? '+' : ''}${liveYtData.totals.subscribers}` }
          ].map(m => {
            const Icon = m.icon;
            const active = metricTab === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMetricTab(m.id)}
                style={{
                  flex: 1,
                  minWidth: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  border: 'none',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#ff0000' : 'var(--text-muted)',
                  fontWeight: active ? 800 : 600,
                  fontSize: '0.82rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: '0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icon size={16} />
                  <span>{m.label}</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{m.count}</span>
              </button>
            );
          })}
        </div>

        {/* SVG Dynamic Area Chart with Live Data */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ minWidth: '650px', position: 'relative' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '220px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGradientLive" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradientLive" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chartHeight * ratio;
                return (
                  <line 
                    key={idx} 
                    x1="0" 
                    y1={y} 
                    x2={chartWidth} 
                    y2={y} 
                    stroke="#f1f5f9" 
                    strokeDasharray="4 4" 
                    strokeWidth="1.5" 
                  />
                );
              })}

              {/* Area Fill */}
              <path d={areaPath} fill="url(#chartGradientLive)" />

              {/* Glowing Line */}
              <polyline
                fill="none"
                stroke="url(#lineGradientLive)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* Data points */}
              {chartData.map((d, i) => {
                const x = chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2;
                const y = chartHeight - (((d[currentMetricKey] || 0) - minVal) / (maxVal - minVal || 1)) * chartHeight;
                
                // Show labels on key peaks or interval points
                const shouldShowLabel = chartData.length <= 10 || (i % Math.ceil(chartData.length / 8) === 0) || (d[currentMetricKey] === Math.max(...values));

                return (
                  <g key={i} style={{ cursor: 'pointer' }}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#fff"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                    />
                    {shouldShowLabel && (
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        fill="var(--text-main)"
                        fontSize="9.5"
                        fontWeight="700"
                      >
                        {d[currentMetricKey]?.toLocaleString('id-ID')}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', padding: '0 5px' }}>
              {chartData.filter((_, idx) => idx % Math.ceil(chartData.length / 7) === 0 || idx === chartData.length - 1).map((d, i) => (
                <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>Aktivitas Terbaru</h2>
          <button onClick={onViewAll} style={{ fontSize: '0.85rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Lihat Semua</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
                  <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pratinjau</th>
                  <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Platform</th>
                  <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Judul</th>
                  <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Jadwal</th>
                  <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                    <p style={{ fontWeight: 500 }}>Belum ada aktivitas. Postingan Anda akan muncul di sini.</p>
                  </td></tr>
                ) : (
                  posts.slice(0, 5).map(post => (
                    <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)', transition: '0.2s', cursor: 'pointer' }} className="table-row-hover" onClick={() => setSelectedPost(post)}>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', background: isVideo(post) ? '#eef2ff' : '#f0fdf4', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {post.mediaUrl ? (
                            isVideo(post) ? <Video size={20} color="var(--primary)" /> : <FileImage size={20} color="#10b981" />
                          ) : (
                            <ImageIcon size={20} color="#cbd5e1" />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div className={`social-badge social-${post.platform === 'instagram' ? 'ig' : (post.platform === 'tiktok' ? 'tt' : (post.platform === 'youtube' ? 'yt' : 'fb'))}`} style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                           <i className={`fab fa-${post.platform === 'facebook' ? 'facebook-f' : post.platform}`}></i>
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '300px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-main)' }}>
                            {post.postType === 'live'
                              ? (post.ytTitle || post.ytTitleTemplate || 'Tanpa Judul')
                              : (post.ytTitle || post.ytTitleTemplate || (post.content ? (post.content.split('\n')[0].substring(0, 50) + (post.content.length > 50 ? '...' : '')) : 'Tanpa Judul'))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {post.postType === 'live' && (
                              <span style={{ 
                                background: '#fee2e2', 
                                color: '#ef4444', 
                                fontSize: '0.6rem', 
                                padding: '0.05rem 0.3rem', 
                                borderRadius: '4px', 
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.1rem',
                                border: '1px solid #fca5a5'
                              }}>
                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                LIVE
                              </span>
                            )}
                            {post.isAutoLoop && (
                              <span style={{ 
                                background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', 
                                color: '#7c3aed', 
                                fontSize: '0.6rem', 
                                padding: '0.05rem 0.3rem', 
                                borderRadius: '4px', 
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.15rem',
                                border: '1px solid #ddd6fe'
                              }}>
                                <Repeat size={10} />
                                AUTO LOOP
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{post.time}</div>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: post.status === 'Scheduled' ? '#eef2ff' : (post.status === 'Error' ? '#fee2e2' : '#ecfdf5'),
                            color: post.status === 'Scheduled' ? 'var(--primary)' : (post.status === 'Error' ? '#ef4444' : '#10b981'),
                            padding: '0.4rem 1rem',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: `1px solid ${post.status === 'Scheduled' ? '#dbeafe' : (post.status === 'Error' ? '#fecaca' : '#d1fae5')}`
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                            {post.status.toUpperCase()}
                          </div>
                          {post.status === 'Error' && post.error_log && (
                            <div style={{ fontSize: '0.6rem', color: '#ef4444', fontStyle: 'italic', paddingLeft: '0.5rem' }}>
                              {post.error_log}
                            </div>
                          )}
                          {post.ytMetadataWarning && (
                            <div style={{ 
                              fontSize: '0.6rem', 
                              color: '#d97706', 
                              fontStyle: 'italic', 
                              paddingLeft: '0.5rem',
                              maxWidth: '180px',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              marginTop: '0.2rem'
                            }}>
                              ⚠️ {post.ytMetadataWarning}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }} onClick={() => setSelectedPost(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: 0, overflow: 'hidden', background: '#fff', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPost(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <X size={20} />
            </button>

            <div style={{ width: '100%', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', maxHeight: '70vh', padding: '1rem' }}>
              {isDriveUrl(selectedPost?.mediaUrl) ? (
                <div style={{ width: '100%', height: '60vh', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
                   <iframe src={selectedPost.mediaUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
                </div>
              ) : isVideo(selectedPost) ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <video 
                    src={selectedPost.mediaUrl} 
                    controls 
                    autoPlay 
                    style={{ maxWidth: '100%', maxHeight: '60vh' }}
                    onError={() => {
                      console.log("Video playback failed");
                    }}
                  />
                  <div style={{ color: '#fff', fontSize: '0.8rem', opacity: 0.7, textAlign: 'center', marginTop: '0.5rem' }}>
                    Jika video tidak muncul, Google Drive mungkin masih memproses file Anda.
                  </div>
                  {selectedPost.url && (
                    <a 
                      href={selectedPost.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn"
                      style={{ 
                        background: selectedPost.url.includes('localhost') ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)', 
                        color: '#fff', 
                        border: 'none', 
                        fontSize: '0.85rem', 
                        marginTop: '0.5rem', 
                        padding: '0.6rem 1.2rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        textDecoration: 'none'
                      }}
                    >
                      {selectedPost.url.includes('localhost') ? '🚀 Tonton Video Hasil Render' : '📺 Tonton di YouTube'}
                      <ExternalLink size={14} />
                    </a>
                  )}
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

            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {selectedPost.postType === 'live' && <Zap size={16} color="#ef4444" />}
                    {selectedPost.postType === 'live' ? 'Detail Live Stream' : 'Detail Postingan'}
                  </h3>

                  {selectedPost.isAutoLoop && (
                    <div style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                      color: '#7c3aed',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      border: '1px solid #ddd6fe',
                      marginBottom: '1rem'
                    }}>
                      <Repeat size={12} />
                      JADWAL AUTO LOOP (SIARAN BERULANG 24/7)
                    </div>
                  )}

                  {selectedPost.ytTitle && (
                    <div style={{ fontWeight: 750, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                      Judul: {selectedPost.ytTitle}
                    </div>
                  )}
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{selectedPost.content}</p>

                  {selectedPost.platform === 'youtube' && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      {selectedPost.ytTags && (
                        <div style={{ marginBottom: '0.8rem' }}>
                          <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Tags Video:</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {selectedPost.ytTags.split(',').map((tag, i) => (
                              <span key={i} style={{ 
                                background: '#eff6ff', 
                                color: 'var(--primary)', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                border: '1px solid #bfdbfe'
                              }}>
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ marginBottom: '0.8rem' }}>
                        <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.8rem' }}>Altered Content (AI Label):</strong>
                        <span style={{ 
                          fontWeight: 700, 
                          fontSize: '0.8rem',
                          background: (selectedPost.ytAlteredContent === 'no') ? '#f1f5f9' : '#fef3c7',
                          color: (selectedPost.ytAlteredContent === 'no') ? '#475569' : '#d97706',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          display: 'inline-block',
                          border: (selectedPost.ytAlteredContent === 'no') ? '1px solid #cbd5e1' : '1px solid #fde68a'
                        }}>
                          {selectedPost.ytAlteredContent === 'no' ? 'Tidak' : 'Ya - Konten diubah/sintetis (AI)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                  {selectedPost.postType === 'live' && (selectedPost.status === 'LIVE' || selectedPost.status === 'Processing') && (
                    <button 
                      className="btn"
                      onClick={() => handleStopLive(selectedPost)}
                      disabled={stoppingIds[selectedPost.id]}
                      style={{ 
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                        color: '#fff', 
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                        cursor: stoppingIds[selectedPost.id] ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Square size={16} fill="#fff" />
                      <span>{stoppingIds[selectedPost.id] ? 'Menghentikan...' : 'Hentikan Live'}</span>
                    </button>
                  )}
                  {onUseMedia && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        onUseMedia(selectedPost.mediaUrl);
                        setSelectedPost(null);
                      }}
                    >
                      <RefreshCw size={18} />
                      <span>Gunakan Lagi</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .table-row-hover:hover {
          background: #f8fafc;
        }
      `}} />
    </div>
  );
};

export default Dashboard;
