import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image as ImageIcon, 
  Send, 
  Grid, 
  X, 
  Video, 
  FileImage, 
  CheckCircle2, 
  Info, 
  Music, 
  UploadCloud, 
  Volume2, 
  Calendar, 
  Clock, 
  HelpCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Scheduler = ({ onSchedule, initialMedia, onClearInitial, accounts, posts, mediaList = [], onUploadMedia, user, editPost, onCancelEdit, onUpdatePost }) => {
  const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  // Recurring schedules
  const [isRecurring, setIsRecurring] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState([]); // Array of: "Monday", "Tuesday", "Wednesday", etc.
  const [scheduledTime, setScheduledTime] = useState('');

  // YouTube specific state
  const [ytTitle, setYtTitle] = useState('');
  const [ytTags, setYtTags] = useState('');
  const [ytPrivacy, setYtPrivacy] = useState('public');
  const [ytCategoryId, setYtCategoryId] = useState('22');
  const [ytThumbnailUrl, setYtThumbnailUrl] = useState('');
  const [randomThumbnail, setRandomThumbnail] = useState(false);
  const [ytAlteredContent, setYtAlteredContent] = useState('yes');

  // Live stream specific state
  const [postType, setPostType] = useState('post'); // 'post' or 'live'
  const [isGenerateVideo, setIsGenerateVideo] = useState(false);
  const [postDuration, setPostDuration] = useState('5');
  const [streamKeyMode, setStreamKeyMode] = useState('auto'); // 'auto' or 'manual'
  const [streamKey, setStreamKey] = useState('');
  const [liveDuration, setLiveDuration] = useState('60'); // default 60 minutes
  const [isUnlimitedDuration, setIsUnlimitedDuration] = useState(true); // 24/7
  const [isAutoLoop, setIsAutoLoop] = useState(false);
  const [bitrate, setBitrate] = useState('copy'); // 'copy', '2500k', '4000k', '6000k'
  const [tierLocation, setTierLocation] = useState('none'); // translation target
  const [linkUrl, setLinkUrl] = useState('');

  // Media Library Selections
  const [mediaUrl, setMediaUrl] = useState('');
  const [randomVideo, setRandomVideo] = useState(false);
  const [backsoundMode, setBacksoundMode] = useState('none'); // 'none', 'select', 'random'
  const [selectedBacksoundUrls, setSelectedBacksoundUrls] = useState([]);
  const [randomMusic, setRandomMusic] = useState(false);
  const [randomMusicCount, setRandomMusicCount] = useState(1);
  const [imageStampUrl, setImageStampUrl] = useState('');
  const [introText, setIntroText] = useState('');
  const [dryRun, setDryRun] = useState(false);

  // Modal & Uploader UI state
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '' });
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaModalType, setMediaModalType] = useState('video'); // 'video', 'backsound', 'stamp', 'thumbnail', 'postMedia'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  const isVideo = (url) => {
    if (!url) return false;
    // 1. Check if the URL matches an item in mediaList with category 'video'
    const foundInList = mediaList.find(m => m.mediaUrl === url);
    if (foundInList) {
      if (foundInList.category === 'video') return true;
      if (foundInList.fileName && foundInList.fileName.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i)) {
        return true;
      }
    }
    // 2. Fallback to standard regex match on the URL itself
    return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i);
  };

  const getDirectLink = (url) => {
    if (!url) return '';
    try {
      if (url.includes('drive.google.com') && url.includes('id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
        }
      }
    } catch (e) {}
    return url;
  };

  useEffect(() => {
    if (initialMedia) {
      setMediaUrl(initialMedia);
    }
    return () => onClearInitial?.();
  }, [initialMedia]);

  // Edit Mode initialization
  useEffect(() => {
    if (editPost) {
      setContent(editPost.contentTemplate || editPost.content || '');
      setSelectedAccountIds(editPost.accountId ? [editPost.accountId] : []);
      
      let d = '';
      let t = '';
      if (editPost.time && !editPost.isRecurring) {
        const parts = editPost.time.split(' ');
        d = parts[0] || '';
        t = parts[1] || '';
      }
      setDate(d);
      setTime(t);
      
      setIsRecurring(editPost.isRecurring || false);
      setDaysOfWeek(editPost.daysOfWeek || []);
      setScheduledTime(editPost.scheduledTime || '');
      
      setYtTitle(editPost.ytTitleTemplate || editPost.ytTitle || '');
      setYtTags(editPost.ytTags || '');
      setYtPrivacy(editPost.ytPrivacy || 'public');
      setYtCategoryId(editPost.ytCategoryId || '22');
      setYtThumbnailUrl(editPost.ytThumbnail || '');
      setYtAlteredContent(editPost.ytAlteredContent || 'yes');
      
      setPostType(editPost.postType || 'post');
      setStreamKeyMode(editPost.streamKeyMode || 'auto');
      setStreamKey(editPost.streamKey || '');
      setLiveDuration(editPost.liveDuration === '24/7' ? '60' : (editPost.liveDuration || '60'));
      setIsUnlimitedDuration(editPost.liveDuration === '24/7');
      setIsAutoLoop(editPost.isAutoLoop || false);
      setBitrate(editPost.bitrate || 'copy');
      setTierLocation(editPost.tierLocation || 'none');
      setLinkUrl(editPost.linkUrl || '');
      
      setMediaUrl(editPost.mediaUrl || '');
      setRandomVideo(editPost.randomVideo || false);
      
      const bsMode = editPost.randomMusic ? 'random' : (editPost.backsoundUrls?.length > 0 ? 'select' : 'none');
      setBacksoundMode(bsMode);
      setSelectedBacksoundUrls(editPost.backsoundUrls || []);
      setRandomMusicCount(editPost.randomMusicCount || 1);
      setImageStampUrl(editPost.imageStampUrl || '');
      setIntroText(editPost.introText || '');
      setRandomThumbnail(editPost.randomThumbnail || false);
      setIsGenerateVideo(editPost.isGenerateVideo || false);
      setPostDuration(editPost.postDuration || '5');
      setDryRun(editPost.dryRun || false);
    } else {
      // Clear/Reset form when not editing
      setContent('');
      setSelectedAccountIds(accounts.length > 0 ? [accounts[0].id] : []);
      setDate('');
      setTime('');
      setIsRecurring(false);
      setDaysOfWeek([]);
      setScheduledTime('');
      setYtTitle('');
      setYtTags('');
      setYtPrivacy('public');
      setYtCategoryId('22');
      setYtThumbnailUrl('');
      setYtAlteredContent('yes');
      setPostType('post');
      setStreamKeyMode('auto');
      setStreamKey('');
      setLiveDuration('60');
      setIsUnlimitedDuration(true);
      setIsAutoLoop(false);
      setBitrate('copy');
      setTierLocation('none');
      setLinkUrl('');
      setMediaUrl('');
      setRandomVideo(false);
      setBacksoundMode('none');
      setSelectedBacksoundUrls([]);
      setRandomMusicCount(1);
      setImageStampUrl('');
      setIntroText('');
      setRandomThumbnail(false);
      setIsGenerateVideo(false);
      setPostDuration('5');
      setDryRun(false);
    }
  }, [editPost, accounts]);

  useEffect(() => {
    if (editPost) return; // Skip default selection during edit
    if (accounts.length > 0 && selectedAccountIds.length === 0) {
      setSelectedAccountIds([accounts[0].id]);
    }
  }, [accounts, selectedAccountIds, editPost]);

  // Adjust account selection when postType changes
  useEffect(() => {
    if (editPost) return; // Skip auto-adjusting account during edit
    if (postType === 'live') {
      const activeLiveIds = selectedAccountIds.filter(id => {
        const acc = accounts.find(a => a.id === id);
        return acc && (acc.platform === 'youtube' || acc.platform === 'facebook');
      });
      if (activeLiveIds.length === 0 && accounts.length > 0) {
        const firstLive = accounts.find(a => a.platform === 'youtube' || a.platform === 'facebook');
        if (firstLive) {
          setSelectedAccountIds([firstLive.id]);
        } else {
          setSelectedAccountIds([]);
        }
      } else {
        setSelectedAccountIds(activeLiveIds);
      }
    }
  }, [postType, accounts, editPost]);

  const toggleAccountSelection = (accId) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accId)) {
        return prev.filter(id => id !== accId);
      } else {
        return [...prev, accId];
      }
    });
  };

  const hasYoutubeSelected = accounts.some(a => selectedAccountIds.includes(a.id) && a.platform === 'youtube');
  const hasFacebookSelected = accounts.some(a => selectedAccountIds.includes(a.id) && a.platform === 'facebook');

  // Force manual stream key mode if Facebook is selected
  useEffect(() => {
    if (hasFacebookSelected) {
      setStreamKeyMode('manual');
    }
  }, [hasFacebookSelected]);



  // Inline upload handler
  const handleInlineUpload = async (e, category, onSuccess) => {
    const file = e.target.files[0];
    if (!file) return;

    // Quota validation
    const totalSize = mediaList.reduce((acc, item) => acc + (item.fileSize || 0), 0);
    const storageLimitMB = user?.storageLimit || 100;
    const quotaLimit = storageLimitMB * 1024 * 1024;

    if (totalSize + file.size > quotaLimit) {
      setAlertModal({
        show: true,
        title: "Penyimpanan Penuh",
        message: "File ini melebihi kapasitas penyimpanan media library Anda!"
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStage('Mengunggah file ke Pustaka Media...');
      
      const uploaded = await onUploadMedia(file, category, ({ percent, stage }) => {
        setUploadProgress(percent);
        setUploadStage(stage);
      });

      if (uploaded && uploaded.mediaUrl) {
        onSuccess(uploaded.mediaUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      e.target.value = ''; // Reset file input
    }
  };

  const toggleDayOfWeek = (day) => {
    setDaysOfWeek(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const openSelectorModal = (type) => {
    setMediaModalType(type);
    setShowMediaModal(true);
  };

  const handleSubmit = async (e, duplicateMode = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (selectedAccountIds.length === 0) {
      setAlertModal({
        show: true,
        title: "Akun Belum Dipilih",
        message: "Harap pilih setidaknya satu akun sosial media tujuan postingan Anda!"
      });
      return;
    }

    if (isRecurring) {
      if (daysOfWeek.length === 0 || !scheduledTime) {
        setAlertModal({
          show: true,
          title: "Jadwal Belulang Belum Lengkap",
          message: "Harap pilih Hari dan Waktu untuk jadwal postingan berulang!"
        });
        return;
      }
    } else {
      if (!date || !time) {
        setAlertModal({
          show: true,
          title: "Formulir Belum Lengkap",
          message: "Harap pilih Tanggal dan Waktu untuk jadwal postingan!"
        });
        return;
      }
    }

    if (postType === 'live') {
      if (!randomVideo && !mediaUrl) {
        setAlertModal({
          show: true,
          title: "Media Belum Dipilih",
          message: "Siaran langsung membutuhkan file video dari pustaka media, atau silakan pilih opsi Video Acak (Random)!"
        });
        return;
      }

      if (!randomVideo && mediaUrl && !isVideo(mediaUrl)) {
        setAlertModal({
          show: true,
          title: "Format Media Salah",
          message: "Media untuk Live Streaming wajib berupa file video!"
        });
        return;
      }

      if (streamKeyMode === 'manual' && !streamKey.trim()) {
        setAlertModal({
          show: true,
          title: "Stream Key Belum Diisi",
          message: "Harap masukkan Stream Key untuk melakukan streaming secara manual!"
        });
        return;
      }

      if (!isUnlimitedDuration) {
        const parsedDuration = parseInt(liveDuration, 10);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
          setAlertModal({
            show: true,
            title: "Durasi Tidak Valid",
            message: "Harap isi durasi live streaming dengan angka menit yang valid!"
          });
          return;
        }
      }

      if (hasYoutubeSelected && !ytTitle.trim()) {
        setAlertModal({
          show: true,
          title: "Judul Belum Diisi",
          message: "Harap isi Judul Live Streaming YouTube Anda!"
        });
        return;
      }

      if (!content.trim()) {
        setAlertModal({
          show: true,
          title: "Deskripsi Belum Diisi",
          message: "Harap isi deskripsi/konten untuk Live Streaming Anda!"
        });
        return;
      }
    } else {
      if (hasYoutubeSelected) {
        if (!ytTitle || !content) {
          setAlertModal({
            show: true,
            title: "Formulir Belum Lengkap",
            message: "Harap isi Judul YouTube dan Deskripsi postingan!"
          });
          return;
        }
      } else {
        if (!content) {
          setAlertModal({
            show: true,
            title: "Formulir Belum Lengkap",
            message: "Harap isi konten deskripsi postingan Anda!"
          });
          return;
        }
      }
    }

    // Daily scheduling limit validation (non-recurring only)
    if (!isRecurring && (!editPost || duplicateMode)) {
      const isSuperAdmin = user?.role === 'admin' || user?.email === 'irvancharis@gmail.com';
      const dailyLimit = user?.dailyPostLimit !== undefined ? user.dailyPostLimit : 5;
      const targetDate = date;
      const postsOnSameDate = (posts || []).filter(p => p.time && p.time.startsWith(targetDate) && p.status !== 'Failed' && p.status !== 'Deleted');

      if (!isSuperAdmin && (postsOnSameDate.length + selectedAccountIds.length > dailyLimit)) {
        setAlertModal({
          show: true,
          title: "Batas Posting Terlampaui",
          message: `Batas posting harian terlampaui! Anda hanya diizinkan menjadwalkan maksimal ${dailyLimit} postingan per hari.`
        });
        return;
      }
    }

    const targetAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));

    // Compile payload
    let payload;
    if (editPost && !duplicateMode) {
      const activeAcc = accounts.find(a => selectedAccountIds.includes(a.id));
      payload = {
        content,
        contentTemplate: content,
        mediaUrl: randomVideo ? "" : mediaUrl,
        mediaType: randomVideo ? "" : (isVideo(mediaUrl) ? "video/mp4" : "image/jpeg"),
        fileName: randomVideo ? "Random Video Selection" : (mediaList.find(m => m.mediaUrl === mediaUrl)?.fileName || "Media_Pustaka"),
        fileSize: randomVideo ? 0 : (mediaList.find(m => m.mediaUrl === mediaUrl)?.fileSize || 0),
        linkUrl: activeAcc?.platform === 'facebook' ? linkUrl : '',
        postType,
        isRecurring,
        daysOfWeek: isRecurring ? daysOfWeek : [],
        scheduledTime: isRecurring ? scheduledTime : '',
        time: isRecurring ? '' : `${date} ${time}`,
        tierLocation,
        platform: activeAcc ? activeAcc.platform : editPost.platform,
        accountId: activeAcc ? activeAcc.id : editPost.accountId,
        accountName: activeAcc ? (activeAcc.username || activeAcc.name) : editPost.accountName,
        status: 'Scheduled', // Reset status to Scheduled
        ...(postType === 'live' && {
          streamKeyMode,
          streamKey: streamKeyMode === 'manual' ? streamKey : '',
          liveDuration: isUnlimitedDuration ? '24/7' : liveDuration,
          isAutoLoop,
          bitrate,
          imageStampUrl,
          introText,
          randomVideo,
          randomMusic: backsoundMode === 'random',
          randomMusicCount: backsoundMode === 'random' ? Number(randomMusicCount) : 1,
          backsoundUrls: backsoundMode === 'select' ? selectedBacksoundUrls : [],
          randomThumbnail
        }),
        isGenerateVideo: postType === 'post' && (activeAcc?.platform === 'youtube' || editPost.platform === 'youtube') && isGenerateVideo,
        ...(postType === 'post' && (activeAcc?.platform === 'youtube' || editPost.platform === 'youtube') && isGenerateVideo && {
          randomVideo,
          randomMusic: backsoundMode === 'random',
          randomMusicCount: backsoundMode === 'random' ? Number(randomMusicCount) : 1,
          backsoundUrls: backsoundMode === 'select' ? selectedBacksoundUrls : [],
          imageStampUrl,
          introText,
          randomThumbnail,
          postDuration,
          dryRun: (activeAcc?.platform === 'youtube' || editPost.platform === 'youtube') && dryRun
        }),
        ...((activeAcc?.platform === 'youtube' || editPost.platform === 'youtube') && {
          ytTitle,
          ytTitleTemplate: ytTitle,
          ytTags,
          ytTagsTemplate: ytTags,
          ytPrivacy,
          ytCategoryId,
          ytThumbnail: ytThumbnailUrl,
          ytAlteredContent
        })
      };
    } else {
      payload = {
        content,
        contentTemplate: content,
        accounts: targetAccounts,
        mediaUrl: randomVideo ? "" : mediaUrl,
        mediaType: randomVideo ? "" : (isVideo(mediaUrl) ? "video/mp4" : "image/jpeg"),
        fileName: randomVideo ? "Random Video Selection" : (mediaList.find(m => m.mediaUrl === mediaUrl)?.fileName || "Media_Pustaka"),
        fileSize: randomVideo ? 0 : (mediaList.find(m => m.mediaUrl === mediaUrl)?.fileSize || 0),
        linkUrl: hasFacebookSelected ? linkUrl : '',
        postType,
        isRecurring,
        daysOfWeek: isRecurring ? daysOfWeek : [],
        scheduledTime: isRecurring ? scheduledTime : '',
        time: isRecurring ? '' : `${date} ${time}`,
        tierLocation,
        ...(postType === 'live' && {
          streamKeyMode,
          streamKey: streamKeyMode === 'manual' ? streamKey : '',
          liveDuration: isUnlimitedDuration ? '24/7' : liveDuration,
          isAutoLoop,
          bitrate,
          imageStampUrl,
          introText,
          randomVideo,
          randomMusic: backsoundMode === 'random',
          randomMusicCount: backsoundMode === 'random' ? Number(randomMusicCount) : 1,
          backsoundUrls: backsoundMode === 'select' ? selectedBacksoundUrls : [],
          randomThumbnail
        }),
        isGenerateVideo: postType === 'post' && hasYoutubeSelected && isGenerateVideo,
        ...(postType === 'post' && hasYoutubeSelected && isGenerateVideo && {
          randomVideo,
          randomMusic: backsoundMode === 'random',
          randomMusicCount: backsoundMode === 'random' ? Number(randomMusicCount) : 1,
          backsoundUrls: backsoundMode === 'select' ? selectedBacksoundUrls : [],
          imageStampUrl,
          introText,
          randomThumbnail,
          postDuration,
          dryRun: hasYoutubeSelected && dryRun
        }),
        ...(hasYoutubeSelected && {
          ytTitle,
          ytTitleTemplate: ytTitle,
          ytTags,
          ytTagsTemplate: ytTags,
          ytPrivacy,
          ytCategoryId,
          ytThumbnail: ytThumbnailUrl,
          ytAlteredContent
        })
      };
    }

    setUploading(true);
    setUploadProgress(100);
    setUploadStage('Menyimpan jadwal ke database...');

    try {
      if (editPost && !duplicateMode) {
        await onUpdatePost(editPost.id, payload);
      } else {
        await onSchedule(payload);
        if (editPost && duplicateMode) {
          onCancelEdit();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };

  const getMediaListByModalType = () => {
    if (mediaModalType === 'video') {
      return mediaList.filter(m => m.category === 'video');
    }
    if (mediaModalType === 'backsound') {
      return mediaList.filter(m => m.category === 'musik');
    }
    if (mediaModalType === 'stamp' || mediaModalType === 'thumbnail') {
      return mediaList.filter(m => m.category === 'gambar');
    }
    // postMedia can be image or video
    return mediaList.filter(m => m.category === 'gambar' || m.category === 'video');
  };

  const dayOptions = [
    { value: 'Monday', label: 'Senin' },
    { value: 'Tuesday', label: 'Selasa' },
    { value: 'Wednesday', label: 'Rabu' },
    { value: 'Thursday', label: 'Kamis' },
    { value: 'Friday', label: 'Jumat' },
    { value: 'Saturday', label: 'Sabtu' },
    { value: 'Sunday', label: 'Minggu' }
  ];

  const accentColor = postType === 'live' ? '#ef4444' : 'var(--primary)';
  const accentBg = postType === 'live' ? '#fef2f2' : '#eef2ff';
  const accentBorder = postType === 'live' ? '#fecaca' : '#c7d2fe';

  return (
    <div className="scheduler-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .scheduler-container {
          width: 100%;
          max-width: 100%;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 0;
        }
        /* Custom Premium iOS Switch Toggle */
        .switch-container {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        .switch-input {
          display: none;
        }
        .switch-slider {
          width: 44px;
          height: 24px;
          background-color: #cbd5e1;
          border-radius: 99px;
          position: relative;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }
        .switch-slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          background-color: white;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: transform 0.2s ease;
        }
        .switch-input:checked + .switch-slider {
          background-color: #10b981;
        }
        .switch-input:checked + .switch-slider::before {
          transform: translateX(20px);
        }
        .scheduler-form {
          display: block !important;
          width: 100% !important;
        }
        .scheduler-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.8rem;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .scheduler-grid {
            grid-template-columns: 1fr;
          }
        }
        .scheduler-card {
          background: #ffffff;
          padding: 2rem;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.05), 0 2px 8px -1px rgba(148, 163, 184, 0.03);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .scheduler-card:hover {
          box-shadow: 0 12px 30px -5px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.05);
        }
        .scheduler-form-left {
          display: flex;
          flex-direction: column;
          gap: 1.8rem;
        }
        .scheduler-form-right {
          display: flex;
          flex-direction: column;
          gap: 1.8rem;
        }
        .section-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-main);
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 0.8rem;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        .flat-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }
        .btn-tab {
          flex: 1;
          padding: 0.9rem;
          border-radius: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 0.92rem;
        }
        .account-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.8rem;
        }
        /* Live Preview Simulator CSS */
        .preview-card {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }
        .preview-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fafafa;
          flex-wrap: wrap;
          gap: 0.8rem;
        }
        .preview-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }
        .preview-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .preview-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 0.25rem;
          border-radius: 12px;
          gap: 0.25rem;
        }
        .preview-tab-btn {
          padding: 0.5rem 0.8rem;
          border-radius: 9px;
          border: none;
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: transparent;
          color: var(--text-muted);
          transition: all 0.2s ease;
        }
        .preview-tab-btn.active {
          background: #fff;
          color: var(--text-main);
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        /* YouTube Mockup */
        .yt-mockup {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .yt-player {
          width: 100%;
          aspect-ratio: 16/9;
          background: #0f172a;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .yt-player-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .yt-play-overlay {
          position: absolute;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .yt-play-overlay:hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.25);
        }
        .yt-badge-live {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          background: #ef4444;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 900;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          letter-spacing: 0.5px;
        }
        .live-dot-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fff;
          animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .yt-watermark-preview {
          position: absolute;
          bottom: 0.75rem;
          right: 0.75rem;
          max-width: 50px;
          max-height: 25px;
          object-fit: contain;
          opacity: 0.85;
          pointer-events: none;
          background: rgba(255, 255, 255, 0.85);
          border-radius: 4px;
          padding: 2px 4px;
          border: 1px solid rgba(0,0,0,0.15);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .yt-info {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .yt-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.4;
          word-break: break-word;
        }
        .yt-meta-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }
        .yt-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          color: var(--primary);
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .yt-channel-details {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }
        .yt-channel-name {
          font-size: 0.82rem;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .yt-subscribers {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 600;
        }
        .yt-sub-btn {
          background: #0f172a;
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 0.4rem 1rem;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
        }
        .yt-desc-box {
          background: #f8fafc;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.75rem;
          color: #334155;
          line-height: 1.5;
          max-height: 80px;
          overflow-y: auto;
          white-space: pre-wrap;
          font-weight: 500;
        }
        /* Facebook Mockup */
        .fb-mockup {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .fb-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .fb-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #eef2ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #1877f2;
          font-size: 0.95rem;
          flex-shrink: 0;
          border: 1px solid #dbeafe;
        }
        .fb-author-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .fb-author-name {
          font-size: 0.85rem;
          font-weight: 800;
          color: #050505;
        }
        .fb-time-privacy {
          font-size: 0.7rem;
          color: #65676b;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
        }
        .fb-content {
          font-size: 0.85rem;
          color: #050505;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          font-weight: 500;
        }
        .fb-media {
          width: 100%;
          aspect-ratio: 1.91/1;
          background: #f0f2f5;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
        }
        .fb-media-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .fb-actions {
          display: flex;
          border-top: 1px solid #ced0d4;
          border-bottom: 1px solid #ced0d4;
          padding: 0.2rem 0;
        }
        .fb-action-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.5rem;
          font-size: 0.8rem;
          color: #65676b;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.15s;
        }
        .fb-action-btn:hover {
          background: #f2f2f2;
        }
        /* Summary Details */
        .summary-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .summary-title {
          font-size: 0.82rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin: 0 0 0.25rem 0;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        .summary-item {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .summary-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 700;
        }
        .summary-value {
          font-size: 0.75rem;
          color: #0f172a;
          font-weight: 800;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .account-selector-grid {
            grid-template-columns: 1fr;
          }
          .scheduler-card {
            padding: 1.25rem;
          }
          .scheduler-container {
            padding: 0.5rem;
          }
        }
      `}} />

      {/* Header Card */}
      <div className="scheduler-card" style={{ gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', margin: 0 }}>Buat Postingan Baru</h2>
            <p className="stat-label" style={{ margin: '0.2rem 0 0 0' }}>Jadwalkan siaran langsung dan postingan konten media sosial Anda</p>
          </div>
          
          {/* Post Type Selector (Tabs) */}
          <div style={{ display: 'flex', gap: '0.8rem', width: '100%', maxWidth: '380px' }}>
            <button
              type="button"
              className="btn-tab"
              onClick={() => setPostType('post')}
              style={{
                border: `2px solid ${postType === 'post' ? 'var(--primary)' : '#e2e8f0'}`,
                background: postType === 'post' ? '#eef2ff' : '#fff',
                color: postType === 'post' ? 'var(--primary)' : 'var(--text-main)',
                boxShadow: postType === 'post' ? '0 10px 15px -3px rgba(99, 102, 241, 0.08)' : 'none'
              }}
            >
              <ImageIcon size={18} />
              <span>Post Konten</span>
            </button>
            <button
              type="button"
              className="btn-tab"
              onClick={() => setPostType('live')}
              style={{
                border: `2px solid ${postType === 'live' ? '#ef4444' : '#e2e8f0'}`,
                background: postType === 'live' ? '#fef2f2' : '#fff',
                color: postType === 'live' ? '#ef4444' : 'var(--text-main)',
                boxShadow: postType === 'live' ? '0 10px 15px -3px rgba(239, 68, 68, 0.08)' : 'none'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span>Live Streaming</span>
            </button>
          </div>
        </div>
      </div>

      <form className="scheduler-form" onSubmit={handleSubmit}>
        <div className="scheduler-grid">
          
          {/* LEFT COLUMN: Accounts & Details */}
          <div className="scheduler-form-left">
            
            {/* CARD 1: Destination Accounts */}
            <div className="scheduler-card">
              <h3 className="section-title">
                <div className="flat-badge" style={{ background: accentBg, color: accentColor }}>1</div>
                <Grid size={18} style={{ color: accentColor }} />
                <span>Pilih Akun Tujuan</span>
              </h3>
              
              <div className="account-selector-grid">
                {(() => {
                  const filteredAccounts = postType === 'live'
                    ? accounts.filter(acc => acc.platform === 'youtube' || acc.platform === 'facebook')
                    : accounts;

                  if (filteredAccounts.length === 0) {
                    return (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', padding: '1.2rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                        {postType === 'live'
                          ? "Belum ada akun YouTube atau Facebook terhubung yang mendukung Live Streaming."
                          : "Belum ada akun yang terhubung. Silakan hubungkan akun di menu Accounts."}
                      </div>
                    );
                  }

                  return filteredAccounts.map(acc => {
                    const isSelected = selectedAccountIds.includes(acc.id);
                    return (
                      <div 
                        key={acc.id}
                        style={{ 
                          padding: '0.85rem 1rem', 
                          background: isSelected ? accentBg : '#f8fafc',
                          border: `2px solid ${isSelected ? accentColor : 'transparent'}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8rem',
                          cursor: 'pointer',
                          borderRadius: '14px',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => toggleAccountSelection(acc.id)}
                      >
                        <div className={`social-badge social-${acc.platform === 'facebook' ? 'fb' : (acc.platform === 'youtube' ? 'yt' : (acc.platform === 'instagram' ? 'ig' : 'tt'))}`} style={{ width: '34px', height: '34px', fontSize: '0.95rem' }}>
                           <i className={`fab fa-${acc.platform === 'facebook' ? 'facebook-f' : acc.platform}`}></i>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? accentColor : 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{acc.username || acc.name || 'Account'}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>{acc.platform}</span>
                        </div>
                        {isSelected && (
                          <div style={{ color: accentColor }}>
                            <CheckCircle2 size={18} />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* CARD 2: Content Details */}
            <div className="scheduler-card">
              <h3 className="section-title">
                <div className="flat-badge" style={{ background: accentBg, color: accentColor }}>2</div>
                <Send size={18} style={{ color: accentColor }} />
                <span>Lengkapi Konten</span>
              </h3>

              {postType === 'live' ? (
                <>
                  <div className="input-group">
                    <label className="stat-label">
                      {isAutoLoop ? 'Daftar Judul Live Streaming (Satu per baris - diacak setiap sesi)' : 'Judul Live Streaming'} <span style={{color: 'red'}}>*</span>
                    </label>
                    <textarea 
                      rows={3} 
                      placeholder={isAutoLoop ? 'Masukkan pilihan judul (satu judul per baris). Contoh:\nJudul Pertama {part}\nJudul Kedua {part}' : 'Masukkan judul untuk siaran langsung... (Bisa lebih dari 1 judul. Masukkan 1 judul per baris jika ingin diacak)'}
                      style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontFamily: 'inherit', resize: 'vertical' }}
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="input-group">
                    <label className="stat-label">
                      {isAutoLoop ? 'Deskripsi Live Streaming (Paragraf akan diacak setiap sesi)' : 'Deskripsi Live Streaming'} <span style={{color: 'red'}}>*</span>
                    </label>
                    <textarea 
                      rows={5} 
                      placeholder={isAutoLoop ? 'Tulis deskripsi Anda. Pisahkan dengan baris kosong (double enter) untuk membagi paragraf yang akan diacak posisinya.' : 'Tulis deskripsi siaran langsung Anda...'}
                      style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="input-group">
                    <label className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Teks Intro Ketik (Opsional - Bisa Lebih dari 1 & Diacak)</span>
                      <Info size={14} style={{ color: 'var(--text-muted)' }} title="Teks sambutan bergaya mesin ketik premium selama 20 detik pertama. Anda bisa memasukkan beberapa pilihan teks intro agar diacak sistem untuk setiap sesi siaran." />
                    </label>
                    <textarea 
                      rows={4} 
                      placeholder="Masukkan teks sambutan. Anda bisa memasukkan beberapa alternatif pilihan agar diacak sistem.&#10;&#10;Contoh (Pisahkan pilihan dengan baris kosong ganda):&#10;Welcome to Snoozeland...&#10;Relax, breathe, and enjoy the nature...&#10;&#10;Halo dari Snoozeland...&#10;Selamat menikmati suasana alam yang indah..."
                      style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontFamily: 'inherit', resize: 'vertical' }}
                      value={introText}
                      onChange={(e) => setIntroText(e.target.value)}
                    ></textarea>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label className="stat-label">Mode Stream Key</label>
                      <select
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 1rem' }}
                        value={streamKeyMode}
                        disabled={hasFacebookSelected}
                        onChange={(e) => setStreamKeyMode(e.target.value)}
                      >
                        <option value="auto">Buat Otomatis (Hanya YouTube API)</option>
                        <option value="manual">Masukkan Manual (RTMP)</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="stat-label">Bitrate Streaming</label>
                      <select
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 1rem' }}
                        value={bitrate}
                        onChange={(e) => setBitrate(e.target.value)}
                      >
                        <option value="copy">Original (Tanpa Re-encode)</option>
                        <option value="2500k">2500 Kbps (YouTube Standard)</option>
                        <option value="4000k">4000 Kbps (1080p Standard)</option>
                        <option value="6000k">6000 Kbps (1080p 60fps)</option>
                      </select>
                    </div>
                  </div>

                  {(streamKeyMode === 'manual' || hasFacebookSelected) && (
                    <div className="input-group">
                      <label className="stat-label">Stream Key <span style={{color: 'red'}}>*</span></label>
                      <input 
                        type="password" 
                        placeholder="Masukkan Stream Key Anda (misal: live_12345678_abcdef...)" 
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}
                        value={streamKey}
                        onChange={(e) => setStreamKey(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="input-group" style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <label className="stat-label" style={{ fontWeight: 800, margin: 0 }}>Mode Durasi & Loop Siaran</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.4rem' }}>
                      
                      {/* Opsi 1: Satu Kali Siaran */}
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.75rem', 
                        cursor: 'pointer', 
                        padding: '0.75rem 1rem', 
                        background: '#fff', 
                        border: `2px solid ${(!isUnlimitedDuration && !isAutoLoop) ? '#ef4444' : '#e2e8f0'}`, 
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                      }}>
                        <input 
                          type="radio" 
                          name="loopMode"
                          checked={!isUnlimitedDuration && !isAutoLoop} 
                          onChange={() => {
                            setIsUnlimitedDuration(false);
                            setIsAutoLoop(false);
                            if (liveDuration === '24/7') setLiveDuration('60');
                          }}
                          style={{ marginTop: '0.25rem', accentColor: '#ef4444' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>Satu Kali Siaran (Durasi Terbatas)</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Siaran langsung akan berhenti dan selesai setelah durasi menit yang Anda tentukan habis.</span>
                        </div>
                      </label>

                      {/* Opsi 2: Live 24/7 Non-stop (Single Stream) */}
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.75rem', 
                        cursor: 'pointer', 
                        padding: '0.75rem 1rem', 
                        background: '#fff', 
                        border: `2px solid ${(isUnlimitedDuration && !isAutoLoop) ? '#ef4444' : '#e2e8f0'}`, 
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                      }}>
                        <input 
                          type="radio" 
                          name="loopMode"
                          checked={isUnlimitedDuration && !isAutoLoop} 
                          onChange={() => {
                            setIsUnlimitedDuration(true);
                            setIsAutoLoop(false);
                            setLiveDuration('24/7');
                          }}
                          style={{ marginTop: '0.25rem', accentColor: '#ef4444' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>Live 24/7 Non-stop (Satu Siaran Panjang)</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Menyiarkan video secara berulang-ulang tanpa henti dalam satu sesi siaran langsung yang sama di YouTube.</span>
                        </div>
                      </label>

                      {/* Opsi 3: Loop Live (Metode 1 - Update Metadata Dinamis) */}
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.75rem', 
                        cursor: 'pointer', 
                        padding: '0.75rem 1rem', 
                        background: '#fff', 
                        border: `2px solid ${isAutoLoop ? '#ef4444' : '#e2e8f0'}`, 
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                      }}>
                        <input 
                          type="radio" 
                          name="loopMode"
                          checked={isAutoLoop} 
                          onChange={() => {
                            setIsUnlimitedDuration(false);
                            setIsAutoLoop(true);
                            if (liveDuration === '24/7') setLiveDuration('60');
                          }}
                          style={{ marginTop: '0.25rem', accentColor: '#ef4444' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            Loop Live (Metode 1) <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: 800 }}>Rekomendasi</span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>Menyiarkan secara terus-menerus tanpa putus, dengan otomatis memperbarui judul (acak), deskripsi (acak paragraf), dan tag (acak posisi) secara berkala agar aman dari penalti spam.</span>
                        </div>
                      </label>

                    </div>

                    {!isUnlimitedDuration && (
                      <div style={{ marginTop: '0.8rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.8rem' }}>
                        <label className="stat-label" style={{ fontWeight: 700 }}>
                          {isAutoLoop ? 'Durasi per Sesi Live (Menit)' : 'Atur Durasi Siaran (Menit)'}
                        </label>
                        <input 
                          type="number" 
                          min="10"
                          placeholder={isAutoLoop ? 'Rekomendasi: 60' : 'Misal: 60'} 
                          style={{ marginTop: '0.4rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}
                          value={liveDuration === '24/7' ? '' : liveDuration}
                          onChange={(e) => setLiveDuration(e.target.value)}
                          required
                        />
                        {isAutoLoop && (
                          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, lineHeight: 1.4 }}>
                            * Sistem akan memperbarui Judul, Deskripsi, dan Tag siaran langsung secara otomatis dan acak setiap durasi sesi habis, tanpa memutus live stream.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {hasYoutubeSelected && (
                    <div className="input-group">
                      <label className="stat-label">Judul Video YouTube <span style={{color: 'red'}}>*</span></label>
                      <textarea 
                        rows={3} 
                        placeholder="Masukkan judul video... (Bisa lebih dari 1 judul. Masukkan 1 judul per baris jika ingin diacak)" 
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontFamily: 'inherit', resize: 'vertical' }}
                        value={ytTitle}
                        onChange={(e) => setYtTitle(e.target.value)}
                        required
                      ></textarea>
                    </div>
                  )}
                  
                  <div className="input-group">
                    <label className="stat-label">
                      {hasYoutubeSelected ? 'Deskripsi Video YouTube' : 'Konten Postingan'} <span style={{color: 'red'}}>*</span>
                    </label>
                    <textarea 
                      rows={6} 
                      placeholder={hasYoutubeSelected ? 'Tulis deskripsi video Anda...' : 'Tulis sesuatu yang menarik di sini...'}
                      style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {hasYoutubeSelected && isGenerateVideo && (
                    <div className="input-group">
                      <label className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Teks Intro Ketik (Opsional - Bisa Lebih dari 1 & Diacak)</span>
                        <Info size={14} style={{ color: 'var(--text-muted)' }} title="Teks sambutan bergaya mesin ketik premium selama 20 detik pertama. Anda bisa memasukkan beberapa pilihan teks intro agar diacak sistem untuk setiap sesi siaran." />
                      </label>
                      <textarea 
                        rows={4} 
                        placeholder="Masukkan teks sambutan. Anda bisa memasukkan beberapa alternatif pilihan agar diacak sistem.&#10;&#10;Contoh (Pisahkan pilihan dengan baris kosong ganda):&#10;Welcome to Snoozeland...&#10;Relax, breathe, and enjoy the nature...&#10;&#10;Halo dari Snoozeland...&#10;Selamat menikmati suasana alam yang indah..."
                        style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontFamily: 'inherit', resize: 'vertical' }}
                        value={introText}
                        onChange={(e) => setIntroText(e.target.value)}
                      ></textarea>
                    </div>
                  )}

                  {hasFacebookSelected && (
                    <div className="input-group">
                      <label className="stat-label">Tautan Link Web (Opsional - Clickable Image Link)</label>
                      <input 
                        type="url" 
                        placeholder="https://toko-anda.com/produk" 
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {hasYoutubeSelected && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="stat-label">
                      {isAutoLoop ? 'Tags (Pisahkan dengan koma - posisi tag akan diacak)' : 'Tags (Pisahkan dengan koma)'}
                    </label>
                    <input 
                      type="text" 
                      placeholder="vlog, tutorial, tips" 
                      style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem' }}
                      value={ytTags}
                      onChange={(e) => setYtTags(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label className="stat-label">Kategori YouTube</label>
                      <select 
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 1rem' }}
                        value={ytCategoryId}
                        onChange={(e) => setYtCategoryId(e.target.value)}
                      >
                        <option value="22">Orang & Blog</option>
                        <option value="10">Musik</option>
                        <option value="20">Game</option>
                        <option value="24">Hiburan</option>
                        <option value="27">Pendidikan</option>
                        <option value="28">Sains & Teknologi</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="stat-label">Media Buatan / Altered Content (AI Label)</label>
                      <select 
                        style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 1rem' }}
                        value={ytAlteredContent}
                        onChange={(e) => setYtAlteredContent(e.target.value)}
                      >
                        <option value="yes">Ya (Mengandung konten sintetis/AI)</option>
                        <option value="no">Tidak</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tier Location Translation */}
              <div className="input-group">
                <label className="stat-label">Target Audiens (Tier Location - Auto Translate)</label>
                <select
                  style={{ marginTop: '0.5rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 1rem' }}
                  value={tierLocation}
                  onChange={(e) => setTierLocation(e.target.value)}
                >
                  <option value="none">Bahasa Asli (Tanpa Terjemahan)</option>
                  <option value="tier1">Tier 1: US, UK, CA, AU (Terjemah Inggris - en)</option>
                  <option value="tier2_es">Tier 2: Spanyol & Amerika Latin (Terjemah Spanyol - es)</option>
                  <option value="tier2_pt">Tier 2: Brasil & Portugal (Terjemah Portugis - pt)</option>
                  <option value="tier3_vn">Tier 3: Vietnam (Terjemah Vietnam - vi)</option>
                  <option value="tier3_th">Tier 3: Thailand (Terjemah Thailand - th)</option>
                  <option value="tier3_ph">Tier 3: Filipina (Terjemah Tagalog - tl)</option>
                </select>
              </div>
            </div>

          </div> {/* Close Left Column (scheduler-form-left) */}

          {/* RIGHT COLUMN: Media & Scheduling Settings */}
          <div className="scheduler-form-right">

            {/* CARD 3: Media Configuration */}
            <div className="scheduler-card">
              <h3 className="section-title">
                <div className="flat-badge" style={{ background: accentBg, color: accentColor }}>3</div>
                <UploadCloud size={18} style={{ color: accentColor }} />
                <span>Konfigurasi Media</span>
              </h3>

              {postType === 'post' && hasYoutubeSelected && (
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '1rem 1.2rem', 
                  borderRadius: '16px', 
                  border: `2px solid ${isGenerateVideo ? 'var(--primary)' : '#e2e8f0'}`, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  marginBottom: '1rem'
                }} onClick={() => setIsGenerateVideo(!isGenerateVideo)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                    <span style={{ fontWeight: 800, color: isGenerateVideo ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🎥 Generate Video secara Otomatis
                    </span>
                    <span style={{ fontSize: '0.75rem', color: isGenerateVideo ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 500, lineHeight: '1.4' }}>
                      Otomatis mengacak video, mencampur backsound, menambahkan watermark, dan intro dengan metadata unik (Filmora style) sebelum diunggah ke YouTube.
                    </span>
                  </div>
                  <label className="switch-container" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="switch-input"
                      checked={isGenerateVideo} 
                      onChange={(e) => setIsGenerateVideo(e.target.checked)} 
                    />
                    <span className="switch-slider" style={{ backgroundColor: isGenerateVideo ? 'var(--primary)' : '#cbd5e1' }} />
                  </label>
                </div>
              )}

              {postType === 'post' && hasYoutubeSelected && isGenerateVideo && (
                <div style={{ 
                  background: '#f0fdf4', 
                  padding: '1rem 1.2rem', 
                  borderRadius: '16px', 
                  border: `2px solid ${dryRun ? '#10b981' : '#e2e8f0'}`, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  marginBottom: '1rem'
                }} onClick={() => setDryRun(!dryRun)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                    <span style={{ fontWeight: 800, color: dryRun ? '#10b981' : 'var(--text-main)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🧪 Mode Simulasi (Dry Run)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: dryRun ? '#10b981' : 'var(--text-muted)', fontWeight: 500, lineHeight: '1.4' }}>
                      Aktifkan untuk menguji rendering video secara lengkap tanpa mengunggah ke YouTube. Video final akan disimpan langsung ke folder komputer lokal Anda untuk menghemat kuota YouTube API harian.
                    </span>
                  </div>
                  <label className="switch-container" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="switch-input"
                      checked={dryRun} 
                      onChange={(e) => setDryRun(e.target.checked)} 
                    />
                    <span className="switch-slider" style={{ backgroundColor: dryRun ? '#10b981' : '#cbd5e1' }} />
                  </label>
                </div>
              )}

              {postType === 'live' || (postType === 'post' && isGenerateVideo) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Main Video Selector */}
                  <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem' }}>Sumber Video Utama</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: randomVideo ? '#10b981' : 'var(--text-muted)' }}>Video Acak (Random)</span>
                        <label className="switch-container">
                          <input 
                            type="checkbox" 
                            className="switch-input"
                            checked={randomVideo} 
                            onChange={(e) => setRandomVideo(e.target.checked)} 
                          />
                          <span className="switch-slider" />
                        </label>
                      </div>
                    </div>

                    {!randomVideo ? (
                      <div>
                        {mediaUrl ? (
                          /* Video Selected Preview Card */
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            background: '#fff', 
                            border: '2px solid #e2e8f0', 
                            padding: '1rem', 
                            borderRadius: '16px', 
                            gap: '1rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden', flex: 1 }}>
                              <div style={{ 
                                width: '48px', 
                                height: '48px', 
                                borderRadius: '10px', 
                                background: '#eef2ff', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Video size={20} color="var(--primary)" />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                                <span style={{ 
                                  fontSize: '0.85rem', 
                                  fontWeight: 800, 
                                  color: 'var(--text-main)',
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap'
                                }} title={mediaList.find(m => m.mediaUrl === mediaUrl)?.fileName || 'Video Terpilih'}>
                                  {mediaList.find(m => m.mediaUrl === mediaUrl)?.fileName || 'Video Terpilih'}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  Format Video • Siap disiarkan
                                </span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setMediaUrl('')} 
                              style={{ 
                                border: 'none', 
                                background: '#fee2e2', 
                                cursor: 'pointer', 
                                color: '#ef4444', 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                transition: 'background-color 0.2s',
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          /* Empty Video Selector Area */
                          <div style={{ 
                            border: '2px dashed #fca5a5', 
                            borderRadius: '16px', 
                            padding: '2rem 1rem', 
                            background: '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                          }}>
                            <div style={{ 
                              width: '56px', 
                              height: '56px', 
                              borderRadius: '50%', 
                              background: '#fef2f2', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: '#ef4444'
                            }}>
                              <Video size={28} />
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>Belum ada video siaran</p>
                              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Silakan pilih dari pustaka atau unggah file video Anda</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', width: '100%', maxWidth: '320px', justifyContent: 'center' }}>
                              <button 
                                type="button" 
                                className="btn" 
                                style={{ 
                                  flex: 1,
                                  justifyContent: 'center',
                                  padding: '0.5rem 0.8rem', 
                                  background: '#fef2f2', 
                                  color: '#ef4444', 
                                  borderRadius: '10px', 
                                  fontSize: '0.78rem', 
                                  height: '38px', 
                                  border: 'none', 
                                  fontWeight: 700, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.4rem', 
                                  cursor: 'pointer' 
                                }}
                                onClick={() => openSelectorModal('video')}
                              >
                                <Video size={14} /> Pustaka Video
                              </button>
                              <label className="btn" style={{ 
                                flex: 1,
                                justifyContent: 'center',
                                padding: '0.5rem 0.8rem', 
                                border: '1px solid #cbd5e1', 
                                cursor: 'pointer', 
                                borderRadius: '10px', 
                                background: '#fff', 
                                fontSize: '0.78rem', 
                                height: '38px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.4rem', 
                                fontWeight: 700, 
                                margin: 0 
                              }}>
                                <UploadCloud size={14} style={{ color: 'var(--text-muted)' }} /> Unggah Baru
                                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleInlineUpload(e, 'video', (url) => setMediaUrl(url))} />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Random Video Enabled State */
                      <div style={{ 
                        padding: '1.2rem', 
                        background: '#ecfdf5', 
                        borderRadius: '16px', 
                        border: '2px solid #a7f3d0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem' 
                      }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          background: '#d1fae5', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#059669',
                          flexShrink: 0
                        }}>
                          <CheckCircle2 size={20} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857' }}>Video Acak Aktif</span>
                          <span style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: 600 }}>
                            Sistem akan otomatis memilih video acak dari Pustaka Media Anda setiap kali siaran dimulai.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backsound Selector */}
                  <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem' }}>Backsound Audio (MP3)</span>
                      
                      {/* Premium Segmented Controls (Tabs Style) */}
                      <div style={{ 
                        display: 'flex', 
                        background: '#f1f5f9', 
                        padding: '0.3rem', 
                        borderRadius: '12px',
                        gap: '0.2rem'
                      }}>
                        {[
                          { mode: 'none', label: '🔇 Tanpa Audio' },
                          { mode: 'select', label: '🎵 Pilih Musik' },
                          { mode: 'random', label: '🔀 Musik Acak' }
                        ].map(opt => {
                          const isSelected = backsoundMode === opt.mode;
                          return (
                            <button
                              key={opt.mode}
                              type="button"
                              onClick={() => setBacksoundMode(opt.mode)}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.2rem',
                                border: 'none',
                                background: isSelected ? '#fff' : 'transparent',
                                color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                                fontWeight: 700,
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {backsoundMode === 'select' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {selectedBacksoundUrls.length > 0 ? (
                          /* Backsound Selected List */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedBacksoundUrls.map((url, idx) => (
                              <div key={idx} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: '#fff', 
                                border: '2px solid #e2e8f0', 
                                padding: '0.8rem 1rem', 
                                borderRadius: '12px',
                                gap: '0.8rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden', flex: 1 }}>
                                  <Volume2 size={16} color="#d97706" style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {mediaList.find(m => m.mediaUrl === url)?.fileName || 'Audio Terpilih'}
                                  </span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setSelectedBacksoundUrls(prev => prev.filter(u => u !== url))} 
                                  style={{ 
                                    border: 'none', 
                                    background: '#fef3c7', 
                                    cursor: 'pointer', 
                                    color: '#d97706', 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%'
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <button 
                                type="button" 
                                className="btn" 
                                style={{ flex: 1, justifyContent: 'center', padding: '0.4rem 0.8rem', background: '#fffdf5', color: '#d97706', borderRadius: '10px', fontSize: '0.78rem', height: '36px', border: '1px solid #fef08a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                                onClick={() => openSelectorModal('backsound')}
                              >
                                <Music size={14} /> Tambah Musik
                              </button>
                              <label className="btn" style={{ flex: 1, justifyContent: 'center', padding: '0.4rem 0.8rem', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '10px', background: '#fff', fontSize: '0.78rem', height: '36px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, margin: 0 }}>
                                <UploadCloud size={14} style={{ color: 'var(--text-muted)' }} /> Unggah Lagu
                                <input type="file" accept="audio/mp3,audio/*" style={{ display: 'none' }} onChange={(e) => handleInlineUpload(e, 'musik', (url) => setSelectedBacksoundUrls(prev => [...prev, url]))} />
                              </label>
                            </div>
                          </div>
                        ) : (
                          /* Empty Backsound Selector */
                          <div style={{ 
                            border: '2px dashed #cbd5e1', 
                            borderRadius: '16px', 
                            padding: '1.5rem 1rem', 
                            background: '#fff',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.8rem',
                          }}>
                            <div style={{ 
                              width: '48px', 
                              height: '48px', 
                              borderRadius: '50%', 
                              background: '#f1f5f9', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: 'var(--text-muted)'
                            }}>
                              <Music size={22} />
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-main)' }}>Belum ada musik terpilih</p>
                              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Backsound MP3 akan diputar berulang sebagai suara latar video</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '280px', justifyContent: 'center' }}>
                              <button 
                                type="button" 
                                className="btn" 
                                style={{ flex: 1, justifyContent: 'center', padding: '0.4rem 0.6rem', background: '#fffbeb', color: '#d97706', borderRadius: '8px', fontSize: '0.75rem', height: '34px', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                                onClick={() => openSelectorModal('backsound')}
                              >
                                <Music size={12} /> Pustaka Musik
                              </button>
                              <label className="btn" style={{ flex: 1, justifyContent: 'center', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '8px', background: '#fff', fontSize: '0.75rem', height: '34px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, margin: 0 }}>
                                <UploadCloud size={12} style={{ color: 'var(--text-muted)' }} /> Unggah MP3
                                <input type="file" accept="audio/mp3,audio/*" style={{ display: 'none' }} onChange={(e) => handleInlineUpload(e, 'musik', (url) => setSelectedBacksoundUrls(prev => [...prev, url]))} />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {backsoundMode === 'random' && (
                      <div style={{ 
                        padding: '1rem', 
                        background: '#fffdf5', 
                        borderRadius: '16px', 
                        border: '2px solid #fef08a', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.8rem' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: '#fef3c7', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#d97706',
                            flexShrink: 0
                          }}>
                            <Volume2 size={16} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309' }}>Backsound Acak Aktif</span>
                            <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Lagu diputar acak dari pustaka media Anda.</span>
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          background: '#fff',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '10px',
                          border: '1px solid #fef08a'
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>Jumlah lagu acak:</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="20" 
                            value={randomMusicCount} 
                            onChange={(e) => setRandomMusicCount(e.target.value)}
                            style={{ 
                              width: '60px', 
                              textAlign: 'center', 
                              background: '#f8fafc', 
                              border: '1px solid #cbd5e1', 
                              borderRadius: '8px', 
                              height: '28px', 
                              padding: 0,
                              fontWeight: 700,
                              color: 'var(--text-main)'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Watermark Selector */}
                  <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem', display: 'block', marginBottom: '0.8rem' }}>Gambar Watermark (Stamp - Opsional)</span>
                    
                    {imageStampUrl ? (
                      /* Watermark Selected Preview Card */
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: '#fff', 
                        border: '2px solid #e2e8f0', 
                        padding: '1rem', 
                        borderRadius: '16px', 
                        gap: '1rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden', flex: 1 }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '10px', 
                            background: '#ecfdf5', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <img src={getDirectLink(imageStampUrl)} alt="Stamp" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'contain' }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                              Watermark Stamp Aktif
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                              Siap ditumpuk di atas pojok video siaran
                            </span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setImageStampUrl('')} 
                          style={{ 
                            border: 'none', 
                            background: '#fee2e2', 
                            cursor: 'pointer', 
                            color: '#ef4444', 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      /* Empty Watermark Box */
                      <div style={{ 
                        border: '2px dashed #cbd5e1', 
                        borderRadius: '16px', 
                        padding: '1.5rem 1rem', 
                        background: '#fff',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem',
                      }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Tidak ada watermark aktif</p>
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '280px', justifyContent: 'center' }}>
                          <button 
                            type="button" 
                            className="btn" 
                            style={{ flex: 1, justifyContent: 'center', padding: '0.4rem 0.6rem', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '0.75rem', height: '34px', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                            onClick={() => openSelectorModal('stamp')}
                          >
                            <ImageIcon size={12} /> Pustaka
                          </button>
                          <label className="btn" style={{ flex: 1, justifyContent: 'center', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '8px', background: '#fff', fontSize: '0.75rem', height: '34px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, margin: 0 }}>
                            <UploadCloud size={12} style={{ color: 'var(--text-muted)' }} /> Unggah Baru
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleInlineUpload(e, 'gambar', (url) => setImageStampUrl(url))} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {postType === 'post' && isGenerateVideo && (
                    <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '0.4rem' }}>
                      <label className="stat-label" style={{ fontWeight: 800 }}>Durasi Video Hasil Generate (Menit)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="180"
                        placeholder="Misal: 5" 
                        style={{ marginTop: '0.4rem', background: '#fff', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 1rem', fontWeight: 700 }}
                        value={postDuration}
                        onChange={(e) => setPostDuration(e.target.value)}
                        required
                      />
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Tentukan durasi akhir video yang akan dibuat. Sistem akan mengulang (loop) video utama dan backsounds secara seamless hingga mencapai durasi ini.
                      </p>
                    </div>
                  )}

                </div>
              ) : (
                /* Post Media Selector */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>Pilih Media Postingan (Gambar/Video)</span>
                  
                  {mediaUrl ? (
                    /* Media Selected Preview Card */
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: '#f8fafc', 
                      border: '2px solid #e2e8f0', 
                      padding: '1rem', 
                      borderRadius: '16px', 
                      gap: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden', flex: 1 }}>
                        <div style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '10px', 
                          background: isVideo(mediaUrl) ? '#eef2ff' : '#ecfdf5', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isVideo(mediaUrl) ? <Video size={20} color="var(--primary)" /> : <FileImage size={20} color="#10b981" />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 800, 
                            color: 'var(--text-main)',
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap'
                          }} title={mediaList.find(m => m.mediaUrl === mediaUrl)?.fileName || 'Media Terpilih'}>
                            {mediaList.find(m => m.mediaUrl === mediaUrl)?.fileName || 'Media Terpilih'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {isVideo(mediaUrl) ? 'Format Video' : 'Format Gambar'} • Siap dipublikasikan
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setMediaUrl('')} 
                        style={{ 
                          border: 'none', 
                          background: '#fee2e2', 
                          cursor: 'pointer', 
                          color: '#ef4444', 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    /* Empty Media Upload Area */
                    <div style={{ 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '16px', 
                      padding: '2rem 1rem', 
                      background: '#f8fafc',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                    }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        background: '#f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--text-muted)'
                      }}>
                        <UploadCloud size={28} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>Belum ada media terpilih</p>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Silakan pilih dari pustaka atau unggah file baru Anda</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', width: '100%', maxWidth: '320px', justifyContent: 'center' }}>
                        <button 
                          type="button" 
                          className="btn" 
                          style={{ 
                            flex: 1,
                            justifyContent: 'center',
                            padding: '0.5rem 0.8rem', 
                            background: '#eef2ff', 
                            color: 'var(--primary)', 
                            borderRadius: '10px', 
                            fontSize: '0.78rem', 
                            height: '38px', 
                            border: 'none', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem', 
                            cursor: 'pointer' 
                          }}
                          onClick={() => openSelectorModal('postMedia')}
                        >
                          <Grid size={14} /> Pustaka Media
                        </button>
                        <label className="btn" style={{ 
                          flex: 1,
                          justifyContent: 'center',
                          padding: '0.5rem 0.8rem', 
                          border: '1px solid #cbd5e1', 
                          cursor: 'pointer', 
                          borderRadius: '10px', 
                          background: '#fff', 
                          fontSize: '0.78rem', 
                          height: '38px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          fontWeight: 700, 
                          margin: 0 
                        }}>
                          <UploadCloud size={14} style={{ color: 'var(--text-muted)' }} /> Unggah Baru
                          <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleInlineUpload(e, isVideo(e.target.files[0]?.name) ? 'video' : 'gambar', (url) => setMediaUrl(url))} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Custom YouTube Thumbnail Selector */}
              {hasYoutubeSelected && (
                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>Thumbnail Kustom YouTube (Opsional)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: randomThumbnail ? '#10b981' : 'var(--text-muted)' }}>Thumbnail Acak (Random)</span>
                      <label className="switch-container">
                        <input 
                          type="checkbox" 
                          className="switch-input"
                          checked={randomThumbnail} 
                          onChange={(e) => setRandomThumbnail(e.target.checked)} 
                        />
                        <span className="switch-slider" />
                      </label>
                    </div>
                  </div>
                  
                  {!randomThumbnail ? (
                    ytThumbnailUrl ? (
                      /* Custom Thumbnail Active Preview */
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: '#fffdf5', 
                        border: '2px solid #fef08a', 
                        padding: '1rem', 
                        borderRadius: '12px', 
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden', flex: 1 }}>
                          <img src={getDirectLink(ytThumbnailUrl)} alt="Thumbnail" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Thumbnail Kustom Aktif
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>
                              Siap diunggah sebagai cover siaran
                            </span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setYtThumbnailUrl('')} 
                          style={{ 
                            border: 'none', 
                            background: '#fef3c7', 
                            cursor: 'pointer', 
                            color: '#d97706', 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      /* Default/Automatic Thumbnail Selection */
                      <div style={{ 
                        border: '2px dashed #e2e8f0', 
                        borderRadius: '12px', 
                        padding: '1.5rem 1rem', 
                        background: '#fff',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Menggunakan Thumbnail Otomatis (Default)</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          Youtube akan otomatis memilih cuplikan gambar dari video Anda sebagai cover.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '280px', justifyContent: 'center', marginTop: '0.2rem' }}>
                          <button 
                            type="button" 
                            className="btn" 
                            style={{ 
                              flex: 1,
                              justifyContent: 'center',
                              padding: '0.4rem 0.6rem', 
                              background: '#fffbeb', 
                              color: '#d97706', 
                              borderRadius: '8px', 
                              fontSize: '0.75rem', 
                              height: '34px', 
                              border: 'none', 
                              fontWeight: 700, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.3rem', 
                              cursor: 'pointer' 
                            }}
                            onClick={() => openSelectorModal('thumbnail')}
                          >
                            <ImageIcon size={12} /> Pustaka
                          </button>
                          <label className="btn" style={{ 
                            flex: 1,
                            justifyContent: 'center',
                            padding: '0.4rem 0.6rem', 
                            border: '1px solid #cbd5e1', 
                            cursor: 'pointer', 
                            borderRadius: '8px', 
                            background: '#fff', 
                            fontSize: '0.75rem', 
                            height: '34px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.3rem', 
                            fontWeight: 700, 
                            margin: 0 
                          }}>
                            <UploadCloud size={12} style={{ color: 'var(--text-muted)' }} /> Unggah Baru
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleInlineUpload(e, 'gambar', (url) => setYtThumbnailUrl(url))} />
                          </label>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Random Thumbnail Enabled State */
                    <div style={{ 
                      padding: '1.2rem', 
                      background: '#ecfdf5', 
                      borderRadius: '12px', 
                      border: '2px solid #a7f3d0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem' 
                    }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: '#d1fae5', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#059669',
                        flexShrink: 0
                      }}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#047857' }}>Thumbnail Acak Aktif</span>
                        <span style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: 600 }}>
                          Sistem akan otomatis memilih gambar acak dari Pustaka Media Anda untuk dijadikan cover siaran langsung YouTube.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CARD 4: Publication Schedule */}
            <div className="scheduler-card">
              <h3 className="section-title">
                <div className="flat-badge" style={{ background: accentBg, color: accentColor }}>4</div>
                <Calendar size={18} style={{ color: accentColor }} />
                <span>Jadwal Publikasi</span>
              </h3>

              <div 
                onClick={() => setIsRecurring(!isRecurring)}
                style={{ 
                  background: isRecurring ? '#f0fdf4' : '#f8fafc', 
                  padding: '1.2rem', 
                  borderRadius: '16px', 
                  border: `2px solid ${isRecurring ? '#bbf7d0' : '#e2e8f0'}`, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isRecurring ? '0 4px 12px rgba(34, 197, 94, 0.05)' : 'none'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                  <span style={{ fontWeight: 800, color: isRecurring ? '#15803d' : 'var(--text-main)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Jadwal Berulang (Weekly)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: isRecurring ? '#166534' : 'var(--text-muted)', fontWeight: 500, lineHeight: '1.4' }}>
                    Otomatis diulang setiap minggunya pada hari dan jam siaran yang ditentukan di bawah.
                  </span>
                </div>
                <label className="switch-container" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="switch-input"
                    checked={isRecurring} 
                    onChange={(e) => setIsRecurring(e.target.checked)} 
                  />
                  <span className="switch-slider" />
                </label>
              </div>

              {isRecurring ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="stat-label" style={{ marginBottom: '0.5rem' }}>Pilih Hari Siaran</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {dayOptions.map(day => {
                        const active = daysOfWeek.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDayOfWeek(day.value)}
                            style={{
                              border: 'none',
                              padding: '0.5rem 0.8rem',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: active ? accentColor : '#f1f5f9',
                              color: active ? '#fff' : 'var(--text-muted)',
                              transition: '0.15s',
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="stat-label">Waktu Siaran (GMT+7)</label>
                    <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                      <input 
                        type="time" 
                        value={scheduledTime} 
                        onChange={e => setScheduledTime(e.target.value)} 
                        style={{ background: '#fff', width: '100%', border: '1px solid #e2e8f0', paddingLeft: '2.2rem', borderRadius: '12px', height: '44px' }} 
                        required={isRecurring}
                      />
                      <Clock size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="stat-label">Pilih Tanggal</label>
                    <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        style={{ background: '#fff', width: '100%', border: '1px solid #e2e8f0', paddingLeft: '2.2rem', borderRadius: '12px', height: '44px' }} 
                        required={!isRecurring}
                      />
                      <Calendar size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="stat-label">Pilih Jam</label>
                    <div style={{ position: 'relative', marginTop: '0.4rem' }}>
                      <input 
                        type="time" 
                        value={time} 
                        onChange={e => setTime(e.target.value)} 
                        style={{ background: '#fff', width: '100%', border: '1px solid #e2e8f0', paddingLeft: '2.2rem', borderRadius: '12px', height: '44px' }} 
                        required={!isRecurring}
                      />
                      <Clock size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
              <button 
                type="submit" 
                className={`btn ${postType === 'live' ? 'btn-danger' : 'btn-primary'}`} 
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  padding: '1.1rem', 
                  fontSize: '0.95rem', 
                  borderRadius: '16px',
                  height: '52px',
                  background: accentColor,
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: `0 10px 15px -3px ${postType === 'live' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`
                }}
                disabled={uploading}
              >
                {uploading ? 'Memproses...' : (
                  <>
                    <Send size={18} />
                    <span>{editPost ? 'Simpan Perubahan' : 'Jadwalkan Siaran Sekarang'}</span>
                  </>
                )}
              </button>

              {editPost && (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="btn"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '1.1rem',
                      fontSize: '0.95rem',
                      borderRadius: '16px',
                      height: '52px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)'
                    }}
                    disabled={uploading}
                  >
                    <Copy size={18} />
                    <span>Simpan Sebagai Duplikat</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="btn"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '1.1rem',
                      fontSize: '0.95rem',
                      borderRadius: '16px',
                      height: '52px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Batal Edit
                  </button>
                </>
              )}
            </div>

          </div> {/* Close Right Column (scheduler-form-right) */}

        </div>
      </form>

      {/* MEDIA SELECTION MODAL FROM PUSTAKA */}
      {showMediaModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '2rem' }} onClick={() => setShowMediaModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, background: '#ffffff', position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Pilih dari Pustaka Media</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Menampilkan file yang tersimpan di pustaka media</p>
              </div>
              <button 
                onClick={() => setShowMediaModal(false)}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid" style={{ overflowY: 'auto', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', padding: '2rem' }}>
              {(() => {
                const items = getMediaListByModalType();
                
                if (items.length === 0) {
                  return (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '16px', border: '2px dashed var(--border-color)' }}>
                      <ImageIcon size={64} style={{ opacity: 0.1, margin: '0 auto 1.5rem', color: 'var(--primary)' }} />
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Belum ada media di kategori ini</h4>
                      <p style={{ fontSize: '0.9rem' }}>Silakan unggah file media terlebih dahulu melalui menu Media Library atau tombol Unggah Baru.</p>
                    </div>
                  );
                }

                return items.map(item => {
                  const isVid = item.category === 'video';
                  const isAud = item.category === 'musik';
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (mediaModalType === 'video' || mediaModalType === 'postMedia') {
                          setMediaUrl(item.mediaUrl);
                        } else if (mediaModalType === 'backsound') {
                          if (!selectedBacksoundUrls.includes(item.mediaUrl)) {
                            setSelectedBacksoundUrls(prev => [...prev, item.mediaUrl]);
                          }
                        } else if (mediaModalType === 'stamp') {
                          setImageStampUrl(item.mediaUrl);
                        } else if (mediaModalType === 'thumbnail') {
                          setYtThumbnailUrl(item.mediaUrl);
                        }
                        setShowMediaModal(false);
                      }}
                      style={{ cursor: 'pointer', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', background: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', transition: '0.3s' }}
                      className="media-card-hover"
                    >
                      <div style={{ height: '130px', background: '#f1f5f9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {isVid ? (
                          <div style={{ width: '100%', height: '100%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Video color="var(--primary)" size={40} opacity={0.6} />
                          </div>
                        ) : isAud ? (
                          <div style={{ width: '100%', height: '100%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Music color="#d97706" size={40} opacity={0.6} />
                          </div>
                        ) : (
                          <img src={getDirectLink(item.mediaUrl)} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div style={{ padding: '0.8rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>
                          {item.fileName || 'Media Pustaka'}
                        </div>
                      </div>
                    </div>
                  );
                })
              })()}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
              .media-card-hover:hover {
                transform: translateY(-4px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
                border-color: var(--primary) !important;
              }
            `}} />
          </div>
        </div>,
        document.body
      )}

      {/* UPLOADING PROGRESS OVERLAY */}
      {uploading && createPortal(
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          background: 'rgba(15, 23, 42, 0.65)', 
          backdropFilter: 'blur(10px)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            color: 'var(--text-main)',
            padding: '3rem 2.5rem',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            width: '100%',
            maxWidth: '460px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ position: 'relative', marginBottom: '2rem', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', border: '5px solid #f1f5f9', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }}></div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {uploadProgress}%
              </div>
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
              {uploadStage || 'Menyimpan Jadwal...'}
            </h3>
            
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#f1f5f9', 
              borderRadius: '999px', 
              overflow: 'hidden', 
              margin: '1.5rem 0',
              border: '1px solid #e2e8f0',
              position: 'relative'
            }}>
              <div style={{ 
                width: `${uploadProgress}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))', 
                borderRadius: '999px',
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}></div>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, lineHeight: '1.6', margin: 0 }}>
              Proses sedang berjalan. Mohon jangan tutup halaman ini.
            </p>
          </div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>,
        document.body
      )}

      {/* ALERT MODAL */}
      {createPortal(
        <AnimatePresence>
          {alertModal.show && (
            <div style={{ 
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
              background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 
            }}>
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="card" 
                style={{ width: '450px', padding: '2.5rem', textAlign: 'center', border: 'none', background: '#fff', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}
              >
                <div style={{ width: '64px', height: '64px', background: '#fffbeb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#d97706', border: '1px solid #fde68a' }}>
                  <Info size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                  {alertModal.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6', fontWeight: 500 }}>
                  {alertModal.message}
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '0.9rem', borderRadius: '14px' }}
                  onClick={() => setAlertModal({ show: false, title: '', message: '' })}
                >
                  Mengerti
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default Scheduler;
