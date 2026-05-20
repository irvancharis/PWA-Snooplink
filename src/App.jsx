import React, { useState, useEffect } from 'react';
import { Plus, Search, Rocket, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Context
import { useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/layout/Sidebar';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Pages
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import AuthPage from './pages/AuthPage';
import MediaLibrary from './pages/MediaLibrary';
import Accounts from './pages/Accounts';
import AdminDashboard from './pages/AdminDashboard';
import { PendingPage, RejectedPage, ExpiredPage } from './pages/StatusPages';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Firebase Services
import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import ScheduleList from './pages/ScheduleList';

function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('snooplink_active_page') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('snooplink_active_page', activePage);
  }, [activePage]);
  const [posts, setPosts] = useState([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [prefilledMedia, setPrefilledMedia] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dbUser, setDbUser] = useState(null);

  // Sync real-time user data from Firestore
  useEffect(() => {
    if (!user) {
      setDbUser(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setDbUser({ id: docSnapshot.id, ...docSnapshot.data() });
      }
    });
    return unsubscribe;
  }, [user]);

  const GOOGLE_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwdxnTBbLtzqglMPRAx_whpyZt4_zmZNA77TsWI6AmJEociu0h_QhsSCTXinDua8HJleg/exec';

  const handleUseMedia = (url) => {
    setPrefilledMedia(url);
    setActivePage('scheduler');
  };

  // Firestore Sync for Social Accounts
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'social_accounts'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accData);
    });
    return unsubscribe;
  }, [user]);

  // Firestore Sync for Posts
  useEffect(() => {
    if (!user) return;
    setFetchingPosts(true);
    const q = query(collection(db, 'posts'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setFetchingPosts(false);
    });
    return unsubscribe;
  }, [user]);

  // Simpan URL Google Apps Script terbaru ke Firestore untuk dibaca backend secara dinamis
  useEffect(() => {
    if (!user) return;
    const saveScriptUrl = async () => {
      try {
        await setDoc(doc(db, 'settings', 'config'), {
          webAppUrl: GOOGLE_DRIVE_SCRIPT_URL
        }, { merge: true });
      } catch (err) {
        console.error("Gagal menyimpan Web App URL ke Firestore:", err);
      }
    };
    saveScriptUrl();
  }, [user]);

  const handleLogin = async (email, password) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        delete userData.password;
        login(userData);
      } else {
        alert("Email atau password salah.");
      }
    } catch (error) {
      alert("Login Error: " + error.message);
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) return alert("Email sudah terdaftar!");

      const docRef = await addDoc(collection(db, 'users'), {
        name,
        email,
        password,
        role: 'user',
        status: 'pending',
        storageLimit: 100,
        storageUsed: 0,
        dailyPostLimit: 5,
        expiresAt: null,
        createdAt: serverTimestamp()
      });
      // Login directly, the real-time listener will route them to PendingPage
      login({ id: docRef.id, name, email });
    } catch (error) {
      alert("Registration Error: " + error.message);
    }
  };

  const uploadFileDirect = (sessionUrl, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', sessionUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error("Gagal mengurai respons unggahan Google Drive."));
          }
        } else {
          reject(new Error(`Gagal mengunggah file. Status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Terjadi kesalahan koneksi internet saat mengunggah."));
      };

      xhr.send(file);
    });
  };

  const handleSchedulePost = async (postData, onProgress) => {
    if (!user) return;
    try {
      let finalMediaUrl = postData.mediaUrl;

      // Upload ke Google Drive jika ada file baru dipilih
      if (postData.file) {
        const file = postData.file;

        if (onProgress) onProgress({ percent: 0, stage: 'Meminta sesi unggah Google Drive...' });

        // 1. Buat sesi pengunggahan dengan mendaftarkan origin browser
        const sessionResponse = await fetch(GOOGLE_DRIVE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'createUploadSession',
            filename: file.name,
            mimetype: file.type,
            origin: window.location.origin
          })
        });
        const sessionResult = await sessionResponse.json();

        if (sessionResult.status !== 'success' || !sessionResult.uploadUrl) {
          throw new Error("Gagal membuat sesi unggah Google Drive: " + (sessionResult.message || "Tanggapan kosong"));
        }

        if (onProgress) onProgress({ percent: 0, stage: 'Mengunggah media utama...' });

        // 2. Unggah file secara langsung (utuh) ke server Google Drive via XHR (cepat & bypass CORS)
        const uploadResult = await uploadFileDirect(sessionResult.uploadUrl, file, (percent) => {
          if (onProgress) onProgress({ percent, stage: 'Mengunggah media utama...' });
        });

        if (!uploadResult.id) {
          throw new Error("Gagal mendapatkan ID file setelah mengunggah.");
        }

        if (onProgress) onProgress({ percent: 100, stage: 'Memfinalisasi file...' });

        // 3. Ubah hak akses file menjadi publik dan dapatkan download link
        const finalizeResponse = await fetch(GOOGLE_DRIVE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'finalizeFile',
            fileId: uploadResult.id
          })
        });
        const finalizeResult = await finalizeResponse.json();

        if (finalizeResult.status !== 'success' || !finalizeResult.url) {
          throw new Error("Gagal memfinalisasi file Google Drive: " + (finalizeResult.message || "Tanggapan kosong"));
        }

        finalMediaUrl = finalizeResult.url;
      }

      let finalYtThumbnailUrl = postData.ytThumbnail || null;

      // Upload Custom Thumbnail ke Google Drive jika disediakan
      if (postData.ytThumbnailFile) {
        const thumbnailFile = postData.ytThumbnailFile;

        if (onProgress) onProgress({ percent: 0, stage: 'Meminta sesi unggah thumbnail...' });

        const sessionResponse = await fetch(GOOGLE_DRIVE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'createUploadSession',
            filename: thumbnailFile.name,
            mimetype: thumbnailFile.type,
            origin: window.location.origin
          })
        });
        const sessionResult = await sessionResponse.json();

        if (sessionResult.status !== 'success' || !sessionResult.uploadUrl) {
          throw new Error("Gagal membuat sesi unggah thumbnail: " + (sessionResult.message || "Tanggapan kosong"));
        }

        if (onProgress) onProgress({ percent: 0, stage: 'Mengunggah thumbnail kustom...' });

        const uploadResult = await uploadFileDirect(sessionResult.uploadUrl, thumbnailFile, (percent) => {
          if (onProgress) onProgress({ percent, stage: 'Mengunggah thumbnail kustom...' });
        });

        if (!uploadResult.id) {
          throw new Error("Gagal mendapatkan ID thumbnail setelah mengunggah.");
        }

        if (onProgress) onProgress({ percent: 100, stage: 'Memfinalisasi thumbnail...' });

        const finalizeResponse = await fetch(GOOGLE_DRIVE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'finalizeFile',
            fileId: uploadResult.id
          })
        });
        const finalizeResult = await finalizeResponse.json();

        if (finalizeResult.status !== 'success' || !finalizeResult.url) {
          throw new Error("Gagal memfinalisasi thumbnail Google Drive: " + (finalizeResult.message || "Tanggapan kosong"));
        }

        finalYtThumbnailUrl = finalizeResult.url;
      }

      if (onProgress) onProgress({ percent: 100, stage: 'Menyimpan jadwal ke database...' });
      const { file, ytThumbnailFile, accounts: targetAccounts, ...sharedData } = postData;

      // Buat dokumen post terpisah untuk setiap akun yang dipilih
      for (const acc of targetAccounts) {
        const postDoc = {
          ...sharedData,
          platform: acc.platform,
          accountId: acc.id,
          accountName: acc.username || acc.name,
          mediaUrl: finalMediaUrl,
          userId: user.id,
          createdAt: serverTimestamp(),
          status: 'Scheduled'
        };

        // Tambahkan properti spesifik platform
        if (acc.platform === 'youtube') {
          postDoc.ytTitle = postData.ytTitle;
          postDoc.ytTags = postData.ytTags || '';
          postDoc.ytPrivacy = postData.ytPrivacy || 'public';
          if (finalYtThumbnailUrl) {
            postDoc.ytThumbnail = finalYtThumbnailUrl;
          }
        } else if (acc.platform === 'facebook') {
          postDoc.linkUrl = postData.linkUrl || '';
        }

        await addDoc(collection(db, 'posts'), postDoc);
      }

      setActivePage('dashboard');
    } catch (error) {
      console.error(error);
      alert("Gagal menjadwalkan postingan: " + error.message);
    }
  };

  const handleAddAccount = async (accData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'social_accounts'), {
        ...accData,
        userId: user.id,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      alert("Gagal menambah akun: " + error.message);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus akun ini?")) return;
    try {
      await deleteDoc(doc(db, 'social_accounts', accountId));
    } catch (error) {
      alert("Gagal menghapus akun: " + error.message);
    }
  };

  const handleUpdateAccount = async (accountId, updatedData) => {
    try {
      const { id, createdAt, userId, ...cleanData } = updatedData;
      await updateDoc(doc(db, 'social_accounts', accountId), cleanData);
      alert("Akun berhasil diperbarui.");
    } catch (error) {
      alert("Gagal memperbarui akun: " + error.message);
    }
  };

  const handleDeleteMedia = async (post) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus media ini dari database dan Google Drive?")) return;

    try {
      // 1. Hapus dari Google Drive jika itu link Drive
      if (post.mediaUrl && post.mediaUrl.includes('id=')) {
        // Ambil ID secara akurat
        const urlObj = new URL(post.mediaUrl);
        const fileId = urlObj.searchParams.get('id');

        if (fileId) {
          console.log("Sending delete request for ID:", fileId);
          // Gunakan fetch sederhana agar tidak memicu download otomatis
          const deleteUrl = `${GOOGLE_DRIVE_SCRIPT_URL}?action=delete&fileId=${fileId}`;
          fetch(deleteUrl, { mode: 'no-cors' }).catch(e => console.log("Del req sent"));
        }
      }

      // 2. Hapus dari Firestore
      await deleteDoc(doc(db, 'posts', post.id));
      alert("Media berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus media: " + error.message);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;
    try {
      await updateDoc(doc(db, 'posts', postId), { status: 'Deleted' });
    } catch (error) {
      alert("Gagal menghapus: " + error.message);
    }
  };

  const handleUpdatePost = async (postId, updatedData) => {
    try {
      await updateDoc(doc(db, 'posts', postId), updatedData);
    } catch (error) {
      alert("Gagal menyimpan perubahan: " + error.message);
      throw error;
    }
  };

  if (window.location.pathname === '/privacy') {
    return <PrivacyPolicy />;
  }

  if (authLoading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Rocket size={48} color="var(--primary)" className="animate-bounce" />
    </div>
  );

  if (!user) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!dbUser) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Rocket size={48} color="var(--primary)" className="animate-bounce" />
      </div>
    );
  }

  // Gates for specific account status
  if (dbUser.status === 'pending') return <PendingPage onLogout={logout} />;
  if (dbUser.status === 'rejected') return <RejectedPage onLogout={logout} />;
  if (dbUser.expiresAt && new Date() > (dbUser.expiresAt.toDate ? dbUser.expiresAt.toDate() : new Date(dbUser.expiresAt))) {
    return <ExpiredPage onLogout={logout} />;
  }

  return (
    <div className="layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={logout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={dbUser}
      />

      <main className="main-content">
        <header className="header">
          <div>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
            </h1>

          </div>


        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activePage === 'dashboard' && <Dashboard posts={posts} onUseMedia={handleUseMedia} user={dbUser} onViewAll={() => setActivePage('queue')} />}
            {activePage === 'scheduler' && (
              <Scheduler
                onSchedule={handleSchedulePost}
                initialMedia={prefilledMedia}
                onClearInitial={() => setPrefilledMedia(null)}
                accounts={accounts}
                posts={posts}
                user={dbUser}
              />
            )}
            {activePage === 'queue' && <ScheduleList posts={posts} onDelete={handleDeletePost} onUpdate={handleUpdatePost} onUseMedia={handleUseMedia} user={dbUser} />}
            {activePage === 'accounts' && (
              <Accounts
                accounts={accounts}
                onAdd={handleAddAccount}
                onDelete={handleDeleteAccount}
                onUpdate={handleUpdateAccount}
              />
            )}
            {activePage === 'media' && <MediaLibrary posts={posts} onUseMedia={handleUseMedia} onDelete={handleDeleteMedia} user={dbUser} />}
            {activePage === 'admin' && dbUser?.role === 'admin' && (
              <AdminDashboard scriptUrl={GOOGLE_DRIVE_SCRIPT_URL} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
