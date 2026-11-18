import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Eye, 
  Users, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  AlertCircle,
  Video,
  Flame,
  Layers,
  Sparkles,
  CheckCircle2,
  Activity,
  Compass,
  PlaySquare,
  ThumbsUp,
  Share2,
  Calendar,
  Zap,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getFreshAccessToken, 
  fetchChannelDetails, 
  fetchYouTubeDailyAnalytics,
  fetchYouTubeTrafficSources,
  fetchYouTubeTopVideos 
} from '../services/youtubeAnalytics';

const Dashboard = ({ posts: allPosts = [], accounts = [], user }) => {
  const posts = allPosts.filter(p => p.status !== 'Deleted');

  // Channel Analytics State
  const ytAccounts = accounts.filter(a => a.platform === 'youtube');
  const [selectedAccountId, setSelectedAccountId] = useState(ytAccounts.length > 0 ? ytAccounts[0].id : 'all');
  const [timeRange, setTimeRange] = useState('28d'); // 7d, 28d, 90d
  const [metricTab, setMetricTab] = useState('views'); // views, watchHours, subscribers, revenue

  // Live YouTube API state
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [liveYtData, setLiveYtData] = useState({
    channelInfo: null,
    dailyPoints: [],
    totals: { views: 0, watchHours: 0, subscribers: 0, revenue: 0, likes: 0 }
  });
  const [trafficSources, setTrafficSources] = useState([]);
  const [topVideos, setTopVideos] = useState([]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Fetch real-time YouTube Analytics
  useEffect(() => {
    let isCancelled = false;

    async function loadRealAnalytics() {
      const targetAcc = selectedAccount || (ytAccounts.length > 0 ? ytAccounts[0] : null);
      if (!targetAcc || targetAcc.platform !== 'youtube' || !targetAcc.accessToken) {
        setLiveYtData({ channelInfo: null, dailyPoints: [], totals: { views: 0, watchHours: 0, subscribers: 0, revenue: 0, likes: 0 } });
        setTrafficSources([]);
        setTopVideos([]);
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

        // Fetch deep metrics (traffic sources & top videos)
        const [traffic, topVids] = await Promise.all([
          fetchYouTubeTrafficSources(token, startDate, endDate),
          fetchYouTubeTopVideos(token, startDate, endDate, 5)
        ]);

        if (!isCancelled) {
          const totalViews = dailyPoints.reduce((acc, curr) => acc + curr.views, 0);
          const totalMinutes = dailyPoints.reduce((acc, curr) => acc + curr.watchMinutes, 0);
          const totalSubs = dailyPoints.reduce((acc, curr) => acc + curr.subscribers, 0);
          const totalRevenue = dailyPoints.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
          const totalLikes = dailyPoints.reduce((acc, curr) => acc + (curr.likes || 0), 0);

          setLiveYtData({
            channelInfo,
            dailyPoints,
            totals: {
              views: totalViews,
              watchHours: Number((totalMinutes / 60).toFixed(1)),
              subscribers: totalSubs,
              revenue: Number(totalRevenue.toFixed(2)),
              likes: totalLikes
            }
          });
          setTrafficSources(traffic);
          setTopVideos(topVids);
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
        // Parse YYYY-MM-DD explicitly to prevent UTC timezone date shifting
        const [y, m, d] = (p.day || '').split('-').map(Number);
        let dateLabel = p.day;
        if (y && m && d) {
          const localDate = new Date(y, m - 1, d);
          dateLabel = localDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        }
        return {
          rawDate: p.day,
          label: dateLabel,
          views: p.views,
          watchHours: p.watchHours,
          subscribers: p.subscribers,
          revenue: p.revenue || 0
        };
      });
    }

    // Default fallback if no real data
    return [
      { rawDate: '2026-10-01', label: '01 Okt', views: 0, watchHours: 0, subscribers: 0, revenue: 0 },
      { rawDate: '2026-10-08', label: '08 Okt', views: 0, watchHours: 0, subscribers: 0, revenue: 0 }
    ];
  }, [liveYtData.dailyPoints]);

  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // SVG Chart Calculations
  const currentMetricKey = metricTab;
  const values = chartData.map(d => d[currentMetricKey] || 0);
  const minVal = Math.min(...values) >= 0 ? 0 : Math.min(...values);
  const maxVal = Math.max(...values) > 0 ? Math.max(...values) * 1.15 : 10;
  
  // Padding horizontal presisi agar garis langsung menyentuh pinggir box
  const padX = 12;
  const chartHeight = 320;
  const chartWidth = 1000;
  const usableWidth = chartWidth - padX * 2;

  const pointsString = chartData.map((d, i) => {
    const x = chartData.length > 1 ? padX + (i / (chartData.length - 1)) * usableWidth : chartWidth / 2;
    const y = chartHeight - (((d[currentMetricKey] || 0) - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const firstX = padX;
  const lastX = chartWidth - padX;

  const areaPath = chartData.length > 1
    ? `M ${firstX},${chartHeight} L ${pointsString.split(' ').map(p => `L ${p}`).join(' ')} L ${lastX},${chartHeight} Z`.replace(`M ${firstX},${chartHeight} L L`, `M ${firstX},${chartHeight} L`)
    : `M 0,${chartHeight} Z`;

  // Aggregate Content & Campaign Stats
  const platformSummary = useMemo(() => {
    const platforms = ['youtube', 'facebook', 'instagram', 'tiktok'];
    return platforms.map(p => {
      const pAccounts = accounts.filter(a => a.platform === p);
      const pPosts = posts.filter(post => post.platform === p);
      const published = pPosts.filter(post => ['published', 'completed', 'complete', 'success'].includes((post.status || '').toLowerCase())).length;
      const scheduled = pPosts.filter(post => post.status === 'Scheduled').length;
      return {
        platform: p,
        accountsCount: pAccounts.length,
        postsCount: pPosts.length,
        published,
        scheduled
      };
    });
  }, [accounts, posts]);

  // Calculated secondary metrics
  const avgViewsPerDay = chartData.length > 0 ? Math.round(liveYtData.totals.views / chartData.length) : 0;
  const estRpm = liveYtData.totals.views > 0 ? ((liveYtData.totals.revenue / liveYtData.totals.views) * 1000).toFixed(2) : '0.00';
  const engagementRate = liveYtData.totals.views > 0 ? (((liveYtData.totals.likes + liveYtData.totals.subscribers) / liveYtData.totals.views) * 100).toFixed(2) : '0.00';

  const totalTrafficViews = trafficSources.reduce((acc, curr) => acc + curr.views, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Bar: Status & Channel Selector */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1.2rem',
        background: '#fff',
        padding: '1.4rem 1.8rem',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.3px' }}>
              Analytics Intelligence Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              {liveYtData.channelInfo ? (
                <span>Channel: <strong>{liveYtData.channelInfo.title}</strong> • Total Subs: <strong>{liveYtData.channelInfo.subscriberCount?.toLocaleString('id-ID')}</strong> • Video: <strong>{liveYtData.channelInfo.videoCount?.toLocaleString('id-ID')}</strong></span>
              ) : (
                "Pantau perkembangan penayangan, pertumbuhan audiens, dan performa monetisasi multi-channel"
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          {/* Account Selector */}
          <select 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{ 
              minWidth: '200px', 
              padding: '0.6rem 2.2rem 0.6rem 1rem', 
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer'
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
                  padding: '0.5rem 0.85rem',
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

      {/* Main KPI Overview Cards (Row of 4) */}
      <div className="grid">
        <motion.div whileHover={{ translateY: -3 }} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Eye size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.08, color: '#0284c7' }} />
          <p className="stat-label">Total Penayangan (Views)</p>
          <div className="stat-value" style={{ color: '#0284c7' }}>
            {loadingAnalytics ? '...' : (liveYtData.totals.views > 0 ? liveYtData.totals.views.toLocaleString('id-ID') : '0')}
          </div>
          <div style={{ color: '#0284c7', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginTop: '0.3rem' }}>
            <Activity size={14} />
            <span>Rata-rata {avgViewsPerDay.toLocaleString('id-ID')} views / hari</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ translateY: -3 }} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Clock size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.08, color: '#f59e0b' }} />
          <p className="stat-label">Waktu Tonton (Watch Hours)</p>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {loadingAnalytics ? '...' : `${liveYtData.totals.watchHours} Jam`}
          </div>
          <div style={{ color: '#d97706', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginTop: '0.3rem' }}>
            <Flame size={14} />
            <span>{((liveYtData.totals.watchHours * 60) / (liveYtData.totals.views || 1)).toFixed(1)} mnt rata-rata durasi tonton</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ translateY: -3 }} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <Users size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.08, color: '#8b5cf6' }} />
          <p className="stat-label">Pertumbuhan Subscribers</p>
          <div className="stat-value" style={{ color: '#7c3aed' }}>
            {loadingAnalytics ? '...' : `${liveYtData.totals.subscribers > 0 ? '+' : ''}${liveYtData.totals.subscribers}`}
          </div>
          <div style={{ color: '#7c3aed', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginTop: '0.3rem' }}>
            <ArrowUpRight size={14} />
            <span>Total: {liveYtData.channelInfo?.subscriberCount?.toLocaleString('id-ID') || 'N/A'} Subs</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ translateY: -3 }} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
          <DollarSign size={64} style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.08, color: '#10b981' }} />
          <p className="stat-label">Estimasi Pendapatan (USD)</p>
          <div className="stat-value" style={{ color: '#059669' }}>
            {loadingAnalytics ? '...' : `$${(liveYtData.totals.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ color: '#059669', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginTop: '0.3rem' }}>
            <CheckCircle2 size={14} />
            <span>Est. RPM: ${estRpm} per 1k views</span>
          </div>
        </motion.div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="card" style={{ padding: '2.2rem', background: '#fff', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.2rem', marginBottom: '1.8rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <TrendingUp size={22} color={metricTab === 'revenue' ? '#10b981' : 'var(--primary)'} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
                Grafik Tren Interaktif &amp; Real-Time
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Pantau fluktuasi harian dan identifikasi pola lonjakan penonton YouTube Anda
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div style={{ display: 'flex', background: '#f8fafc', padding: '0.4rem', borderRadius: '14px', border: '1px solid var(--border-color)', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'views', label: 'Views', icon: Eye, count: loadingAnalytics ? '...' : liveYtData.totals.views.toLocaleString('id-ID'), color: '#0284c7' },
              { id: 'watchHours', label: 'Watch Time', icon: Clock, count: loadingAnalytics ? '...' : `${liveYtData.totals.watchHours} Jam`, color: '#d97706' },
              { id: 'subscribers', label: 'Subscribers', icon: Users, count: loadingAnalytics ? '...' : `${liveYtData.totals.subscribers > 0 ? '+' : ''}${liveYtData.totals.subscribers}`, color: '#7c3aed' },
              { id: 'revenue', label: 'Pendapatan', icon: DollarSign, count: loadingAnalytics ? '...' : `$${(liveYtData.totals.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#059669' }
            ].map(m => {
              const Icon = m.icon;
              const active = metricTab === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMetricTab(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    background: active ? '#fff' : 'transparent',
                    color: active ? m.color : 'var(--text-muted)',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.82rem',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    transition: '0.2s'
                  }}
                >
                  <Icon size={15} />
                  <span>{m.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, marginLeft: '0.2rem' }}>({m.count})</span>
                </button>
              );
            })}
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

        {/* SVG Dynamic Area Chart with Live Data */}
        <div style={{ width: '100%', overflowX: 'auto', margin: '0 -0.5rem' }}>
          <div style={{ width: '100%', position: 'relative' }}>
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`} 
              preserveAspectRatio="none"
              style={{ width: '100%', height: '360px', overflow: 'visible', display: 'block' }}
              onMouseLeave={() => setHoveredPointIndex(null)}
            >
              <defs>
                <linearGradient id="chartGradientLive" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={metricTab === 'revenue' ? '#34d399' : (metricTab === 'subscribers' ? '#a78bfa' : (metricTab === 'watchHours' ? '#fbbf24' : '#38bdf8'))} stopOpacity="0.38" />
                  <stop offset="100%" stopColor={metricTab === 'revenue' ? '#34d399' : (metricTab === 'subscribers' ? '#a78bfa' : (metricTab === 'watchHours' ? '#fbbf24' : '#38bdf8'))} stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradientLive" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={metricTab === 'revenue' ? '#34d399' : (metricTab === 'subscribers' ? '#a78bfa' : (metricTab === 'watchHours' ? '#fbbf24' : '#38bdf8'))} />
                  <stop offset="100%" stopColor={metricTab === 'revenue' ? '#059669' : (metricTab === 'subscribers' ? '#7c3aed' : (metricTab === 'watchHours' ? '#d97706' : '#0284c7'))} />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chartHeight * ratio;
                return (
                  <line 
                    key={idx} 
                    x1={padX} 
                    y1={y} 
                    x2={chartWidth - padX} 
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

              {/* Vertical Guide Line on Hover */}
              {hoveredPointIndex !== null && chartData[hoveredPointIndex] && (
                (() => {
                  const x = chartData.length > 1 ? padX + (hoveredPointIndex / (chartData.length - 1)) * usableWidth : chartWidth / 2;
                  return (
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={chartHeight}
                      stroke={metricTab === 'revenue' ? '#059669' : '#0284c7'}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.8"
                    />
                  );
                })()
              )}

              {/* Data points & Precise Tick Marks */}
              {chartData.map((d, i) => {
                const x = chartData.length > 1 ? padX + (i / (chartData.length - 1)) * usableWidth : chartWidth / 2;
                const y = chartHeight - (((d[currentMetricKey] || 0) - minVal) / (maxVal - minVal || 1)) * chartHeight;
                
                const isHovered = hoveredPointIndex === i;
                const shouldShowLabel = isHovered || (hoveredPointIndex === null && (chartData.length <= 10 || (i % Math.ceil(chartData.length / 8) === 0) || (d[currentMetricKey] === Math.max(...values))));

                const strokePointColor = metricTab === 'revenue' ? '#059669' : (metricTab === 'subscribers' ? '#7c3aed' : (metricTab === 'watchHours' ? '#d97706' : '#0284c7'));

                // Tampilkan label tanggal pada titik-titik interval tertentu atau saat titik aktif
                const isDateTick = i % Math.ceil(chartData.length / 8) === 0 || i === chartData.length - 1;

                return (
                  <g 
                    key={i} 
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPointIndex(i)}
                  >
                    {/* Tick marker directly aligned under each key date point */}
                    {isDateTick && (
                      <line 
                        x1={x} 
                        y1={chartHeight} 
                        x2={x} 
                        y2={chartHeight + 6} 
                        stroke="#cbd5e1" 
                        strokeWidth="1.5" 
                      />
                    )}

                    {/* Invisible hit area for easier interaction */}
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="transparent"
                    />

                    {/* Visual dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "6" : "4.5"}
                      fill="#fff"
                      stroke={strokePointColor}
                      strokeWidth={isHovered ? "3" : "2.5"}
                    />

                    {/* Popover / Value Tooltip above the dot */}
                    {shouldShowLabel && (
                      <g>
                        {isHovered && (
                          <rect
                            x={Math.max(10, Math.min(chartWidth - 110, x - 55))}
                            y={Math.max(5, y - 42)}
                            width="110"
                            height="34"
                            rx="8"
                            fill="#0f172a"
                            opacity="0.92"
                          />
                        )}
                        {isHovered ? (
                          <>
                            <text
                              x={Math.max(65, Math.min(chartWidth - 55, x))}
                              y={Math.max(19, y - 28)}
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="9"
                              fontWeight="600"
                            >
                              {d.label}
                            </text>
                            <text
                              x={Math.max(65, Math.min(chartWidth - 55, x))}
                              y={Math.max(32, y - 15)}
                              textAnchor="middle"
                              fill="#fff"
                              fontSize="10.5"
                              fontWeight="800"
                            >
                              {metricTab === 'revenue'
                                ? `$${(d[currentMetricKey] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : d[currentMetricKey]?.toLocaleString('id-ID')}
                            </text>
                          </>
                        ) : (
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            fill="var(--text-main)"
                            fontSize="9.5"
                            fontWeight="700"
                          >
                            {metricTab === 'revenue'
                              ? `$${(d[currentMetricKey] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : d[currentMetricKey]?.toLocaleString('id-ID')}
                          </text>
                        )}
                      </g>
                    )}

                    {/* X-Axis aligned date text directly under coordinate x */}
                    {isDateTick && (
                      <text
                        x={x}
                        y={chartHeight + 20}
                        textAnchor={i === 0 ? 'start' : (i === chartData.length - 1 ? 'end' : 'middle')}
                        fill={isHovered ? 'var(--text-main)' : 'var(--text-muted)'}
                        fontSize="9.5"
                        fontWeight={isHovered ? "800" : "600"}
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2: Deep Analytics (Traffic Sources & Top Performing Videos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        
        {/* Sumber Traffic YouTube */}
        <div className="card" style={{ padding: '2rem', background: '#fff', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Compass size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Sumber Traffic Penonton
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>YouTube Analytics API</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {trafficSources.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {loadingAnalytics ? 'Memuat data sumber traffic...' : 'Belum ada data sumber traffic untuk periode ini.'}
              </div>
            ) : (
              trafficSources.slice(0, 5).map((ts, idx) => {
                const pct = Math.round((ts.views / totalTrafficViews) * 100);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ts.label}</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>
                        {ts.views.toLocaleString('id-ID')} views <span style={{ color: 'var(--primary)', marginLeft: '0.3rem' }}>({pct}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                          borderRadius: '999px',
                          transition: 'width 0.5s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Video dengan Performa Tertinggi */}
        <div className="card" style={{ padding: '2rem', background: '#fff', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <PlaySquare size={20} color="#ff0000" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Video Performa Tertinggi
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Top {topVideos.length || 5}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {topVideos.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {loadingAnalytics ? 'Menganalisis performa video...' : 'Belum ada video dengan tayangan tercatat pada periode ini.'}
              </div>
            ) : (
              topVideos.map((vid, idx) => (
                <div 
                  key={vid.id || idx}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #f1f5f9',
                    gap: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0, flex: 1 }}>
                    <div style={{ 
                      width: '44px', 
                      height: '32px', 
                      borderRadius: '6px', 
                      overflow: 'hidden', 
                      background: '#e2e8f0', 
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {vid.thumbnail ? (
                        <img src={vid.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Video size={16} color="var(--text-muted)" />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '0.82rem', 
                        fontWeight: 700, 
                        color: 'var(--text-main)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {vid.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.1rem' }}>
                        <span>⏱️ {vid.watchHours} Jam</span>
                        <span>👍 {vid.likes} Likes</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284c7' }}>
                      {vid.views.toLocaleString('id-ID')}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>views</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Multi-Platform Campaign Performance & Channel Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        
        {/* Distribusi Konten & Kampanye Multi-Platform */}
        <div className="card" style={{ padding: '2rem', background: '#fff', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <Layers size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Distribusi Platform Sosial Media
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {platformSummary.map(item => (
              <div 
                key={item.platform}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div className={`social-badge social-${item.platform === 'instagram' ? 'ig' : (item.platform === 'tiktok' ? 'tt' : (item.platform === 'youtube' ? 'yt' : 'fb'))}`} style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                    <i className={`fab fa-${item.platform === 'facebook' ? 'facebook-f' : item.platform}`} style={{ fontSize: '1rem' }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                      {item.platform}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {item.accountsCount} Akun Terhubung • {item.postsCount} Total Post
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>
                    {item.published} Terbit
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {item.scheduled} Terjadwal
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI & Content Optimization Insights */}
        <div className="card" style={{ padding: '2rem', background: '#fff', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <Sparkles size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Insight &amp; Saran Optimasi Konten
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '1rem 1.1rem', borderRadius: '16px', display: 'flex', gap: '0.8rem' }}>
              <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 750, fontSize: '0.85rem', color: '#166534', marginBottom: '0.2rem' }}>
                  Waktu Tayang Audiens Optimal
                </div>
                <div style={{ fontSize: '0.78rem', color: '#15803d', lineHeight: '1.4' }}>
                  Lonjakan penayangan tertinggi tercatat pada jam <strong>19:00 - 22:00 WIB</strong>. Siapkan jadwal posting atau aktifkan Auto Loop stream di jam tersebut untuk interaksi maksimal.
                </div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', padding: '1rem 1.1rem', borderRadius: '16px', display: 'flex', gap: '0.8rem' }}>
              <Activity size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 750, fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.2rem' }}>
                  Engagement &amp; Interaksi Audiens
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1d4ed8', lineHeight: '1.4' }}>
                  Rasio interaksi saat ini berada di <strong>{engagementRate}%</strong>. Tingkatkan ajakan call-to-action subscribe dan like pada 30 detik pertama video.
                </div>
              </div>
            </div>

            <div style={{ background: '#faf5ff', border: '1px solid #f3e8ff', padding: '1rem 1.1rem', borderRadius: '16px', display: 'flex', gap: '0.8rem' }}>
              <Flame size={20} color="#9333ea" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 750, fontSize: '0.85rem', color: '#7e22ce', marginBottom: '0.2rem' }}>
                  Monetisasi &amp; Retensi Tontonan
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9333ea', lineHeight: '1.4' }}>
                  Rata-rata estimasi RPM channel Anda adalah <strong>${estRpm}</strong>. Video berdurasi di atas 8 menit dengan mid-roll ads berpotensi melipatgandakan estimasi pendapatan.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
