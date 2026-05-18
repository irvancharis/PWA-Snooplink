import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      // Hide the app-provided install promotion
      setShowPrompt(false);
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      console.log('SnoopLink PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Hide the information prompt that we provided
    setShowPrompt(false);
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 100, opacity: 0, x: '-50%' }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            width: 'calc(100% - 40px)',
            maxWidth: '400px',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid #eef2ff'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Download color="#fff" size={24} />
          </div>
          
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>Install SnoopLink</h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Tambahkan ke layar utama untuk akses lebih cepat dan mudah!</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={handleInstallClick}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
            >
              Install
            </button>
            <button 
              onClick={handleClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Nanti
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
