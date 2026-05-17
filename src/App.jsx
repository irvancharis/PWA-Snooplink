import React, { useState, useEffect } from 'react';
import { Plus, Search, Rocket, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Context
import { useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/layout/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import AuthPage from './pages/AuthPage';
import MediaLibrary from './pages/MediaLibrary';
import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';

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

  const GOOGLE_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDvdMcP5IVWgC95xWxANc0cUIPYvSwwRl16D_XhD9NsQP7-X5SMgVjkCj0TY-ETGaT_Q/exec';

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
      const docRef = await addDoc(collection(db, 'users'), { name, email, password, createdAt: serverTimestamp() });
      login({ id: docRef.id, name, email });
    } catch (error) {
      alert("Registration Error: " + error.message);
    }
  };

  const handleSchedulePost = async (postData) => {
    if (!user) return;
    try {
      let finalMediaUrl = postData.mediaUrl;

      // Upload to Google Drive if a new file is selected
      if (postData.file) {
        const fullData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(postData.file);
        });

        const response = await fetch(GOOGLE_DRIVE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
            data: fullData,
            file: fullData,
            blob: fullData,
            base64: fullData,
            content: fullData,
            filename: postData.file.name,
            name: postData.file.name,
            mimetype: postData.file.type,
            type: postData.file.type
          })
        });

        const result = await response.json();
        console.log("Google Drive Response:", result);

        const driveUrl = result.url || result.link || result.fileUrl || result.downloadUrl;

        if (driveUrl) {
          // Convert to direct download link for Drive
          const driveIdMatch = driveUrl.match(/(?:\/d\/|id=)([\w-]+)/);
          finalMediaUrl = driveIdMatch
            ? `https://drive.google.com/uc?id=${driveIdMatch[1]}&export=download&confirm=t`
            : driveUrl;
        } else {
          throw new Error("Gagal mendapatkan URL dari Google Drive. Respons: " + JSON.stringify(result));
        }
      }

      const { file, ...cleanedData } = postData;

      await addDoc(collection(db, 'posts'), {
        ...cleanedData,
        mediaUrl: finalMediaUrl,
        userId: user.id,
        createdAt: serverTimestamp(),
        status: 'Scheduled'
      });
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

  if (authLoading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Rocket size={48} color="var(--primary)" className="animate-bounce" />
    </div>
  );

  if (!user) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="layout">
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        onLogout={logout} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
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

          <div className="header-actions" style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            <div className="input-group" style={{ marginBottom: 0, width: '280px', position: 'relative' }}>
              <input type="text" placeholder="Cari statistik..." style={{ paddingLeft: '2.8rem', background: '#fff', border: '1px solid #e2e8f0' }} />
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
            <button className="btn btn-primary" onClick={() => setActivePage('scheduler')}>
              <Plus size={20} />
              <span>Buat Post</span>
            </button>
            <div className="user-profile">
              <div className="avatar"></div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name || user.email.split('@')[0]}</span>
            </div>
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
            {activePage === 'dashboard' && <Dashboard posts={posts} onUseMedia={handleUseMedia} />}
            {activePage === 'scheduler' && (
              <Scheduler
                onSchedule={handleSchedulePost}
                initialMedia={prefilledMedia}
                onClearInitial={() => setPrefilledMedia(null)}
                accounts={accounts}
              />
            )}
            {activePage === 'queue' && <ScheduleList posts={posts} onDelete={handleDeletePost} onUpdate={handleUpdatePost} onUseMedia={handleUseMedia} />}
            {activePage === 'accounts' && (
              <Accounts
                accounts={accounts}
                onAdd={handleAddAccount}
                onDelete={handleDeleteAccount}
                onUpdate={handleUpdateAccount}
              />
            )}
            {activePage === 'media' && <MediaLibrary posts={posts} onUseMedia={handleUseMedia} onDelete={handleDeleteMedia} />}
            {activePage === 'analytics' && <Analytics />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
