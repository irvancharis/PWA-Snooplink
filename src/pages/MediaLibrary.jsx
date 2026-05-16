import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

const MediaLibrary = ({ posts }) => (
  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
    {posts.filter(p => p.mediaUrl).length === 0 ? (
      <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '6rem', background: '#fff' }}>
        <ImageIcon size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Belum ada media yang diunggah.</p>
      </div>
    ) : (
      posts.filter(p => p.mediaUrl).map(post => (
        <div key={post.id} className="card" style={{ padding: 0, overflow: 'hidden', aspectRatio: '1/1', position: 'relative', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <img src={post.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '0.8rem', right: '0.8rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '0.4rem', borderRadius: '8px', border: '1px solid #eee' }}>
            <div className={`social-badge social-${post.platform === 'instagram' ? 'ig' : (post.platform === 'tiktok' ? 'tt' : 'fb')}`} style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
               <i className={`fab fa-${post.platform === 'facebook' ? 'facebook-f' : post.platform}`}></i>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

export default MediaLibrary;
