/**
 * YouTube Analytics & Data API Service
 */

const DEFAULT_CLIENT_ID = [
  "687270813688-",
  "8fsdi9hsnjrv8jvna051acs7ofiuk0uo",
  ".apps.googleusercontent.com"
].join("");

const DEFAULT_CLIENT_SECRET = [
  "GOCSPX-",
  "JWzHu1RjPJdsOniJB2q",
  "1QgkSatk3"
].join("");

/**
 * Exchange refresh_token for a fresh access_token
 */
export async function getFreshAccessToken(account) {
  const refreshToken = account.accessToken;
  if (!refreshToken) throw new Error("Tidak ada refresh token untuk akun YouTube ini.");

  const clientId = (account.ytClientId || DEFAULT_CLIENT_ID).trim();
  const clientSecret = (account.ytClientSecret || DEFAULT_CLIENT_SECRET).trim();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data.access_token;
}

/**
 * Fetch channel profile & lifetime statistics (subscriberCount, viewCount, videoCount)
 */
export async function fetchChannelDetails(accessToken) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    const ch = data.items[0];
    return {
      channelId: ch.id,
      title: ch.snippet.title,
      thumbnails: ch.snippet.thumbnails,
      subscriberCount: parseInt(ch.statistics.subscriberCount || '0', 10),
      viewCount: parseInt(ch.statistics.viewCount || '0', 10),
      videoCount: parseInt(ch.statistics.videoCount || '0', 10),
      hiddenSubscriberCount: ch.statistics.hiddenSubscriberCount
    };
  }
  return null;
}

/**
 * Fetch day-by-day real-time analytics report from YouTube Analytics API
 * startDate: YYYY-MM-DD
 * endDate: YYYY-MM-DD
 */
export async function fetchYouTubeDailyAnalytics(accessToken, startDate, endDate) {
  // Coba ambil metrik standar + estimatedRevenue
  const metricsWithRevenue = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares,estimatedRevenue';
  const metricsBasic = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares';
  
  let url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metricsWithRevenue}&dimensions=day&sort=day`;

  let res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  let data = await res.json();
  
  // Jika gagal karena scope atau channel belum monetize (error 403 atau error metrik), fallback ke tanpa revenue
  if (data.error) {
    url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metricsBasic}&dimensions=day&sort=day`;
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    data = await res.json();
  }

  if (data.error) {
    throw new Error(data.error.message || "Gagal mengambil data YouTube Analytics");
  }

  // Parse column headers and rows
  const headers = (data.columnHeaders || []).map(h => h.name);
  const rows = data.rows || [];

  const dayIdx = headers.indexOf('day');
  const viewsIdx = headers.indexOf('views');
  const watchTimeIdx = headers.indexOf('estimatedMinutesWatched');
  const subsGainedIdx = headers.indexOf('subscribersGained');
  const subsLostIdx = headers.indexOf('subscribersLost');
  const likesIdx = headers.indexOf('likes');
  const revenueIdx = headers.indexOf('estimatedRevenue');

  return rows.map(row => {
    const day = row[dayIdx];
    const views = row[viewsIdx] || 0;
    const watchMinutes = row[watchTimeIdx] || 0;
    const watchHours = Number((watchMinutes / 60).toFixed(1));
    const subsNet = (row[subsGainedIdx] || 0) - (row[subsLostIdx] || 0);
    const likes = row[likesIdx] || 0;
    const revenue = revenueIdx !== -1 ? (Number(row[revenueIdx]) || 0) : 0;

    return {
      day,
      views,
      watchMinutes,
      watchHours,
      subscribers: subsNet,
      likes,
      revenue
    };
  });
}

/**
 * Fetch top traffic sources for channel
 */
export async function fetchYouTubeTrafficSources(accessToken, startDate, endDate) {
  try {
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&sort=-views&maxResults=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (!data.rows) return [];

    const headers = (data.columnHeaders || []).map(h => h.name);
    const typeIdx = headers.indexOf('insightTrafficSourceType');
    const viewsIdx = headers.indexOf('views');
    const watchIdx = headers.indexOf('estimatedMinutesWatched');

    const labelMap = {
      YT_SEARCH: 'YouTube Search',
      RELATED_VIDEO: 'Suggested Videos',
      SHORTS: 'Shorts Feed',
      EXT_URL: 'Eksternal / Web',
      SUBSCRIBER: 'Feed Subscription',
      YT_CHANNEL: 'Halaman Channel',
      PLAYLIST: 'Daftar Putar (Playlist)',
      NOTIFICATION: 'Notifikasi YouTube',
      NO_LINK_OTHER: 'Langsung / Tidak Diketahui',
      ADVERTISING: 'Iklan YouTube'
    };

    return data.rows.map(row => ({
      source: row[typeIdx],
      label: labelMap[row[typeIdx]] || row[typeIdx],
      views: row[viewsIdx] || 0,
      watchMinutes: row[watchIdx] || 0
    }));
  } catch (e) {
    console.warn("fetchYouTubeTrafficSources error:", e);
    return [];
  }
}

/**
 * Fetch top performing videos
 */
export async function fetchYouTubeTopVideos(accessToken, startDate, endDate, maxResults = 5) {
  try {
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,likes&dimensions=video&sort=-views&maxResults=${maxResults}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (!data.rows || data.rows.length === 0) return [];

    const headers = (data.columnHeaders || []).map(h => h.name);
    const videoIdx = headers.indexOf('video');
    const viewsIdx = headers.indexOf('views');
    const watchIdx = headers.indexOf('estimatedMinutesWatched');
    const likesIdx = headers.indexOf('likes');

    const videoIds = data.rows.map(r => r[videoIdx]).filter(Boolean);

    // Fetch video titles and thumbnails via YouTube Data API v3
    let snippetMap = {};
    if (videoIds.length > 0) {
      try {
        const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}`;
        const vRes = await fetch(vUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const vData = await vRes.json();
        if (vData.items) {
          vData.items.forEach(item => {
            snippetMap[item.id] = {
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              publishedAt: item.snippet.publishedAt
            };
          });
        }
      } catch (err) {
        console.warn("Error fetching video snippets:", err);
      }
    }

    return data.rows.map(row => {
      const vid = row[videoIdx];
      const info = snippetMap[vid] || {};
      const watchMins = row[watchIdx] || 0;
      return {
        id: vid,
        title: info.title || `Video (${vid})`,
        thumbnail: info.thumbnail || '',
        publishedAt: info.publishedAt || '',
        views: row[viewsIdx] || 0,
        watchHours: Number((watchMins / 60).toFixed(1)),
        likes: row[likesIdx] || 0
      };
    });
  } catch (e) {
    console.warn("fetchYouTubeTopVideos error:", e);
    return [];
  }
}
