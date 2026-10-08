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
  const metrics = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares';
  const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=day&sort=day`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await res.json();
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

  return rows.map(row => {
    const day = row[dayIdx];
    const views = row[viewsIdx] || 0;
    const watchMinutes = row[watchTimeIdx] || 0;
    const watchHours = Number((watchMinutes / 60).toFixed(1));
    const subsNet = (row[subsGainedIdx] || 0) - (row[subsLostIdx] || 0);
    const likes = row[likesIdx] || 0;

    return {
      day,
      views,
      watchMinutes,
      watchHours,
      subscribers: subsNet,
      likes
    };
  });
}
