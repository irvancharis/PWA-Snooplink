import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ShieldCheck, XCircle, Settings, CheckCircle2, Search, Mail } from 'lucide-react';

const AdminDashboard = ({ scriptUrl }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sendEmailNotification = async (email, subject, body) => {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_email',
          email: email,
          subject: subject,
          body: body
        })
      });
    } catch (e) {
      console.error("Gagal mengirim email", e);
    }
  };

  const handleApprove = async (user) => {
    if (!window.confirm(`Setujui pendaftaran untuk ${user.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { status: 'approved' });
      alert("User berhasil disetujui!");
      
      const emailBody = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Halo ${user.name},</h2>
          <p>Pendaftaran Anda di <strong>Snooplink</strong> telah <b>disetujui</b> oleh Admin!</p>
          <p>Sekarang Anda dapat login ke dashboard dan mulai menggunakan layanan kami.</p>
          <br/>
          <p>Terima kasih,</p>
          <p>Tim Snooplink</p>
        </div>
      `;
      sendEmailNotification(user.email, "Pendaftaran Snooplink Disetujui!", emailBody);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleReject = async (user) => {
    if (!window.confirm(`Tolak dan blokir pendaftaran untuk ${user.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { status: 'rejected' });
      alert("User berhasil ditolak.");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleEditStorage = async (user) => {
    const limit = prompt(`Masukkan limit penyimpanan (MB) untuk ${user.name}:`, user.storageLimit || 100);
    if (limit === null) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), { storageLimit: Number(limit) });
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleEditExpiry = async (user) => {
    const expiresDays = prompt(`Masukkan masa aktif (hari) dari sekarang untuk ${user.name} (kosongkan jika tanpa batas waktu):`, "");
    if (expiresDays === null) return;
    
    try {
      const updates = {};
      if (expiresDays.trim() !== "") {
        const date = new Date();
        date.setDate(date.getDate() + Number(expiresDays));
        updates.expiresAt = date;
      } else {
        updates.expiresAt = null;
      }
      await updateDoc(doc(db, 'users', user.id), updates);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleEditDailyPostLimit = async (user) => {
    const limit = prompt(`Masukkan limit posting harian untuk ${user.name}:`, user.dailyPostLimit || 5);
    if (limit === null) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), { dailyPostLimit: Number(limit) });
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleEditAccountLimit = async (user) => {
    const limit = prompt(`Masukkan limit platform/akun terhubung untuk ${user.name}:`, user.accountLimit !== undefined ? user.accountLimit : 3);
    if (limit === null) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), { accountLimit: Number(limit) });
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div style={{ padding: '2rem' }}>Memuat data pengguna...</div>;

  return (
    <div className="admin-dashboard">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>Admin Panel</h2>
          <p className="stat-label">Kelola pengguna, limit penyimpanan, dan persetujuan registrasi.</p>
        </div>
        <div className="input-group" style={{ marginBottom: 0, width: '100%', maxWidth: '300px', position: 'relative' }}>
          <input type="text" placeholder="Cari nama atau email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.8rem', background: '#fff', border: '1px solid #e2e8f0', width: '100%' }} />
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>PENGGUNA</th>
              <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>STATUS</th>
              <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>PENYIMPANAN</th>
              <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>LIMIT PLATFORM</th>
              <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>LIMIT POST/HARI</th>
              <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>MASA AKTIF</th>
              <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, idx) => (
              <tr key={u.id} style={{ borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                <td style={{ padding: '1.2rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  {u.role === 'admin' && <span style={{ display: 'inline-block', marginTop: '0.3rem', padding: '0.2rem 0.5rem', background: '#fef08a', color: '#854d0e', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 700 }}>SUPERADMIN</span>}
                </td>
                <td style={{ padding: '1.2rem' }}>
                  {u.status === 'pending' && <span style={{ padding: '0.4rem 0.8rem', background: '#fef3c7', color: '#b45309', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>Menunggu</span>}
                  {u.status === 'approved' && <span style={{ padding: '0.4rem 0.8rem', background: '#dcfce3', color: '#166534', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>Disetujui</span>}
                  {u.status === 'rejected' && <span style={{ padding: '0.4rem 0.8rem', background: '#fee2e2', color: '#991b1b', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>Ditolak</span>}
                </td>
                <td style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.storageUsed || 0} MB / {u.storageLimit || 100} MB</span>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleEditStorage(u)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }} title="Ubah Limit Penyimpanan">
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '0.5rem' }}>
                    <div style={{ width: `${Math.min(((u.storageUsed || 0) / (u.storageLimit || 100)) * 100, 100)}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }}></div>
                  </div>
                </td>
                <td style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      {u.role === 'admin' || u.email === 'irvancharis@gmail.com' ? 'Tidak Terbatas' : `${u.accountLimit !== undefined ? u.accountLimit : 3} Akun`}
                    </span>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleEditAccountLimit(u)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }} title="Ubah Limit Platform">
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      {u.role === 'admin' || u.email === 'irvancharis@gmail.com' ? 'Tidak Terbatas' : `${u.dailyPostLimit || 5} Post`}
                    </span>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleEditDailyPostLimit(u)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }} title="Ubah Limit Post Harian">
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{u.expiresAt ? new Date(u.expiresAt.toDate ? u.expiresAt.toDate() : u.expiresAt).toLocaleDateString() : 'Selamanya'}</span>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleEditExpiry(u)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }} title="Ubah Masa Aktif">
                        <Settings size={14} />
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                  {u.role !== 'admin' && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {u.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(u)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }} title="Setujui">
                            <CheckCircle2 size={18} />
                          </button>
                          <button onClick={() => handleReject(u)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }} title="Tolak">
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada pengguna ditemukan.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
