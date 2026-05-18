import React from 'react';
import { Shield, Lock, Eye, Trash2, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#334155',
      padding: '4rem 2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        padding: '3rem',
        border: '1px solid #e2e8f0'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#eef2ff',
            color: '#6366f1',
            marginBottom: '1rem'
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
            Kebijakan Privasi / Privacy Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Terakhir Diperbarui: 19 Mei 2026 / Last Updated: May 19, 2026</p>
        </div>

        {/* Section: Bahasa Indonesia */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🇮🇩</span> Bahasa Indonesia
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7' }}>
            <p>
              Selamat datang di <strong>Snooplink</strong>. Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan menghapus data Anda saat menggunakan layanan kami.
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>1. Informasi yang Kami Kumpulkan</h3>
            <p>Kami mengumpulkan informasi yang Anda berikan secara langsung saat menggunakan aplikasi Snooplink:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li><strong>Informasi Profil Akun:</strong> Nama, alamat email, dan foto profil yang diperoleh saat Anda melakukan login menggunakan Google Auth atau Facebook Login.</li>
              <li><strong>Koneksi Akun Sosial Media:</strong> ID Halaman Facebook, nama Halaman, ID Akun Bisnis Instagram, ID Channel YouTube, serta Token Akses API yang aman guna melakukan integrasi postingan.</li>
              <li><strong>Konten yang Diunggah:</strong> File media (gambar/video), teks deskripsi, judul postingan, serta tanggal/waktu yang Anda jadwalkan untuk diterbitkan.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>2. Cara Kami Menggunakan data</h3>
            <p>Kami menggunakan data yang dikumpulkan semata-mata untuk kebutuhan fungsionalitas aplikasi:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>Mengintegrasikan and menampilkan akun Fanspage Facebook, Instagram Bisnis, dan YouTube Anda di halaman Akun.</li>
              <li>Memublikasikan konten media dan pesan yang telah Anda jadwalkan secara otomatis ke platform sosial media pilihan Anda melalui Graph API resmi.</li>
              <li>Menampilkan statistik aktivitas penulisan dan status kapasitas penyimpanan Anda di dasbor pribadi Anda.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>3. Keamanan dan Penyimpanan Data</h3>
            <p>
              Semua data Anda disimpan secara aman di infrastruktur cloud terlindungi milik **Google Firebase Cloud Firestore** (database) dan **Firebase Cloud Storage** (media). Kami menggunakan protokol enkripsi transit SSL/TLS untuk memastikan data Anda terlindung dari akses tanpa izin. Kami **tidak pernah menjual, menyewakan, atau membagikan** data pribadi Anda kepada pihak ketiga mana pun.
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Trash2 size={18} /> 4. Penghapusan Data Pengguna (User Data Deletion)</h3>
            <p>
              Kami memberikan kendali penuh kepada Anda atas data Anda. Jika Anda ingin menghapus seluruh data Anda dari sistem kami, silakan ikuti metode berikut:
            </p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li><strong>Metode Mandiri:</strong> Anda dapat mencabut akses aplikasi *Snooplink* kapan saja langsung melalui menu pengaturan keamanan di Akun Google atau Akun Facebook Anda (Facebook App Settings).</li>
              <li><strong>Permintaan Penghapusan Manual:</strong> Anda dapat mengirimkan permintaan penghapusan data secara permanen dengan mengirimkan email ke <strong>irvancharis@gmail.com</strong>. Tulis subjek "Permintaan Penghapusan Data Snooplink" beserta email akun Anda. Kami akan menghapus seluruh data akun, token akses, dan file media Anda dari server kami dalam waktu maksimal **48 jam** dan memberikan konfirmasi melalui email.</li>
            </ul>
          </div>
        </div>

        {/* Section: English */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🇺🇸</span> English (Meta Compliance)
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7' }}>
            <p>
              Welcome to <strong>Snooplink</strong>. We highly value your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, store, and delete your data when you use our services.
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>1. Information We Collect</h3>
            <p>We collect information that you directly provide when using the Snooplink application:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li><strong>Account Profile Information:</strong> Name, email address, and profile picture obtained when logging in using Google Auth or Facebook Login.</li>
              <li><strong>Social Media Connections:</strong> Facebook Page IDs, Page Names, Instagram Business Account IDs, YouTube Channel IDs, and secure API Access Tokens used for integration and scheduling.</li>
              <li><strong>Uploaded Content:</strong> Media files (images/videos), descriptions, titles, and target date/time that you schedule to be published.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>2. How We Use Your Data</h3>
            <p>We use the collected information solely for the functional operation of the application:</p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li>To link and show your Facebook Pages, Instagram Business Accounts, and YouTube Channels in your dashboard.</li>
              <li>To automatically publish scheduled media and posts to your selected social platforms using official Graph APIs.</li>
              <li>To render scheduler history, limits, and storage quotas in your secure private dashboard.</li>
            </ul>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>3. Data Security and Storage</h3>
            <p>
              All user data is stored securely in **Google Firebase Cloud Firestore** (database) and **Firebase Cloud Storage** (media). We employ secure SSL/TLS transit protocols. We **do not sell, rent, or share** your personal data with any third parties under any circumstances.
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '1rem 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Trash2 size={18} /> 4. User Data Deletion</h3>
            <p>
              We guarantee your right to be forgotten. If you wish to delete your data from our systems, you can use the following methods:
            </p>
            <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
              <li><strong>Self-Service revocation:</strong> You can revoke *Snooplink* app permissions anytime directly through your Google Account Security Settings or Facebook App Settings.</li>
              <li><strong>Data Deletion Request:</strong> You can request a permanent deletion of all your stored records by sending an email to <strong>irvancharis@gmail.com</strong>. Please use the subject "Snooplink Data Deletion Request" and specify your registered email. We will permanently delete all your account profile, access tokens, and uploaded media files within **48 hours** and notify you via email.</li>
            </ul>
          </div>
        </div>

        {/* Contact Footer */}
        <div style={{
          marginTop: '3.5rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Mail size={18} /> Hubungi Kami / Contact Us
          </h3>
          <p style={{ margin: 0, color: '#64748b' }}>
            Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi Developer kami di:
          </p>
          <p style={{ marginTop: '0.5rem', fontWeight: 700, color: '#6366f1', fontSize: '1.1rem' }}>
            irvancharis@gmail.com
          </p>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
