import React, { useState, useEffect } from 'react';
import { Plus, Search, Rocket } from 'lucide-react';
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
  serverTimestamp 
} from 'firebase/firestore';

function App() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [posts, setPosts] = useState([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [accounts, setAccounts] = useState([]);

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
      await addDoc(collection(db, 'posts'), {
        ...postData,
        userId: user.id,
        createdAt: serverTimestamp(),
        status: 'Scheduled'
      });
      setActivePage('dashboard');
    } catch (error) {
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
      <Sidebar activePage={activePage} onNavigate={setActivePage} onLogout={logout} />
      
      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
            </h1>
            <p className="stat-label">Masuk sebagai {user.email}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
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
            {activePage === 'dashboard' && <Dashboard posts={posts} />}
            {activePage === 'scheduler' && <Scheduler onSchedule={handleSchedulePost} />}
            {activePage === 'accounts' && <Accounts accounts={accounts} onAdd={handleAddAccount} />}
            {activePage === 'media' && <MediaLibrary posts={posts} />}
            {activePage === 'analytics' && <Analytics />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
