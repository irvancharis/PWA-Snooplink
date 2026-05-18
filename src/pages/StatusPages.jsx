import React from 'react';
import { Clock, ShieldAlert, LogOut, ShieldX } from 'lucide-react';
import { motion } from 'framer-motion';

export const PendingPage = ({ onLogout }) => (
  <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ width: '450px', textAlign: 'center', padding: '3rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}>
      <div style={{ background: '#fef3c7', width: '90px', height: '90px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
        <Clock size={45} color="#d97706" />
      </div>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 800 }}>Menunggu Persetujuan</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.5rem', fontSize: '0.95rem' }}>
        Terima kasih telah mendaftar! Akun Anda saat ini sedang dalam proses peninjauan oleh Administrator. Anda akan menerima notifikasi email setelah akun Anda diaktifkan.
      </p>
      <button onClick={onLogout} className="btn" style={{ background: '#f1f5f9', color: '#475569', width: '100%', justifyContent: 'center', padding: '1rem', border: '1px solid #e2e8f0' }}>
        <LogOut size={18} /> Kembali ke Halaman Login
      </button>
    </motion.div>
  </div>
);

export const RejectedPage = ({ onLogout }) => (
  <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ width: '450px', textAlign: 'center', padding: '3rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}>
      <div style={{ background: '#fee2e2', width: '90px', height: '90px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
        <ShieldX size={45} color="#dc2626" />
      </div>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 800 }}>Akses Ditolak</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.5rem', fontSize: '0.95rem' }}>
        Mohon maaf, pendaftaran akun Anda tidak dapat kami setujui saat ini karena tidak memenuhi kriteria kami. Silakan hubungi dukungan jika Anda merasa ini adalah kesalahan.
      </p>
      <button onClick={onLogout} className="btn" style={{ background: '#f1f5f9', color: '#475569', width: '100%', justifyContent: 'center', padding: '1rem', border: '1px solid #e2e8f0' }}>
        <LogOut size={18} /> Keluar
      </button>
    </motion.div>
  </div>
);

export const ExpiredPage = ({ onLogout }) => (
  <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ width: '450px', textAlign: 'center', padding: '3rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}>
      <div style={{ background: '#fee2e2', width: '90px', height: '90px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
        <ShieldAlert size={45} color="#dc2626" />
      </div>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 800 }}>Lisensi Berakhir</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.5rem', fontSize: '0.95rem' }}>
        Masa aktif lisensi akun Anda telah habis. Anda tidak dapat lagi menjadwalkan *post* atau mengakses dasbor. Silakan perbarui lisensi Anda dengan menghubungi Administrator.
      </p>
      <button onClick={onLogout} className="btn" style={{ background: '#f1f5f9', color: '#475569', width: '100%', justifyContent: 'center', padding: '1rem', border: '1px solid #e2e8f0' }}>
        <LogOut size={18} /> Keluar
      </button>
    </motion.div>
  </div>
);
