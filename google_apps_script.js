// ==========================================
// KONFIGURASI FIREBASE
// ==========================================
const FB_CONFIG = {
  project_id: "snooplink-pro",
  client_email: "firebase-adminsdk-fbsvc@snooplink-pro.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCc3lhy/Whj7R4m\nezjTVD7RlD8fX+uTSAKk6T17HZfeH1WCXOaAhAPYy+gL3ewKl5wFR7y/NXgBIjMQ\nmztrSCkGlhrgLpQDfLRXJzz9tZfx+qzRkhJ6TW9mRPmoZztZ5hh9dEejC/4hIJpT\ngdAYhMmaz+QQX3CfMBCw7aQnhfGCcvQLtVyiS27fdnJKGCkcfDUdLxTrDdAe2+dw\nPeFwYdQeXNk/P5ZryDh1/AKHeirIV+VdvSLo0VGGB9nGcxVZY8daWU9pXC5dgrwc\nW6udZ6R2v0hg7yAt7o+EUUBBVfsTiCAkkesxLCzDJQLZzXcvah0nyOz0O1sdOS3O\nEvlT5u5TAgMBAAECggEAAMLbbwNnxERcRxeF+RCJlX7Ap6hRfk91I9O15qkIGZ3R\nTmag/7KkSiMDJzuWb564tRXaBpt9z5OY59W4/hZFjLChxMC1Gyc5wMqB80E0UYpD\n2Gh7Cnjht39SLs0Bbrg9Gi68QkBGpWaBGTKiDdxnFgc4NhQgecVD73fXuhFeUKG4\nNzn2XxrZ6CBUVc5rfqh5ubHU8Rnh60hIhdkAKeRYebNsds0iktq1GpSdPI/6gz/9\nNDJ0FE2NaMLhhbx6nuJsSuVfEFxfoLrkcd4V0ZAQWCKqKYLzwYbS81+60Tv4Sb2M\nBx8u8iqBTxNFOPJ/19mC0Heud/p6qO+zVHkqXBEnUQKBgQDQBNw7JYQSl3HoU59b\nF1JLhO+eQR/3AarX471cpkHBbJfYd6MDzGCR8kt5cc4cAjcUHSoTxnoC3AIRL1/l\nymV8VuOwC15jJ3mc3lavop7yitSopWDKM8pfeIGFKzC9JSlI8DL4VaDmtwT+nUXW\no0cuPZtsn+vZAU3/s/CTtwBJNwKBgQDBDSUgoNNtNIHAmHr6O+4IDIdnbBVHRUfC\nKQ/OIkTPCMtPfd8WqAiwv30pJMtkunQs4D8dBAvdtQ83MAegxoFe4eswfQkSxoXC\n22ECtAksIDx/Y7ctVw7fYjUCw2YHbBaTCyTujRfFlIOZzAygRDQcA4ohnAAZ7O/L\nv5JuR/WhxQKBgQCDXx5q6CWBzE0uyWjxkUfy07C0xDJYv5/Smkxj78fFTTyUg/Ha\nmz89zMRnnTzqqWd5d3W0aXtyxNk1WzL4H5t6LDG9Y2CnxC1kqXIbl9tEF/N30oHP\nEWg0ZRl/LaipO4fYPYIjHYjxTBKGbnLFu/ZfOJ8oudKsCMvmuhAsab1vfwJ/VfeE\nkQMNI5Q+M4WzPbtyRCNQKL34u8QeMFgYsbKQ8aD46G0k6vHo7MxY7/lymWhuU42I\njWM/5Xq7S9gXjYDYG2h/Uxha8gF1j1Ah4xJJA11Xk2LUL1yVQuR4tsJMrQF1DAXq\nbFBoRZPdBp/W/4dfrRnmaREO+nyITDMDAhkJSQKBgAx9mGdh79rop3ky0G9sTL3U\nKZ7SU7DzfsiEzRCFac1zYOu/KMpGgv2e+7PxYCTskq4Ikk3gxG7gp5umT1XoS0WH\neyx0UR1V0l20w9pscvRfhIvXUvTGXSt6GXYzxjnV0RCeyj5gAJUSQ+6QcoWr1Jvj\nq2UHbhevUc5wUNvO7Se+\n-----END PRIVATE KEY-----\n"
};

// ==========================================
// KONFIGURASI YOUTUBE OAUTH (REFRESH TOKEN)
// ==========================================
const YT_CONFIG = {
  client_id: "687270813688-8fsdi9hsnjrv8jvna051acs7ofiuk0uo.apps.googleusercontent.com",
  client_secret: "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"
};

function getFreshYouTubeToken(refreshToken) {
  const url = "https://oauth2.googleapis.com/token";
  const payload = {
    client_id: YT_CONFIG.client_id,
    client_secret: YT_CONFIG.client_secret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  };

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    payload: payload,
    muteHttpExceptions: true
  });

  const data = JSON.parse(res.getContentText());
  if (data.error) throw new Error("Gagal refresh token YouTube: " + (data.error_description || data.error));

  return data.access_token;
}

