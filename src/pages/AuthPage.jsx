import React, { useState } from 'react';
import { Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthPage = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister) {
      if (!name || !email || !password) return alert("Harap isi semua kolom!");
      onRegister(name, email, password);
    } else {
      if (!email || !password) return alert("Harap isi semua kolom!");
      onLogin(email, password);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="card" 
        style={{ width: '400px', textAlign: 'center', padding: '3rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
      >
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '2rem', fontSize: '2rem' }}>
          <Rocket size={40} color="var(--primary)" fill="var(--primary)" />
          <span>Snooplink</span>
        </div>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>{isRegister ? 'Daftar Akun' : 'Selamat Datang'}</h2>
        <p className="stat-label" style={{ marginBottom: '2.5rem' }}>{isRegister ? 'Mulai kelola konten Anda' : 'Masuk ke dashboard Anda'}</p>
        
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="input-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
              <label className="stat-label">Nama Lengkap</label>
              <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          
          <div className="input-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label className="stat-label">Email</label>
            <input type="email" placeholder="admin@sociallink.io" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          
          <div className="input-group" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <label className="stat-label">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
            {isRegister ? 'Buat Akun Sekarang' : 'Masuk'}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isRegister ? 'Sudah punya akun?' : "Belum punya akun?"}{' '}
          <span 
            style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Login di sini' : 'Daftar sekarang'}
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