// ==========================================
// 1. FUNGSI UTAMA PEKERJA (Jalankan via Trigger Waktu)
// ==========================================
function autoCheckAndPost() {
  // Lock digunakan agar pencarian jadwal tidak bertabrakan
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(1000);
  } catch (e) {
    console.log("Pengecekan jadwal sebelumnya sedang berjalan. Pengecekan menit ini dilewati.");
    return;
  }

  var requests = [];
  try {
    const now = new Date();
    // format now ke GMT+7 untuk day of week dan time
    const gmt7DateString = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
    const gmt7TimeString = Utilities.formatDate(now, "GMT+7", "HH:mm");
    const gmt7DayString = Utilities.formatDate(now, "GMT+7", "EEEE"); // e.g. "Wednesday"
    const currentMinuteString = gmt7DateString + " " + gmt7TimeString; // e.g. "2026-05-20 15:30"

    console.log("Pengecekan jadwal GMT+7: " + currentMinuteString + " (" + gmt7DayString + ")");

    const posts = getFirestoreData("posts");

    // BACA URL SECARA DINAMIS DARI FIRESTORE
    var webAppUrl = getWebAppUrlFromFirestore();
    if (!webAppUrl) {
      webAppUrl = "https://script.google.com/macros/s/AKfycbwdxnTBbLtzqglMPRAx_whpyZt4_zmZNA77TsWI6AmJEociu0h_QhsSCTXinDua8HJleg/exec";
    }

    posts.forEach(post => {
      const postId = post.name.split('/').pop();
      const status = post.fields.status?.stringValue;
      const isRecurring = post.fields.isRecurring?.booleanValue || false;
      const userId = post.fields.userId?.stringValue || "";

      if (status === "Scheduled") {
        if (isRecurring) {
          // RECURRING POST CHECK
          const daysOfWeekValues = [];
          if (post.fields.daysOfWeek?.arrayValue?.values) {
            post.fields.daysOfWeek.arrayValue.values.forEach(v => {
              if (v.stringValue) daysOfWeekValues.push(v.stringValue);
            });
          }
          const scheduledTime = post.fields.scheduledTime?.stringValue || "";
          const lastExecuted = post.fields.lastExecutedMinute?.stringValue || "";

          // Check if day matches, time matches, and not executed in this minute yet
          if (daysOfWeekValues.indexOf(gmt7DayString) !== -1 && scheduledTime === gmt7TimeString) {
            if (lastExecuted !== currentMinuteString) {
              console.log("Memicu jadwal berulang (recurring) untuk ID: " + postId);

              // 1. Catat execution minute agar tidak dobel trigger
              updateFirestoreLastExecuted(postId, currentMinuteString);

              // 2. Buat dokumen copy execution post
              var execFields = JSON.parse(JSON.stringify(post.fields));
              
              // Modifikasi field untuk execution copy
              execFields.isRecurring = { booleanValue: false };
              execFields.status = { stringValue: "Processing" };
              execFields.time = { stringValue: currentMinuteString };

              // Clear resolved values if random mode is active to force re-evaluation in executePost
              if (execFields.randomVideo?.booleanValue) {
                delete execFields.mediaUrl;
                delete execFields.mediaType;
                delete execFields.fileName;
                delete execFields.fileSize;
              }
              if (execFields.randomMusic?.booleanValue) {
                delete execFields.backsoundUrls;
              }
              if (execFields.randomThumbnail?.booleanValue) {
                delete execFields.ytThumbnail;
              }

              // Buat dokumen post baru
              try {
                const execPostId = createFirestoreDocument("posts", { fields: execFields });
                console.log("Berhasil membuat execution post copy: " + execPostId);

                // Tambahkan ke requests paralel
                requests.push({
                  url: webAppUrl + "?action=executePostSingle&postId=" + execPostId,
                  method: "post",
                  muteHttpExceptions: true
                });
              } catch (createErr) {
                console.error("Gagal membuat execution copy untuk recurring post: " + createErr.message);
              }
            }
          }
        } else {
          // REGULAR POST CHECK
          const scheduledTimeVal = post.fields.time?.stringValue;
          if (scheduledTimeVal) {
            const scheduledTime = new Date(scheduledTimeVal);
            if (now >= scheduledTime) {
              console.log("Menjadwalkan eksekusi paralel untuk ID: " + postId);

              // 1. Ubah status segera ke "Processing"
              updateFirestoreStatus(postId, "Processing");

              // 2. Siapkan request panggilan paralel (random media & spintax will be resolved inside executePost)

              // 3. Siapkan request panggilan paralel
              requests.push({
                url: webAppUrl + "?action=executePostSingle&postId=" + postId,
                method: "post",
                muteHttpExceptions: true
              });
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("Gagal memeriksa jadwal paralel: " + err.message);
  } finally {
    // Kunci dilepas secepatnya
    lock.releaseLock();
  }

  // Jalankan request postingan secara paralel
  if (requests.length > 0) {
    console.log("Menjalankan " + requests.length + " postingan secara bersamaan (paralel)...");
    try {
      var responses = UrlFetchApp.fetchAll(requests);
      responses.forEach((res, index) => {
        console.log("Hasil respon paralel [" + index + "]: " + res.getContentText());
      });
    } catch (fetchErr) {
      console.error("Gagal melakukan fetchAll paralel: " + fetchErr.message);
    }
  }
}

// ==========================================
// FIREBASE RECURRING & RANDOM MEDIA HELPERS
// ==========================================
function updateFirestoreLastExecuted(docId, minuteString) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/posts/${docId}?updateMask.fieldPaths=lastExecutedMinute`;
  
  const payload = {
    fields: {
      lastExecutedMinute: { stringValue: minuteString }
    }
  };
  
  UrlFetchApp.fetch(url, {
    method: "patch", contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function createFirestoreDocument(collection, data) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/${collection}`;
  
  const res = UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  });
  
  const resData = JSON.parse(res.getContentText());
  if (resData.error) {
    throw new Error("Gagal membuat dokumen Firestore: " + resData.error.message);
  }
  return resData.name.split('/').pop();
}

function updateFirestoreFields(docId, updates, fieldPaths) {
  const token = getAccessToken();
  let queryParams = fieldPaths.map(p => "updateMask.fieldPaths=" + p).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/posts/${docId}?${queryParams}`;
  
  const payload = {
    fields: updates
  };
  
  UrlFetchApp.fetch(url, {
    method: "patch", contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function resolveRandomMedia(userId, category, count) {
  try {
    const allMedia = getFirestoreData("media");
    const filtered = allMedia.filter(m => {
      return m.fields?.userId?.stringValue === userId && 
             m.fields?.category?.stringValue === category;
    });

    if (filtered.length === 0) {
      console.log("resolveRandomMedia: Tidak ditemukan media untuk userId=" + userId + ", category=" + category);
      return [];
    }

    // Shuffle
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    return selected.map(item => ({
      mediaUrl: item.fields?.mediaUrl?.stringValue || "",
      mediaType: item.fields?.mediaType?.stringValue || "",
      fileName: item.fields?.fileName?.stringValue || "",
      fileSize: parseInt(item.fields?.fileSize?.integerValue || item.fields?.fileSize?.doubleValue || 0, 10)
    }));
  } catch (err) {
    console.error("Error resolveRandomMedia: " + err.message);
    return [];
  }
}





// =========================================================================
// KONSTANTA KEAMANAN TRIGGER HUGGING FACE
// =========================================================================
const HF_SECRET = "SnooplinkSuperSecret123"; // HARUS SAMA DENGAN DI SECRETS HUGGING FACE
const HF_SPACE_URL = "https://irvancharis-live1.hf.space/start_stream";

// =========================================================================
// MODIFIKASI FUNGSI UTAMA EXECUTEPOST (INTEGRASI LIVE & POSTING BIASA)
// =========================================================================
function executePost(post, postId) {
  console.log("=== MEMULAI EKSEKUSI POST ===");
  console.log("ID Postingan: " + postId);

  // 1. RESOLVE RANDOM MEDIA, THUMBNAILS, & SPINTAX
  const userId = post.fields.userId?.stringValue || "";
  const isRandomVideo = post.fields.randomVideo?.booleanValue || false;
  const isRandomMusic = post.fields.randomMusic?.booleanValue || false;
  const isRandomThumbnail = post.fields.randomThumbnail?.booleanValue || false;

  var updates = {};
  var fieldPaths = [];

  // Random Video
  if (isRandomVideo) {
    var randomVideos = resolveRandomMedia(userId, "video", 1);
    if (randomVideos.length > 0) {
      updates.mediaUrl = { stringValue: randomVideos[0].mediaUrl };
      updates.mediaType = { stringValue: randomVideos[0].mediaType };
      updates.fileName = { stringValue: randomVideos[0].fileName };
      updates.fileSize = { integerValue: randomVideos[0].fileSize.toString() };
      fieldPaths.push("mediaUrl", "mediaType", "fileName", "fileSize");
      
      // Update local post.fields object
      post.fields.mediaUrl = updates.mediaUrl;
      post.fields.mediaType = updates.mediaType;
      post.fields.fileName = updates.fileName;
      post.fields.fileSize = updates.fileSize;
    }
  }

  // Random Music
  if (isRandomMusic) {
    var randomCount = parseInt(post.fields.randomMusicCount?.integerValue || 1, 10);
    var randomAudios = resolveRandomMedia(userId, "musik", randomCount);
    var urls = randomAudios.map(a => a.mediaUrl);
    updates.backsoundUrls = { arrayValue: { values: urls.map(u => ({ stringValue: u })) } };
    fieldPaths.push("backsoundUrls");

    // Update local post.fields object
    post.fields.backsoundUrls = updates.backsoundUrls;
  }

  // Random Thumbnail
  if (isRandomThumbnail) {
    var randomThumbs = resolveRandomMedia(userId, "gambar", 1);
    if (randomThumbs.length > 0) {
      updates.ytThumbnail = { stringValue: randomThumbs[0].mediaUrl };
      fieldPaths.push("ytThumbnail");

      // Update local post.fields object
      post.fields.ytThumbnail = updates.ytThumbnail;
    }
  }

  // Spintax for YouTube Title
  const titleTemplate = post.fields.ytTitleTemplate?.stringValue || post.fields.ytTitle?.stringValue || "";
  if (titleTemplate) {
    const spunTitle = parseSpintax(titleTemplate);
    updates.ytTitle = { stringValue: spunTitle };
    updates.ytTitleTemplate = { stringValue: titleTemplate };
    fieldPaths.push("ytTitle", "ytTitleTemplate");

    // Update local post.fields object
    post.fields.ytTitle = updates.ytTitle;
    post.fields.ytTitleTemplate = updates.ytTitleTemplate;
  }

  // Spintax for Content / Description
  const contentTemplate = post.fields.contentTemplate?.stringValue || post.fields.content?.stringValue || "";
  if (contentTemplate) {
    const spunContent = parseSpintax(contentTemplate);
    updates.content = { stringValue: spunContent };
    updates.contentTemplate = { stringValue: contentTemplate };
    fieldPaths.push("content", "contentTemplate");

    // Update local post.fields object
    post.fields.content = updates.content;
    post.fields.contentTemplate = updates.contentTemplate;
  }

  // Spintax for YouTube Tags
  const tagsTemplate = post.fields.ytTagsTemplate?.stringValue || post.fields.ytTags?.stringValue || "";
  if (tagsTemplate) {
    const spunTags = parseSpintax(tagsTemplate);
    updates.ytTags = { stringValue: spunTags };
    updates.ytTagsTemplate = { stringValue: tagsTemplate };
    fieldPaths.push("ytTags", "ytTagsTemplate");

    // Update local post.fields object
    post.fields.ytTags = updates.ytTags;
    post.fields.ytTagsTemplate = updates.ytTagsTemplate;
  }

  // Commit updates to Firestore immediately
  if (fieldPaths.length > 0) {
    try {
      updateFirestoreFields(postId, updates, fieldPaths);
      console.log("Berhasil memperbarui field yang di-resolve/spun di Firestore untuk ID: " + postId);
    } catch (dbErr) {
      console.error("Gagal menyimpan update resolve/spun ke Firestore: " + dbErr.message);
    }
  }

  const platform = post.fields.platform?.stringValue;
  let content = post.fields.content?.stringValue || "";
  const mediaUrl = post.fields.mediaUrl?.stringValue;
  const accountId = post.fields.accountId?.stringValue;
  const linkUrl = post.fields.linkUrl?.stringValue; // AMBIL DATA LINK DARI FIRESTORE
  const postType = post.fields.postType?.stringValue || "post";
  const tierLocation = post.fields.tierLocation?.stringValue || "none";

  console.log("Tipe Postingan: " + postType);
  console.log("Platform: " + platform);
  console.log("Tier Target Audience: " + tierLocation);

  try {
    // ----------------------------------------------------
    // PROSES TRANSLASI OTOMATIS BERDASARKAN TIER TARGET AUDIENS
    // ----------------------------------------------------
    let ytTitle = post.fields.ytTitle?.stringValue || "Snooplink Live Stream";
    let originalYtTitle = ytTitle;
    let originalContent = content;

    if (tierLocation !== "none" && tierLocation !== "") {
      let targetLang = "en";
      if (tierLocation === "tier1") targetLang = "en";
      else if (tierLocation === "tier2_es") targetLang = "es";
      else if (tierLocation === "tier2_pt") targetLang = "pt";
      else if (tierLocation === "tier3_vn") targetLang = "vi";
      else if (tierLocation === "tier3_th") targetLang = "th";
      else if (tierLocation === "tier3_ph") targetLang = "tl";

      console.log("Target Audience Tier: " + tierLocation + " -> Translate to: " + targetLang);
      try {
        // Untuk Live Stream di YouTube, kita menggunakan API localizations resmi (tetap simpan judul asli di db).
        // Untuk postingan biasa (Facebook, Instagram, dan Video YouTube non-live), kita translate in-place.
        if (postType !== "live" || platform !== "youtube") {
          if (ytTitle) {
            ytTitle = LanguageApp.translate(ytTitle, '', targetLang);
            if (!post.fields.ytTitle) post.fields.ytTitle = {};
            post.fields.ytTitle.stringValue = ytTitle;
            console.log("Translated Title: " + ytTitle);
          }
          if (content) {
            content = LanguageApp.translate(content, '', targetLang);
            if (!post.fields.content) post.fields.content = {};
            post.fields.content.stringValue = content;
            console.log("Translated Content: " + content);
          }
        }
      } catch (transError) {
        console.error("Gagal melakukan translasi otomatis: " + transError.message);
      }
    }

    const account = getFirestoreDocument("social_accounts", accountId);
    const token = account.fields.accessToken?.stringValue;
    const pageId = account.fields.pageId?.stringValue;

    if (!token || !pageId) throw new Error("Kredensial (Token/ID) tidak lengkap.");

    let result;

    if (postType === "live") {
      // ----------------------------------------------------
      // JALUR 1: SISTEM LIVE STREAMING (SISTEM BARU)
      // ----------------------------------------------------
      let streamKey = post.fields.streamKey?.stringValue || "";
      const streamKeyMode = post.fields.streamKeyMode?.stringValue || "manual";
      const liveDuration = post.fields.liveDuration?.stringValue || "24/7";
      const ytPrivacy = post.fields.ytPrivacy?.stringValue || "public";

      let freshToken = token;
      if (platform === "youtube") {
        freshToken = getFreshYouTubeToken(token);
        if (streamKeyMode === "auto") {
          console.log("YouTube Stream Key Mode = AUTO. Membuat Live Broadcast...");
          // Kirim parameter tambahan (originalContent dan tierLocation) untuk penanganan terjemahan
          var ytLiveInfo = createYouTubeLive(originalYtTitle, ytPrivacy, freshToken, originalContent, tierLocation);
          streamKey = ytLiveInfo.streamKey;

           // Simpan streamKey dan ytBroadcastId buatan API ke dokumen Firestore agar dibaca oleh Hugging Face
           updateFirestoreStreamKeyAndBroadcastId(postId, streamKey, ytLiveInfo ? ytLiveInfo.broadcastId : null);

           // Aktifkan redirect di parent post jika ada
           var parentPostId = post.fields?.parentPostId?.stringValue;
           if (parentPostId && ytLiveInfo && ytLiveInfo.broadcastId) {
             console.log("Memicu updateParentRedirect dari parent " + parentPostId + " ke Live 2: " + ytLiveInfo.broadcastId);
             try {
               updateParentRedirect(parentPostId, postId, ytLiveInfo.broadcastId);
             } catch (redirectErr) {
               console.log("Gagal mengaktifkan redirect di parent: " + redirectErr.message);
             }
           }
        }
      }

      if (!streamKey) {
        throw new Error("Stream Key kosong atau tidak ditemukan.");
      }

      // 1. Dapatkan daftar node streaming milik user dari Firestore untuk penyeimbangan beban otomatis
      const userId = post.fields.userId?.stringValue;
      console.log("Mencari server streaming untuk user ID: " + userId);
      
      let selectedSpaceUrl = null;
      let allNodes = [];
      try {
        allNodes = getFirestoreData("streaming_nodes");
      } catch (e) {
        console.log("Gagal membaca koleksi streaming_nodes: " + e.message);
      }

      // Filter node berdasarkan userId pembuat postingan
      const userNodes = allNodes.filter(function(node) {
        return node.fields && node.fields.userId?.stringValue === userId;
      });

      console.log("Ditemukan " + userNodes.length + " server terdaftar.");

      if (userNodes.length === 0) {
        // Fallback ke server tunggal bawaan jika user belum menambahkan server kustom
        console.log("Tidak ada server kustom terdaftar. Menggunakan server default: " + HF_SPACE_URL);
        selectedSpaceUrl = HF_SPACE_URL;
      } else {
        // Cari server dengan beban terendah (jumlah siaran aktif paling sedikit) yang online
        let bestNodeUrl = null;
        let minActiveCount = Infinity;
        
        for (let i = 0; i < userNodes.length; i++) {
          const node = userNodes[i];
          let nodeUrl = node.fields.url?.stringValue || "";
          nodeUrl = nodeUrl.replace(/\/$/, ""); // bersihkan trailing slash
          
          if (!nodeUrl) continue;
          
          const serverName = node.fields.name?.stringValue || "Server " + (i + 1);
          console.log("Memeriksa status server untuk load balancing: " + serverName + " (" + nodeUrl + ")...");
          try {
            // Cek status via API dengan timeout cepat (5 detik)
            const checkRes = UrlFetchApp.fetch(nodeUrl + "/status?secret=" + HF_SECRET, {
              method: "GET",
              muteHttpExceptions: true,
              timeoutInSeconds: 5
            });
            
            const checkText = checkRes.getContentText();
            const checkData = JSON.parse(checkText);
            
            // Hitung jumlah stream aktif di server ini
            let activeCount = 0;
            if (checkData.active_streams) {
              // Hitung yang statusnya STREAMING atau DOWNLOADING
              for (let pid in checkData.active_streams) {
                let sStatus = checkData.active_streams[pid].status;
                if (sStatus === "STREAMING" || sStatus === "DOWNLOADING") {
                  activeCount++;
                }
              }
            } else if (checkData.status === "STREAMING" || checkData.status === "DOWNLOADING") {
              activeCount = 1;
            }
            
            console.log("Server " + serverName + " online dengan " + activeCount + " siaran aktif.");
            
            if (activeCount < minActiveCount) {
              minActiveCount = activeCount;
              bestNodeUrl = nodeUrl;
            }
          } catch (err) {
            console.log("Server " + serverName + " OFFLINE / Sedang tidur: " + err.message);
            // Kirim ping ringan tanpa menunggu untuk membangunkan container Hugging Face jika sedang tertidur
            try {
              UrlFetchApp.fetch(nodeUrl + "/status?secret=" + HF_SECRET, {
                method: "GET",
                muteHttpExceptions: true,
                timeoutInSeconds: 1
              });
            } catch (pingErr) {
              // Abaikan timeout/error ping
            }
          }
        }
        
        if (bestNodeUrl) {
          selectedSpaceUrl = bestNodeUrl;
          console.log("Memilih server dengan beban terendah: " + selectedSpaceUrl + " (Jumlah aktif: " + minActiveCount + ")");
        }
      }

      if (!selectedSpaceUrl) {
        throw new Error("Semua server streaming Anda sedang offline atau tidur. Silakan bangunkan server Anda atau coba lagi beberapa saat lagi.");
      }

      // Simpan URL server yang dipilih ke dokumen postingan agar PWA bisa memantau dengan tepat
      try {
        const cleanNodeUrl = selectedSpaceUrl.replace(/\/$/, "");
        const updates = {
          fields: {
            streamingNodeUrl: { stringValue: cleanNodeUrl }
          }
        };
        updateFirestoreFields(postId, updates, "streamingNodeUrl");
      } catch (e) {
        console.log("Gagal menyimpan streamingNodeUrl ke dokumen postingan: " + e.message);
      }

      // Ubah status Firestore segera ke "Processing" agar trigger menit depan tahu postingan sedang diproses
      updateFirestoreStatus(postId, "Processing", "Menghubungkan ke server streaming...");

      // Pemicu webhook ke server streaming terpilih
      console.log("Mengirim trigger ke server streaming: " + selectedSpaceUrl);
      const response = UrlFetchApp.fetch(selectedSpaceUrl + "/start_stream?postId=" + postId + "&secret=" + HF_SECRET, {
        method: "POST",
        muteHttpExceptions: true,
        timeoutInSeconds: 30
      });

      const responseText = response.getContentText();
      console.log("Respon Server: " + responseText);

      const resJson = JSON.parse(responseText);
      if (resJson.status === "error") {
        throw new Error("Gagal di Server Streaming: " + resJson.message);
      }

      result = "Live streaming berhasil dipicu di " + selectedSpaceUrl + ": " + responseText;
      console.log(result);

    } else {
      // ----------------------------------------------------
      // JALUR 2: POSTINGAN BIASA (KODE LAMA ANDA)
      // ----------------------------------------------------
      if (platform === "facebook") {
        if (linkUrl) {
          result = postLinkToFacebook(pageId, token, content, postId);
        } else {
          result = postToFacebook(pageId, token, content, mediaUrl);
        }
      } else if (platform === "instagram") {
        result = postToInstagram(pageId, token, content, mediaUrl);
      } else if (platform === "youtube") {
        const freshToken = getFreshYouTubeToken(token);
        result = postToYouTube(freshToken, post);
      } else {
        console.log("Platform " + platform + " belum didukung otomatis.");
        return;
      }

      console.log("Berhasil Posting! Respon: " + result);
      updateFirestoreStatus(postId, "Published", ""); // Hapus log error jika berhasil
    }

  } catch (err) {
    console.error("Gagal posting: " + err.message);
    updateFirestoreStatus(postId, "Error", err.message); // Simpan pesan error
  }
}


// =========================================================================
// FUNGSI PEMBANTU BARU (Tambahkan di bagian bawah berkas Apps Script Anda)
// =========================================================================

// Membuat YouTube Live Broadcast & Stream secara otomatis via API
// Membuat YouTube Live Broadcast & Stream secara otomatis via API dengan metadata localizations
function createYouTubeLive(ytTitle, privacyStatus, token, description, tierLocation) {
  // A. Buat Live Broadcast (Tanpa block localizations agar tidak memicu error API)
  var broadcastUrl = "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails";

  var snippet = {
    title: ytTitle,
    description: description || "",
    scheduledStartTime: new Date(Date.now() + 5000).toISOString() // Mulai 5 detik ke depan
  };

  var localizations = null;
  if (tierLocation && tierLocation !== "none" && tierLocation !== "") {
    var targetLang = "en";
    if (tierLocation === "tier1") targetLang = "en";
    else if (tierLocation === "tier2_es") targetLang = "es";
    else if (tierLocation === "tier2_pt") targetLang = "pt";
    else if (tierLocation === "tier3_vn") targetLang = "vi";
    else if (tierLocation === "tier3_th") targetLang = "th";
    else if (tierLocation === "tier3_ph") targetLang = "tl";

    try {
      var translatedTitle = LanguageApp.translate(ytTitle, '', targetLang);
      var translatedDescription = description ? LanguageApp.translate(description, '', targetLang) : "";

      localizations = {};
      localizations[targetLang] = {
        title: translatedTitle,
        description: translatedDescription
      };
      console.log("Menyiapkan Localization YouTube (" + targetLang + "): " + translatedTitle);
    } catch (transError) {
      console.error("Gagal menerjemahkan metadata YouTube localizations: " + transError.message);
    }
  }

  var broadcastPayload = {
    snippet: snippet,
    status: {
      privacyStatus: privacyStatus || "public",
      selfDeclaredMadeForKids: false
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true
    }
  };

  var broadcastRes = UrlFetchApp.fetch(broadcastUrl, {
    method: "POST",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(broadcastPayload),
    muteHttpExceptions: true
  });

  var broadcastData = JSON.parse(broadcastRes.getContentText());
  if (broadcastData.error) {
    throw new Error("YouTube Live Broadcast Error: " + broadcastData.error.message);
  }
  var broadcastId = broadcastData.id;

  // B. Simpan localization jika ada (melalui Videos API karena broadcastId = videoId)
  if (localizations && broadcastId) {
    try {
      console.log("Mengambil metadata video untuk localization...");
      var videoGetUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + broadcastId;
      var videoGetRes = UrlFetchApp.fetch(videoGetUrl, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        muteHttpExceptions: true
      });
      var videoGetData = JSON.parse(videoGetRes.getContentText());
      if (videoGetData.items && videoGetData.items.length > 0) {
        var videoItem = videoGetData.items[0];
        var originalSnippet = videoItem.snippet;
        
        // Buat objek snippet bersih (hanya properti yang dapat ditulis)
        var cleanSnippet = {
          title: originalSnippet.title || ytTitle,
          description: originalSnippet.description || description || "",
          categoryId: originalSnippet.categoryId || "22", // Fallback ke category 22 (People & Blogs)
          defaultLanguage: "id"
        };
        if (originalSnippet.tags) cleanSnippet.tags = originalSnippet.tags;
        if (originalSnippet.defaultAudioLanguage) cleanSnippet.defaultAudioLanguage = originalSnippet.defaultAudioLanguage;

        var videoUpdatePayload = {
          id: broadcastId,
          snippet: cleanSnippet,
          localizations: localizations
        };

        var videoUpdateUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet,localizations";
        var videoUpdateRes = UrlFetchApp.fetch(videoUpdateUrl, {
          method: "PUT",
          contentType: "application/json",
          headers: { Authorization: "Bearer " + token },
          payload: JSON.stringify(videoUpdatePayload),
          muteHttpExceptions: true
        });
        console.log("YouTube Video Localization Update Respon: " + videoUpdateRes.getContentText());
      }
    } catch (localErr) {
      console.error("Gagal mengupdate localization pada video YouTube: " + localErr.message);
    }
  }

  // C. Buat Live Stream (Kunci Stream RTMP)
  var streamUrl = "https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn";
  var streamPayload = {
    snippet: {
      title: ytTitle + " Stream Key"
    },
    cdn: {
      frameRate: "variable",
      ingestionType: "rtmp",
      resolution: "variable"
    }
  };

  var streamRes = UrlFetchApp.fetch(streamUrl, {
    method: "POST",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(streamPayload),
    muteHttpExceptions: true
  });

  var streamData = JSON.parse(streamRes.getContentText());
  if (streamData.error) {
    throw new Error("YouTube Live Stream Error: " + streamData.error.message);
  }
  var streamId = streamData.id;
  var streamName = streamData.cdn.ingestionInfo.streamName; // Kunci Stream!

  // D. Hubungkan (Bind) Broadcast ke Stream
  var bindUrl = "https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=" + broadcastId + "&streamId=" + streamId + "&part=id";
  var bindRes = UrlFetchApp.fetch(bindUrl, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });

  var bindData = JSON.parse(bindRes.getContentText());
  if (bindData.error) {
    throw new Error("YouTube Live Bind Error: " + bindData.error.message);
  }

  return {
    broadcastId: broadcastId,
    streamId: streamId,
    streamKey: streamName
  };
}


// Update nilai streamKey dan ytBroadcastId ke dokumen Firestore
function updateFirestoreStreamKeyAndBroadcastId(docId, streamKey, broadcastId) {
  const token = getAccessToken();
  let url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/posts/${docId}?updateMask.fieldPaths=streamKey`;
  
  const payload = {
    fields: {
      streamKey: { stringValue: streamKey }
    }
  };

  if (broadcastId) {
    url += `&updateMask.fieldPaths=ytBroadcastId`;
    payload.fields.ytBroadcastId = { stringValue: broadcastId };
  }

  UrlFetchApp.fetch(url, {
    method: "patch", contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// Mengaktifkan redirect dari parent post ke Live 2
function updateParentRedirect(parentId, nextPostId, nextBroadcastId) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/posts/${parentId}?updateMask.fieldPaths=redirectPostId&updateMask.fieldPaths=redirectYtBroadcastId&updateMask.fieldPaths=redirectUrl`;
  
  const payload = {
    fields: {
      redirectPostId: { stringValue: nextPostId },
      redirectYtBroadcastId: { stringValue: nextBroadcastId },
      redirectUrl: { stringValue: "https://www.youtube.com/watch?v=" + nextBroadcastId }
    }
  };

  UrlFetchApp.fetch(url, {
    method: "patch", contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  console.log("Redirect aktif di parent post " + parentId + " -> " + nextPostId);
}

// ==========================================
// KUMPULAN FUNGSI PLATFORM
// ==========================================

// Post Link Card ke Facebook (Clickable Image Link)
function postLinkToFacebook(pageId, token, message, postId) {
  // Menggunakan URL Cloudflare Worker Anda yang sudah aktif secara instan!
  const workerUrl = "https://snooplink.irvancharis.workers.dev";
  const redirectUrl = workerUrl + "/" + postId;

  const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  const payload = {
    message: message,
    link: redirectUrl, // Menggunakan Tautan Bersih dari Cloudflare Worker
    access_token: token
  };

  const res = UrlFetchApp.fetch(url, { method: "post", payload: payload, muteHttpExceptions: true });
  const responseData = JSON.parse(res.getContentText());
  if (responseData.error) throw new Error(responseData.error.message || res.getContentText());
  return res.getContentText();
}


// Post ke Facebook Page (Foto/Video Biasa) - dengan Resumable Video Upload untuk File Besar (> 50MB)
function postToFacebook(pageId, token, message, imageUrl) {
  let fileId = "";
  const match = imageUrl.match(/[?&]id=([^&]+)/) || imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    fileId = match[1];
  } else {
    const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    const payload = { url: imageUrl, caption: message, access_token: token };
    const res = UrlFetchApp.fetch(url, { method: "post", payload: payload, muteHttpExceptions: true });

    const responseData = JSON.parse(res.getContentText());
    if (responseData.error) throw new Error(responseData.error.message);
    return res.getContentText();
  }
  // Ambil metadata file (ukuran dan tipe)
  const fileMeta = getDriveFileSizeAndType(fileId);
  const isVideo = fileMeta.mimeType.indexOf('video/') === 0;
  // Jika berupa Video, lakukan Resumable/Chunked Upload ke Facebook Graph API (Bypass Limit 50MB)
  if (isVideo) {
    const totalSize = fileMeta.size;
    const endpoint = `https://graph.facebook.com/v19.0/${pageId}/videos`;
    // Fase 1: Start (Inisiasi sesi upload)
    const startPayload = {
      upload_phase: "start",
      access_token: token,
      file_size: totalSize.toString()
    };
    const startRes = UrlFetchApp.fetch(endpoint, { method: "post", payload: startPayload, muteHttpExceptions: true });
    const startData = JSON.parse(startRes.getContentText());
    if (startData.error) throw new Error("FB Video Start Gagal: " + (startData.error.message || startRes.getContentText()));
    const sessionId = startData.upload_session_id;
    // Fase 2: Transfer (Kirim potongan video per 10 MB)
    const chunkSize = 10 * 1024 * 1024; // 10 MB chunk
    let offset = 0;
    while (offset < totalSize) {
      const currentChunkSize = Math.min(chunkSize, totalSize - offset);
      const chunkBlob = getDriveFileChunk(fileId, offset, currentChunkSize);
      const transferPayload = {
        upload_phase: "transfer",
        access_token: token,
        upload_session_id: sessionId,
        start_offset: offset.toString(),
        video_file_chunk: chunkBlob
      };
      const transferRes = UrlFetchApp.fetch(endpoint, { method: "post", payload: transferPayload, muteHttpExceptions: true });
      const transferData = JSON.parse(transferRes.getContentText());
      if (transferData.error) throw new Error("FB Video Transfer Gagal pada offset " + offset + ": " + (transferData.error.message || transferRes.getContentText()));
      offset = parseInt(transferData.start_offset, 10);
      if (isNaN(offset)) {
        offset += currentChunkSize;
      }
    }
    // Fase 3: Finish (Finalisasi postingan dengan menambahkan Deskripsi/Pesan)
    const finishPayload = {
      upload_phase: "finish",
      access_token: token,
      upload_session_id: sessionId,
      description: message
    };
    const finishRes = UrlFetchApp.fetch(endpoint, { method: "post", payload: finishPayload, muteHttpExceptions: true });
    const finishData = JSON.parse(finishRes.getContentText());
    if (finishData.error) throw new Error("FB Video Finish Gagal: " + (finishData.error.message || finishRes.getContentText()));
    return finishRes.getContentText();
  }

  // Jika berupa Foto, posting langsung seperti biasa
  else {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    const payload = {
      access_token: token,
      source: blob,
      caption: message
    };
    const res = UrlFetchApp.fetch(endpoint, { method: "post", payload: payload, muteHttpExceptions: true });
    const responseData = JSON.parse(res.getContentText());
    if (responseData.error) throw new Error(responseData.error.message || res.getContentText());
    return res.getContentText();
  }
}



// Post ke YouTube Channel dengan Resumable Chunked Upload (Mendukung File Besar > 50MB)
function postToYouTube(token, post) {
  const content = post.fields.content?.stringValue || "";
  const mediaUrl = post.fields.mediaUrl?.stringValue;
  const ytTitle = post.fields.ytTitle?.stringValue || "Postingan Snooplink";
  const ytTagsStr = post.fields.ytTags?.stringValue || "";
  const ytPrivacy = post.fields.ytPrivacy?.stringValue || "public";
  const ytThumbnail = post.fields.ytThumbnail?.stringValue;

  if (!mediaUrl) throw new Error("Media URL untuk video tidak ditemukan.");

  const match = mediaUrl.match(/[?&]id=([^&]+)/) || mediaUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match || !match[1]) {
    throw new Error("Hanya mendukung video yang diunggah di Google Drive untuk file besar.");
  }
  const fileId = match[1];
  // 1. Ambil metadata file dari Drive
  const fileMeta = getDriveFileSizeAndType(fileId);
  const totalSize = fileMeta.size;
  const contentType = fileMeta.mimeType || "video/mp4";

  // 2. Siapkan Metadata YouTube
  const metadata = {
    snippet: {
      title: ytTitle,
      description: content,
      tags: ytTagsStr ? ytTagsStr.split(",").map(function (t) { return t.trim(); }) : []
    },
    status: {
      privacyStatus: ytPrivacy
    }
  };

  // 3. Inisiasi Sesi Upload Resumable ke YouTube
  const initUrl = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
  const initOptions = {
    method: "POST",
    contentType: "application/json; charset=UTF-8",
    headers: {
      "Authorization": "Bearer " + token,
      "X-Upload-Content-Length": totalSize.toString(),
      "X-Upload-Content-Type": contentType
    },
    payload: JSON.stringify(metadata),
    muteHttpExceptions: true
  };

  const initResponse = UrlFetchApp.fetch(initUrl, initOptions);
  if (initResponse.getResponseCode() !== 200) {
    throw new Error("Gagal menginisiasi sesi upload YouTube: " + initResponse.getContentText());
  }

  const headers = initResponse.getHeaders();
  const sessionUrl = headers["Location"] || headers["location"];
  if (!sessionUrl) {
    throw new Error("Sesi upload YouTube tidak ditemukan dalam respons header.");
  }

  // 4. Unggah Video dalam Pecahan (Chunk) Maksimal 10 MB per request
  const chunkSize = 10 * 1024 * 1024; // 10 MB
  var offset = 0;
  var responseData = null;

  while (offset < totalSize) {
    var currentChunkSize = Math.min(chunkSize, totalSize - offset);

    // Download chunk dari Google Drive secara streaming
    var chunkBlob = getDriveFileChunk(fileId, offset, currentChunkSize);

    var uploadOptions = {
      method: "PUT",
      contentType: contentType,
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Range": "bytes " + offset + "-" + (offset + currentChunkSize - 1) + "/" + totalSize
      },
      payload: chunkBlob.getBytes(),
      muteHttpExceptions: true
    };

    var uploadResponse = UrlFetchApp.fetch(sessionUrl, uploadOptions);
    var respCode = uploadResponse.getResponseCode();

    if (respCode === 200 || respCode === 201) {
      responseData = JSON.parse(uploadResponse.getContentText());
    } else if (respCode !== 308) {
      throw new Error("Gagal mengunggah potongan video ke YouTube (" + offset + "-" + (offset + currentChunkSize - 1) + "): Status " + respCode + " - " + uploadResponse.getContentText());
    }

    offset += currentChunkSize;
  }

  if (!responseData || !responseData.id) {
    throw new Error("Pengunggahan selesai tetapi tidak mendapatkan Video ID dari YouTube.");
  }

  const videoId = responseData.id;

  // 5. Jika ada Custom Thumbnail
  if (ytThumbnail && videoId) {
    try {
      let thumbBlob;
      const thumbMatch = ytThumbnail.match(/[?&]id=([^&]+)/) || ytThumbnail.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (thumbMatch && thumbMatch[1]) {
        thumbBlob = DriveApp.getFileById(thumbMatch[1]).getBlob();
      } else {
        thumbBlob = UrlFetchApp.fetch(ytThumbnail).getBlob();
      }

      UrlFetchApp.fetch("https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=" + videoId, {
        method: "POST",
        headers: { Authorization: 'Bearer ' + token },
        contentType: thumbBlob.getContentType(),
        payload: thumbBlob.getBytes(),
        muteHttpExceptions: true
      });
      console.log("Thumbnail berhasil diunggah.");
    } catch (e) {
      console.error("Video berhasil diunggah, tetapi Gagal upload thumbnail: " + e.message);
    }
  }

  return "Berhasil posting video ke YouTube. ID: " + videoId;
}



// ==========================================
// 3. FUNGSI UNTUK PWA (REDIRECTOR, UPLOAD & HAPUS MEDIA)
// ==========================================

function doPost(e) {
  try {
    var action = e.parameter.action;

    // Fallback jika dikirim via JSON body
    var requestData = null;
    if (!action && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
        action = requestData.action;
      } catch (err) { }
    }

    // ACTION BARU: Eksekusi postingan tunggal secara paralel
    if (action === 'executePostSingle') {
      var postId = e.parameter.postId || (requestData && requestData.postId);
      var post = getSingleFirestorePost(postId);
      if (post) {
        var postType = post.fields.postType?.stringValue || "post";
        executePost(post, postId);
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          message: 'Executed: ' + postId,
          debugCodeVersion: 'v2.2-live-stream',
          debugPostType: postType

        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Post tidak ditemukan.");
      }
    }

    // ACTION BARU: triggerNextLive (Memicu Auto Create & Start Live 2)
    if (action === 'triggerNextLive') {
      var parentPostId = e.parameter.parentPostId || (requestData && requestData.parentPostId);
      console.log("Menerima triggerNextLive untuk parentPostId: " + parentPostId);
      
      var parentPost = getSingleFirestorePost(parentPostId);
      if (!parentPost) {
        throw new Error("Parent post tidak ditemukan.");
      }
      
      var parentFields = parentPost.fields;
      var postType = parentFields.postType?.stringValue || "post";
      if (postType !== "live") {
        throw new Error("Parent post bukan tipe live stream.");
      }
      
      // Duplikasi metadata untuk Live 2
      var nextFields = JSON.parse(JSON.stringify(parentFields));
      
      // Generate waktu saat ini (GMT+7) untuk jadwal Live 2
      var now = new Date();
      var gmt7DateString = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
      var gmt7TimeString = Utilities.formatDate(now, "GMT+7", "HH:mm");
      var currentMinuteString = gmt7DateString + " " + gmt7TimeString;
      
      nextFields.status = { stringValue: "Scheduled" };
      nextFields.time = { stringValue: currentMinuteString };
      nextFields.isRecurring = { booleanValue: false };
      nextFields.createdAt = { timestampValue: new Date().toISOString() };
      
      // Kosongkan broadcast ID lama dan stream key agar generate yang baru untuk Live 2 (jika auto)
      if (nextFields.ytBroadcastId) delete nextFields.ytBroadcastId;
      if (nextFields.streamKeyMode?.stringValue === "auto" && nextFields.streamKey) {
        delete nextFields.streamKey;
      }
      
      // Bersihkan field redirect, error, dan log lama agar Live 2 steril
      if (nextFields.redirectPostId) delete nextFields.redirectPostId;
      if (nextFields.redirectYtBroadcastId) delete nextFields.redirectYtBroadcastId;
      if (nextFields.redirectUrl) delete nextFields.redirectUrl;
      if (nextFields.error_log) delete nextFields.error_log;
      if (nextFields.lastExecutedMinute) delete nextFields.lastExecutedMinute;

      // Bersihkan media yang ter-resolve jika mode acak diaktifkan agar Live 2 me-resolve ulang
      if (nextFields.randomVideo?.booleanValue) {
        if (nextFields.mediaUrl) delete nextFields.mediaUrl;
        if (nextFields.mediaType) delete nextFields.mediaType;
        if (nextFields.fileName) delete nextFields.fileName;
        if (nextFields.fileSize) delete nextFields.fileSize;
      }
      if (nextFields.randomMusic?.booleanValue) {
        if (nextFields.backsoundUrls) delete nextFields.backsoundUrls;
      }
      if (nextFields.randomThumbnail?.booleanValue) {
        if (nextFields.ytThumbnail) delete nextFields.ytThumbnail;
      }
      
      // Simpan link parentPostId agar Live 2 bisa memicu redirect
      nextFields.parentPostId = { stringValue: parentPostId };
      
      // Buat dokumen postingan Live 2 baru di Firestore
      var nextPostId = createFirestoreDocument("posts", { fields: nextFields });
      console.log("Berhasil membuat Live 2 dengan ID: " + nextPostId);
      
      // Dapatkan webAppUrl
      var webAppUrl = getWebAppUrlFromFirestore();
      if (!webAppUrl) {
        webAppUrl = "https://script.google.com/macros/s/AKfycbwdxnTBbLtzqglMPRAx_whpyZt4_zmZNA77TsWI6AmJEociu0h_QhsSCTXinDua8HJleg/exec";
      }
      
      // Picu eksekusi Live 2 secara asynchronous
      var executeUrl = webAppUrl + "?action=executePostSingle&postId=" + nextPostId;
      console.log("Memicu eksekusi Live 2 via URL: " + executeUrl);
      
      // Gunakan fetch non-blocking dengan timeout kecil agar tidak menunggu eksekusi selesai
      try {
        UrlFetchApp.fetch(executeUrl, {
          method: "post",
          muteHttpExceptions: true,
          timeoutInSeconds: 1
        });
      } catch (fetchErr) {
        // Abaikan timeout error karena kita memang ingin trigger asinkronus
        console.log("Trigger eksekusi Live 2 dikirim (timeout expected): " + fetchErr.message);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Auto-create & start Live 2 triggered',
        parentPostId: parentPostId,
        nextPostId: nextPostId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION 1: Membuat sesi unggah resumable dengan mengizinkan origin browser (CORS Fix)
    if (action === 'createUploadSession') {
      var filename = e.parameter.filename || (requestData && requestData.filename);
      var mimetype = e.parameter.mimetype || (requestData && requestData.mimetype);
      var origin = e.parameter.origin || (requestData && requestData.origin) || 'https://snooplink-pro.web.app';

      var url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
      var metadata = {
        name: filename,
        mimeType: mimetype
      };

      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
          'Origin': origin  // Memberitahu Drive API asal domain browser untuk bypass CORS
        },
        payload: JSON.stringify(metadata),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(url, options);
      var headers = response.getHeaders();
      var sessionUrl = headers['Location'] || headers['location'];

      if (!sessionUrl) {
        throw new Error("Gagal mendapatkan Location header. Response: " + response.getContentText());
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        uploadUrl: sessionUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION 2: Finalisasi izin akses file menjadi Publik
    if (action === 'finalizeFile') {
      var fileId = e.parameter.fileId || (requestData && requestData.fileId);
      var file = DriveApp.getFileById(fileId);

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var downloadUrl = 'https://drive.google.com/uc?id=' + fileId + '&export=download&confirm=t';

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        url: downloadUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION LEGACY: fallback untuk upload base64 lama (jika di bawah 25 MB langsung)
    var fullData = (requestData && (requestData.data || requestData.file || requestData.blob || requestData.base64));
    var filename = (requestData && (requestData.filename || requestData.name)) || 'uploaded_file';
    var mimetype = (requestData && (requestData.mimetype || requestData.type)) || 'application/octet-stream';

    if (fullData) {
      var base64Data = fullData.split(',')[1] || fullData;
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, mimetype, filename);
      var file = DriveApp.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        url: 'https://drive.google.com/uc?id=' + file.getId() + '&export=download&confirm=t'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Aksi tidak dikenal atau parameter kosong.");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function doGet(e) {
  var action = e.parameter.action;
  if (action === 'delete') {
    var fileId = e.parameter.fileId;
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      return ContentService.createTextOutput("Deleted: " + fileId);
    } catch (err) {
      return ContentService.createTextOutput("Error: " + err.toString());
    }
  }
  // Jalankan as doPost jika ada parameter action lain (misalnya triggerNextLive)
  // guna mengantisipasi redirection library HTTP (seperti python requests) yang mengubah POST menjadi GET
  if (action) {
    return doPost(e);
  }
  return ContentService.createTextOutput("Snooplink Apps Script Active");
}






// ==========================================
// 4. INTERNAL FIRESTORE HELPERS
// ==========================================
function getFirestoreData(collection) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/${collection}`;
  const res = UrlFetchApp.fetch(url, { headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true });
  return JSON.parse(res.getContentText()).documents || [];
}

function getFirestoreDocument(collection, docId) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/${collection}/${docId}`;
  const res = UrlFetchApp.fetch(url, { headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true });
  return JSON.parse(res.getContentText());
}

function updateFirestoreStatus(docId, newStatus, errorMessage = "") {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/posts/${docId}?updateMask.fieldPaths=status&updateMask.fieldPaths=error_log`;

  const payload = {
    fields: {
      status: { stringValue: newStatus },
      error_log: { stringValue: errorMessage }
    }
  };

  UrlFetchApp.fetch(url, {
    method: "patch", contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function getAccessToken() {
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const claim = JSON.stringify({
    iss: FB_CONFIG.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  });
  const signature = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(Utilities.base64EncodeWebSafe(header) + "." + Utilities.base64EncodeWebSafe(claim), FB_CONFIG.private_key));
  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    payload: { grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: Utilities.base64EncodeWebSafe(header) + "." + Utilities.base64EncodeWebSafe(claim) + "." + signature }
  });
  return JSON.parse(res.getContentText()).access_token;
}

// Helper: Mengambil ukuran file & mimeType dari Google Drive API tanpa memuat seluruh file ke memori
function getDriveFileSizeAndType(fileId) {
  var url = 'https://www.googleapis.com/drive/v3/files/' + fileId + '?fields=size,mimeType';
  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Gagal mengambil metadata file dari Drive: " + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  return {
    size: parseInt(data.size, 10),
    mimeType: data.mimeType
  };
}

// Helper: Mengunduh potongan (chunk) file dari Drive secara parsial menggunakan Range Header
function getDriveFileChunk(fileId, offset, length) {
  var url = 'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media';
  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
      'Range': 'bytes=' + offset + '-' + (offset + length - 1)
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 206 && response.getResponseCode() !== 200) {
    throw new Error("Gagal mengunduh potongan file dari Drive pada offset " + offset + ": " + response.getContentText());
  }

  return response.getBlob();
}


function getSingleFirestorePost(docId) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/posts/${docId}`;
  const res = UrlFetchApp.fetch(url, { headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true });
  if (res.getResponseCode() === 200) {
    return JSON.parse(res.getContentText());
  }
  return null;
}

function getWebAppUrlFromFirestore() {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.project_id}/databases/(default)/documents/settings/config`;
  const res = UrlFetchApp.fetch(url, { headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true });
  if (res.getResponseCode() === 200) {
    const data = JSON.parse(res.getContentText());
    return data.fields.webAppUrl?.stringValue;
  }
  return null;
}


// =======================================================
// FUNGSI DIAGNOSIS 1: Memeriksa Tipe Postingan di Database
// =======================================================
function checkFirestorePosts() {
  console.log("--- MENGECEK DAFTAR POSTINGAN DI FIRESTORE ---");
  const posts = getFirestoreData("posts");
  posts.forEach(post => {
    const postId = post.name.split('/').pop();
    const title = post.fields.ytTitle?.stringValue || post.fields.content?.stringValue || "Tanpa Judul";
    const status = post.fields.status?.stringValue || "No Status";
    const postType = post.fields.postType?.stringValue || "TIDAK SET (Default: Reguler)";
    console.log(`ID: ${postId} | Judul: ${title} | Status: ${status} | Tipe: ${postType}`);
  });
}

// =======================================================
// FUNGSI DIAGNOSIS 2: Tes Tembak Langsung ke Hugging Face
// =======================================================
function testHuggingFaceDirectly() {
  console.log("--- MENGETES KONEKSI KE HUGGING FACE ---");
  try {
    const url = `${HF_SPACE_URL}?postId=TEST_DUMMY_ID&secret=${HF_SECRET}`;
    console.log("Mengirim request ke: " + url);
    const response = UrlFetchApp.fetch(url, {
      method: "POST",
      muteHttpExceptions: true
    });
    console.log("Respon Hugging Face: " + response.getContentText());
  } catch (e) {
    console.log("Error Koneksi: " + e.message);
  }
}



function checkFirestoreUrl() {
  const url = getWebAppUrlFromFirestore();
  console.log("URL Web App yang terdaftar di Firestore: " + url);
}


function testLiveExecution() {
  // Gunakan ID postingan Live Anda yang sudah berstatus 'Published' tadi
  const testPostId = "t4eiud8rac0QOjtN6ouY";

  const post = getSingleFirestorePost(testPostId);
  if (post) {
    console.log("--- MEMULAI UJI COBA LIVE STREAM ---");
    console.log("Post ID: " + testPostId);
    console.log("Post Type di Firestore: " + (post.fields.postType?.stringValue || "TIDAK ADA"));

    // Jalankan eksekusi
    executePost(post, testPostId);
  } else {
    console.log("Error: Dokumen Firestore tidak ditemukan.");
  }
}


function checkTokenScopes() {
  const testPostId = "t4eiud8rac0Q0jtN6ouY"; // ID postingan baru Anda
  const post = getSingleFirestorePost(testPostId);
  if (!post) {
    console.log("Post tidak ditemukan");
    return;
  }
  const accountId = post.fields.accountId?.stringValue;
  const account = getFirestoreDocument("social_accounts", accountId);
  const refreshToken = account.fields.accessToken?.stringValue;

  if (!refreshToken) {
    console.log("Refresh token tidak ditemukan");
    return;
  }

  // Kredensial Google Client
  const clientId = "687270813688-8fsdi9hsnjrv8jvna051acs7ofiuk0uo.apps.googleusercontent.com";
  const clientSecret = "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";

  try {
    const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      payload: {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      },
      muteHttpExceptions: true
    });

    const tokenData = JSON.parse(response.getContentText());
    if (tokenData.error) {
      console.log("Error refresh token: " + tokenData.error_description);
      return;
    }

    const accessToken = tokenData.access_token;

    // Cek info token langsung ke Google Server
    const infoResponse = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + accessToken, {
      muteHttpExceptions: true
    });

    const infoData = JSON.parse(infoResponse.getContentText());
    console.log("Scope aktif pada token Anda: " + infoData.scope);
  } catch (e) {
    console.log("Error: " + e.message);
  }
}


function checkYoutubeAccountScopes() {
  console.log("--- MENGECEK SCOPE AKUN YOUTUBE ---");
  const accounts = getFirestoreData("social_accounts");
  let found = false;

  accounts.forEach(account => {
    const platform = account.fields.platform?.stringValue;
    if (platform === "youtube") {
      found = true;
      const accountId = account.name.split('/').pop();
      const name = account.fields.name?.stringValue || "YouTube Channel";
      const refreshToken = account.fields.accessToken?.stringValue;
      console.log(`Menemukan akun: ${name} (ID: ${accountId})`);

      if (!refreshToken) {
        console.log("Error: Refresh token tidak ditemukan.");
        return;
      }

      const clientId = "687270813688-8fsdi9hsnjrv8jvna051acs7ofiuk0uo.apps.googleusercontent.com";
      const clientSecret = "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";

      try {
        const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          contentType: "application/x-www-form-urlencoded",
          payload: {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token"
          },
          muteHttpExceptions: true
        });

        const tokenData = JSON.parse(response.getContentText());
        if (tokenData.error) {
          console.log("Error refresh token: " + tokenData.error_description);
          return;
        }

        const accessToken = tokenData.access_token;
        const infoResponse = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + accessToken, {
          muteHttpExceptions: true
        });

        const infoData = JSON.parse(infoResponse.getContentText());
        console.log("Scope aktif pada token Anda: " + infoData.scope);
      } catch (e) {
        console.log("Error: " + e.message);
      }
    }
  });
  if (!found) {
    console.log("Tidak menemukan akun YouTube terdaftar di Firestore.");
  }
}


function diagnoseSinglePost() {
  const testPostId = "zpDrvx8vL9xbvyjjAeAH"; // ID postingan yang tadi terposting reguler
  const post = getSingleFirestorePost(testPostId);

  if (post) {
    console.log("--- DIAGNOSIS POSTINGAN FIRESTORE ---");
    console.log("ID Postingan: " + testPostId);
    console.log("Platform: " + (post.fields.platform?.stringValue || "KOSONG"));
    console.log("Status Sekarang: " + (post.fields.status?.stringValue || "KOSONG"));
    console.log("Tipe Postingan (postType): " + (post.fields.postType?.stringValue || "KOSONG"));
    console.log("Stream Key Mode: " + (post.fields.streamKeyMode?.stringValue || "KOSONG"));

    // Cek kesesuaian URL Web App
    const urlFirestore = getWebAppUrlFromFirestore();
    console.log("--- DIAGNOSIS URL ---");
    console.log("URL Web App di Firestore: " + urlFirestore);
  } else {
    console.log("Post tidak ditemukan di Firestore.");
  }
}

// ==========================================
// SPINTAX PARSER HELPER
// ==========================================
function parseSpintax(text) {
  if (!text) return "";
  var regex = /\{([^{}]+)\}/;
  var match;
  while ((match = regex.exec(text)) !== null) {
    var parts = match[1].split('|');
    var randomPart = parts[Math.floor(Math.random() * parts.length)];
    text = text.substring(0, match.index) + randomPart.trim() + text.substring(match.index + match[0].length);
  }
  return text;
}



