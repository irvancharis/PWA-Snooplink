import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Play, Pause, Film, Music, Type, Image as ImageIcon, Save, Trash2, Copy,
  Download, Send, Settings, Sparkles, Sliders, Scissors, Video, HelpCircle, Folder,
  Maximize, Minimize, Eye, EyeOff, Volume2, VolumeX, MoveUp, MoveDown, Plus, Minus
} from 'lucide-react';

// Media Helper Functions
const isVideoItem = (item) => {
  if (item.mediaType?.startsWith('video/')) return true;
  if (item.category === 'video') return true;
  const url = item.mediaUrl;
  if (!url) return false;
  return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg|mov|quicktime)(\?.*)?$/i);
};

const isAudioItem = (item) => {
  if (item.mediaType?.startsWith('audio/')) return true;
  if (item.category === 'musik') return true;
  const url = item.mediaUrl;
  if (!url) return false;
  return url.match(/\.(mp3|wav|ogg|aac|m4a)(\?.*)?$/i);
};

const getDirectLink = (url) => {
  if (!url) return '';
  try {
    if (url.includes('drive.google.com')) {
      let id = null;
      if (url.includes('id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) id = match[1];
      } else {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) id = match[1];
      }
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
      }
    }
  } catch (e) { console.error("URL Error", e); }
  return url;
};

// Convert Google Drive links to streaming URLs that bypass virus scan pages and download attachment headers
const getStreamingUrl = (url) => {
  if (!url) return '';
  try {
    if (url.includes('drive.google.com')) {
      let id = null;
      if (url.includes('id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) id = match[1];
      } else {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) id = match[1];
      }
      if (id) {
        return `https://drive.google.com/uc?id=${id}`;
      }
    }
  } catch (e) { console.error("getStreamingUrl Error", e); }
  return url;
};

// Helper to get media duration asynchronously and reliably
const getMediaDuration = (url, isVideo) => {
  return new Promise((resolve) => {
    const temp = document.createElement(isVideo ? 'video' : 'audio');
    temp.src = getStreamingUrl(url);
    temp.preload = 'metadata';
    
    // Prevent garbage collection
    if (!window._loadingMedia) window._loadingMedia = [];
    window._loadingMedia.push(temp);
    
    const cleanUp = () => {
      if (window._loadingMedia) {
        window._loadingMedia = window._loadingMedia.filter(el => el !== temp);
      }
    };

    temp.onloadedmetadata = () => {
      resolve(temp.duration || null);
      cleanUp();
    };
    temp.onerror = () => {
      resolve(null);
      cleanUp();
    };
    setTimeout(() => {
      resolve(null);
      cleanUp();
    }, 10000);
    
    temp.load();
  });
};

// Premium CapCut/Filmora Style Stickers
const PREMIUM_STICKERS = [
  { name: 'Flame 🔥', url: 'https://img.icons8.com/fluency/96/fire.png' },
  { name: 'Sunglasses 😎', url: 'https://img.icons8.com/fluency/96/cool.png' },
  { name: 'Sparkles ✨', url: 'https://img.icons8.com/fluency/96/sparkles.png' },
  { name: 'Heart ❤️', url: 'https://img.icons8.com/fluency/96/like--v1.png' },
  { name: 'Thumbs Up 👍', url: 'https://img.icons8.com/fluency/96/thumb-up.png' },
  { name: 'Subscribe 🔴', url: 'https://img.icons8.com/fluency/96/youtube-play.png' },
  { name: 'Wow 😮', url: 'https://img.icons8.com/fluency/96/wow-emoticon.png' },
  { name: 'Target 🎯', url: 'https://img.icons8.com/fluency/96/bullseye.png' },
  { name: 'Star ⭐', url: 'https://img.icons8.com/fluency/96/star.png' },
  { name: 'Party 🎉', url: 'https://img.icons8.com/fluency/96/party-popper.png' },
  { name: 'Arrow Red 🏹', url: 'https://img.icons8.com/fluency/96/arrow.png' },
  { name: 'Surprised 😲', url: 'https://img.icons8.com/fluency/96/surprised.png' }
];

const VideoEditor = ({ mediaList = [], onUploadMedia, onUseMedia, user }) => {
  // Fullscreen & Container Ref
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Preview elements & state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9', '9:16', '1:1'
  const [videoFilter, setVideoFilter] = useState('none'); // filters

  // Hidden Canvas Ref for exporting
  const canvasRef = useRef(null);

  // Audio settings
  const audioCtxRef = useRef(null);
  const previewGainRef = useRef(null);
  const recordGainRef = useRef(null);
  const recordDestRef = useRef(null);
  const sourceNodesRef = useRef(new Map());

  // Multi-Scene / Sequential Video Tracks State
  const [scenes, setScenes] = useState([
    // Each scene: { id, type, url, name, duration }
  ]);

  // Multi-Track Background Audio State
  const [audioTracks, setAudioTracks] = useState([
    // Each track: { id, url, name, startTime, endTime, volume }
  ]);

  // Overlay Watermark State
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayConfig, setOverlayConfig] = useState({ x: 80, y: 15, width: 15, opacity: 0.8 }); // percentage-based

  // Teks tracks State
  const [textTracks, setTextTracks] = useState([
    { id: 1, text: 'Snooplink Video Editor', startTime: 1, endTime: 6, x: 50, y: 80, size: 28, color: '#ffffff', outlineColor: '#000000' }
  ]);
  const [selectedTextId, setSelectedTextId] = useState(1);
  const [selectedAudioId, setSelectedAudioId] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [stickerTracks, setStickerTracks] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);

  // Layer Visibility
  const [showMainLayer, setShowMainLayer] = useState(true);
  const [showOverlayLayer, setShowOverlayLayer] = useState(true);

  // Loaded HTML Elements references (used to play, sync, and draw frames)
  const videoElRef = useRef(null);
  const audioElementsRef = useRef({});

  // Firestore Templates State
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('My Template');
  const [activeTab, setActiveTab] = useState('media'); // 'media', 'text', 'layers', 'filters', 'templates'
  const [mediaLibraryTab, setMediaLibraryTab] = useState('all'); // 'all', 'video', 'music', 'image'
  const [rendering, setRendering] = useState(false);
  const renderingRef = useRef(false);
  renderingRef.current = rendering;

  const initAudioRouting = () => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const previewGain = ctx.createGain();
      previewGain.gain.value = 1;
      previewGain.connect(ctx.destination);
      previewGainRef.current = previewGain;

      const recordDest = ctx.createMediaStreamDestination();
      recordDestRef.current = recordDest;

      const recordGain = ctx.createGain();
      recordGain.gain.value = 0;
      recordGain.connect(recordDest);
      recordGainRef.current = recordGain;
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  };

  const routeElementAudio = (el) => {
    if (!el) return;
    initAudioRouting();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (!sourceNodesRef.current.has(el)) {
      try {
        const source = ctx.createMediaElementSource(el);
        source.connect(previewGainRef.current);
        source.connect(recordGainRef.current);
        sourceNodesRef.current.set(el, source);
      } catch (err) {
        console.warn("Failed to route element audio:", err);
      }
    }
  };

  const [renderProgress, setRenderProgress] = useState(0);

  // Multi-select library assets state
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);

  // Drag and Drop State
  const dragStartRef = useRef(null);

  // Calculate Scene Start and End bounds
  let accumulatedTime = 0;
  const scenesWithBounds = scenes.map(scene => {
    const start = scene.startTime !== undefined ? scene.startTime : accumulatedTime;
    const end = scene.endTime !== undefined ? scene.endTime : (start + (scene.duration || 5));
    accumulatedTime = end;
    return { ...scene, startTime: start, endTime: end, duration: end - start };
  });

  // Calculate dynamic total composition duration
  const getCompositionDuration = () => {
    const maxSceneEnd = scenesWithBounds.reduce((max, s) => Math.max(max, s.endTime), 0);
    const maxAudioEnd = audioTracks.reduce((max, t) => Math.max(max, t.endTime), 0);
    const maxTextEnd = textTracks.reduce((max, t) => Math.max(max, t.endTime), 0);
    
    // Auto-adjust composition length to fit everything. Default minimum is 15s.
    const maxTime = Math.max(15, maxSceneEnd, maxAudioEnd, maxTextEnd);
    return Math.round(maxTime * 10) / 10;
  };

  const duration = getCompositionDuration();

  const activeScene = [...scenesWithBounds].reverse().find(s => currentTime >= s.startTime && currentTime <= s.endTime) || null;

  // Load templates on mount
  useEffect(() => {
    if (!user) return;
    const fetchTemplates = async () => {
      try {
        const q = query(collection(db, 'video_templates'), where('userId', '==', user.id));
        const snap = await getDocs(q);
        setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    };
    fetchTemplates();
  }, [user]);

  // Sync active video playback
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;

    if (activeScene && activeScene.type === 'video') {
      const targetTime = currentTime - activeScene.startTime;
      const actualTarget = activeScene.reverse 
        ? Math.max(0, (activeScene.duration || 5) - targetTime)
        : Math.max(0, targetTime);

      // Update source if changed
      const streamingUrl = getStreamingUrl(activeScene.url);
      if (el.src !== streamingUrl) {
        el.src = streamingUrl;
        el.load();
        el.currentTime = actualTarget;
      }

      // Sync mute status
      el.muted = activeScene.muted || false;

      // Sync play/pause state
      if (activeScene.reverse) {
        if (!el.paused) {
          el.pause();
        }
      } else {
        if (isPlaying) {
          if (el.paused) {
            el.play().catch(e => {});
          }
        } else {
          if (!el.paused) {
            el.pause();
          }
        }
      }

      // Sync current time / seek
      const drift = Math.abs(el.currentTime - actualTarget);
      if (activeScene.reverse) {
        if (!el.seeking && (renderingRef.current || drift > 0.08)) {
          el.currentTime = actualTarget;
        }
      } else {
        if (!isPlaying || drift > 0.5) {
          el.currentTime = actualTarget;
        }
      }
    } else {
      if (!el.paused) {
        el.pause();
      }
    }
  }, [activeScene, isPlaying, currentTime]);

  // Sync background audio tracks
  useEffect(() => {
    audioTracks.forEach(track => {
      const el = audioElementsRef.current[track.id];
      if (!el) return;

      // Set volume
      el.volume = track.volume !== undefined ? track.volume : 0.5;

      const isWithinBounds = currentTime >= track.startTime && currentTime <= track.endTime;
      const isActive = isPlaying && isWithinBounds;
      const targetTime = currentTime - track.startTime;

      // Sync play/pause state
      if (isActive) {
        if (el.paused) {
          el.play().catch(e => {});
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
      }

      // Sync current time / seek
      if (isWithinBounds) {
        const drift = Math.abs(el.currentTime - targetTime);
        if (!isPlaying || drift > 1.5) {
          el.currentTime = Math.max(0, targetTime);
        }
      } else {
        if (el.currentTime !== 0) {
          el.currentTime = 0;
        }
      }
    });
  }, [audioTracks, isPlaying, currentTime]);

  // Playback timer & frame updater
  useEffect(() => {
    let animId;
    if (isPlaying) {
      const startTime = Date.now() - (currentTime * 1000);
      const update = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= duration) {
          if (renderingRef.current) {
            setCurrentTime(duration);
          } else {
            setCurrentTime(0);
            setIsPlaying(false);
            if (videoElRef.current) {
              videoElRef.current.pause();
              videoElRef.current.currentTime = 0;
            }
          }
        } else {
          setCurrentTime(elapsed);
          animId = requestAnimationFrame(update);
        }
      };
      animId = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration]);

  // Synchronize play/pause
  const handlePlayToggle = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      if (videoElRef.current && activeScene && activeScene.type === 'video') {
        videoElRef.current.play().catch(e => console.log("Video play error", e));
      }
    } else {
      if (videoElRef.current) videoElRef.current.pause();
    }
  };

  const handleSeek = (time) => {
    const seekVal = Math.max(0, Math.min(duration, time));
    setCurrentTime(seekVal);
  };

  const getCanvasDimensions = (forExport = false) => {
    const maxW = forExport ? 1920 : 540;
    const maxH = forExport ? 1080 : 360;
    if (aspectRatio === '16:9') return { width: maxW, height: (maxW * 9) / 16 };
    if (aspectRatio === '9:16') return { width: (maxH * 9) / 16, height: maxH };
    return { width: maxH, height: maxH }; // 1:1
  };

  const getSceneOpacity = (scene, time) => {
    if (!scene || !scene.transition || scene.transition === 'none') return 1;
    const transitionDuration = 0.5; // 0.5 seconds transition
    
    // Fade in at the start
    if (time - scene.startTime < transitionDuration) {
      return Math.max(0, Math.min(1, (time - scene.startTime) / transitionDuration));
    }
    // Fade out at the end
    if (scene.endTime - time < transitionDuration) {
      return Math.max(0, Math.min(1, (scene.endTime - time) / transitionDuration));
    }
    return 1;
  };

  // Fullscreen Toggler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Drag and Drop handlers for Preview Overlay Elements
  const handleTextMouseDown = (e, trackId) => {
    e.preventDefault();
    setSelectedTextId(trackId);
    setSelectedAudioId(null);
    setSelectedSceneId(null);
    const track = textTracks.find(t => t.id === trackId);
    if (!track) return;

    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    dragStartRef.current = {
      trackId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: track.x,
      initialY: track.y,
      parentWidth: rect.width,
      parentHeight: rect.height
    };

    document.addEventListener('mousemove', handleTextMouseMove);
    document.addEventListener('mouseup', handleTextMouseUp);
  };

  const handleTextMouseMove = (e) => {
    if (!dragStartRef.current) return;
    const { trackId, startX, startY, initialX, initialY, parentWidth, parentHeight } = dragStartRef.current;

    const dx = ((e.clientX - startX) / parentWidth) * 100;
    const dy = ((e.clientY - startY) / parentHeight) * 100;

    const newX = Math.max(0, Math.min(100, Math.round(initialX + dx)));
    const newY = Math.max(0, Math.min(100, Math.round(initialY + dy)));

    setTextTracks(prev => prev.map(t => t.id === trackId ? { ...t, x: newX, y: newY } : t));
  };

  const handleTextMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleTextMouseMove);
    document.removeEventListener('mouseup', handleTextMouseUp);
  };

  // Watermark dragging
  const handleWatermarkMouseDown = (e) => {
    e.preventDefault();
    setSelectedTextId('watermark');
    setSelectedAudioId(null);
    setSelectedSceneId(null);
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    dragStartRef.current = {
      isWatermark: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: overlayConfig.x,
      initialY: overlayConfig.y,
      parentWidth: rect.width,
      parentHeight: rect.height
    };
    document.addEventListener('mousemove', handleWatermarkMouseMove);
    document.addEventListener('mouseup', handleWatermarkMouseUp);
  };

  const handleWatermarkMouseMove = (e) => {
    if (!dragStartRef.current || !dragStartRef.current.isWatermark) return;
    const { startX, startY, initialX, initialY, parentWidth, parentHeight } = dragStartRef.current;

    const dx = ((e.clientX - startX) / parentWidth) * 100;
    const dy = ((e.clientY - startY) / parentHeight) * 100;

    const newX = Math.max(0, Math.min(100, Math.round(initialX + dx)));
    const newY = Math.max(0, Math.min(100, Math.round(initialY + dy)));

    setOverlayConfig(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handleWatermarkMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleWatermarkMouseMove);
    document.removeEventListener('mouseup', handleWatermarkMouseUp);
  };

  const handleStickerMouseDown = (e, trackId) => {
    e.preventDefault();
    setSelectedStickerId(trackId);
    setSelectedAudioId(null);
    setSelectedTextId(null);
    setSelectedSceneId(null);
    
    const track = stickerTracks.find(t => t.id === trackId);
    if (!track) return;

    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    dragStartRef.current = {
      isSticker: true,
      trackId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: track.x,
      initialY: track.y,
      parentWidth: rect.width,
      parentHeight: rect.height
    };

    document.addEventListener('mousemove', handleStickerMouseMove);
    document.addEventListener('mouseup', handleStickerMouseUp);
  };

  const handleStickerMouseMove = (e) => {
    if (!dragStartRef.current || !dragStartRef.current.isSticker) return;
    const { trackId, startX, startY, initialX, initialY, parentWidth, parentHeight } = dragStartRef.current;

    const dx = ((e.clientX - startX) / parentWidth) * 100;
    const dy = ((e.clientY - startY) / parentHeight) * 100;

    const newX = Math.max(0, Math.min(100, Math.round(initialX + dx)));
    const newY = Math.max(0, Math.min(100, Math.round(initialY + dy)));

    setStickerTracks(prev => prev.map(t => t.id === trackId ? { ...t, x: newX, y: newY } : t));
  };

  const handleStickerMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleStickerMouseMove);
    document.removeEventListener('mouseup', handleStickerMouseUp);
  };

  const handleTimelineMouseDown = (e, trackId, trackType, actionType) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (trackType === 'text') {
      setSelectedTextId(trackId);
      setSelectedAudioId(null);
      setSelectedSceneId(null);
      setSelectedStickerId(null);
    } else if (trackType === 'audio') {
      setSelectedAudioId(trackId);
      setSelectedTextId(null);
      setSelectedSceneId(null);
      setSelectedStickerId(null);
    } else if (trackType === 'video') {
      setSelectedSceneId(trackId);
      setSelectedAudioId(null);
      setSelectedTextId(null);
      setSelectedStickerId(null);
    } else if (trackType === 'sticker') {
      setSelectedStickerId(trackId);
      setSelectedAudioId(null);
      setSelectedTextId(null);
      setSelectedSceneId(null);
    } else {
      setSelectedAudioId(null);
      setSelectedTextId(null);
      setSelectedSceneId(null);
      setSelectedStickerId(null);
    }

    const tracksList = trackType === 'text' ? textTracks : (trackType === 'audio' ? audioTracks : (trackType === 'sticker' ? stickerTracks : scenesWithBounds));
    const track = tracksList.find(t => t.id === trackId);
    if (!track) return;

    // Get the parent timeline track wrapper element
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const timelineWidth = rect.width;

    dragStartRef.current = {
      isTimeline: true,
      trackType,
      trackId,
      actionType, // 'move', 'resizeLeft', 'resizeRight'
      startX: e.clientX,
      initialStartTime: track.startTime,
      initialEndTime: track.endTime,
      timelineWidth,
      duration
    };

    document.addEventListener('mousemove', handleTimelineMouseMove);
    document.addEventListener('mouseup', handleTimelineMouseUp);
  };

  const handleTimelineMouseMove = (e) => {
    if (!dragStartRef.current || !dragStartRef.current.isTimeline) return;
    const { trackType, trackId, actionType, startX, initialStartTime, initialEndTime, timelineWidth, duration: totalDuration } = dragStartRef.current;

    const dx = e.clientX - startX;
    const deltaTime = (dx / timelineWidth) * totalDuration;

    const updateFunc = (prevTracks) => prevTracks.map(t => {
      if (t.id !== trackId) return t;

      let newStart = t.startTime;
      let newEnd = t.endTime;

      if (actionType === 'move') {
        const length = initialEndTime - initialStartTime;
        newStart = Math.max(0, initialStartTime + deltaTime);
        newEnd = newStart + length;
      } else if (actionType === 'resizeLeft') {
        newStart = Math.max(0, Math.min(t.endTime - 0.5, initialStartTime + deltaTime));
      } else if (actionType === 'resizeRight') {
        newEnd = Math.max(t.startTime + 0.5, initialEndTime + deltaTime);
      }

      return {
        ...t,
        startTime: Math.round(newStart * 10) / 10,
        endTime: Math.round(newEnd * 10) / 10
      };
    });

    if (trackType === 'text') {
      setTextTracks(updateFunc);
    } else if (trackType === 'audio') {
      setAudioTracks(updateFunc);
    } else if (trackType === 'video') {
      setScenes(updateFunc);
    } else if (trackType === 'sticker') {
      setStickerTracks(updateFunc);
    }
  };

  const handleTimelineMouseUp = () => {
    dragStartRef.current = null;
    document.removeEventListener('mousemove', handleTimelineMouseMove);
    document.removeEventListener('mouseup', handleTimelineMouseUp);
  };

  // Upload Local File helpers
  const handleLocalUpload = async (e, target) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newScenes = [];
    const newAudios = [];

    for (const file of files) {
      const url = URL.createObjectURL(file);
      if (target === 'main') {
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        const isVid = type === 'video';
        
        let fileDuration = isVid ? 10 : 5; // default
        if (isVid) {
          const d = await getMediaDuration(url, true);
          if (d) fileDuration = Math.round(d);
        }
        
        const lastSceneEnd = scenes.reduce((max, s) => Math.max(max, s.endTime !== undefined ? s.endTime : (s.duration || 5)), 0);
        newScenes.push({
          id: Date.now() + Math.random(),
          type,
          url,
          name: file.name,
          startTime: lastSceneEnd,
          endTime: lastSceneEnd + fileDuration,
          duration: fileDuration
        });
      } else if (target === 'music') {
        let fileDuration = 15; // default
        const d = await getMediaDuration(url, false);
        if (d) fileDuration = Math.round(d);

        newAudios.push({
          id: Date.now() + Math.random(),
          url,
          name: file.name,
          startTime: currentTime,
          endTime: currentTime + fileDuration,
          volume: 0.5
        });
      } else if (target === 'watermark') {
        setOverlayImage({ id: 'local-watermark-' + Date.now(), type: 'image', url, name: file.name });
      }
    }

    if (newScenes.length > 0) {
      setScenes(prev => [...prev, ...newScenes]);
    }
    if (newAudios.length > 0) {
      setAudioTracks(prev => [...prev, ...newAudios]);
    }
    e.target.value = '';
  };

  // Select item from media library
  const selectMediaFromLibrary = async (item, target) => {
    const isVid = isVideoItem(item);
    const isAud = isAudioItem(item);

    if (target === 'main') {
      let fileDuration = isVid ? 10 : 5;
      if (isVid) {
        const d = await getMediaDuration(item.mediaUrl, true);
        if (d) fileDuration = Math.round(d);
      }
      const lastSceneEnd = scenes.reduce((max, s) => Math.max(max, s.endTime !== undefined ? s.endTime : (s.duration || 5)), 0);
      const newScene = {
        id: Date.now() + Math.random(),
        type: isVid ? 'video' : 'image',
        url: item.mediaUrl,
        name: item.fileName,
        startTime: lastSceneEnd,
        endTime: lastSceneEnd + fileDuration,
        duration: fileDuration
      };
      setScenes(prev => [...prev, newScene]);
    } else if (target === 'music' && isAud) {
      let fileDuration = 15;
      const d = await getMediaDuration(item.mediaUrl, false);
      if (d) fileDuration = Math.round(d);

      const newTrack = {
        id: Date.now() + Math.random(),
        url: item.mediaUrl,
        name: item.fileName,
        startTime: currentTime,
        endTime: currentTime + fileDuration,
        volume: 0.5
      };
      setAudioTracks(prev => [...prev, newTrack]);
    } else if (target === 'watermark' && !isVid && !isAud) {
      setOverlayImage({ id: item.id, type: 'image', url: item.mediaUrl, name: item.fileName });
    }
  };

  const handleBulkAddToMain = async () => {
    const itemsToAdd = mediaList.filter(m => selectedLibraryIds.includes(m.id) && !isAudioItem(m));
    if (itemsToAdd.length === 0) return;

    const newScenes = [];
    let currentOffset = scenes.reduce((max, s) => Math.max(max, s.endTime !== undefined ? s.endTime : (s.duration || 5)), 0);
    
    for (const item of itemsToAdd) {
      const isVid = isVideoItem(item);
      let fileDuration = isVid ? 10 : 5;
      if (isVid) {
        const d = await getMediaDuration(item.mediaUrl, true);
        if (d) fileDuration = Math.round(d);
      }
      newScenes.push({
        id: Date.now() + Math.random(),
        type: isVid ? 'video' : 'image',
        url: item.mediaUrl,
        name: item.fileName,
        startTime: currentOffset,
        endTime: currentOffset + fileDuration,
        duration: fileDuration
      });
      currentOffset += fileDuration;
    }

    setScenes(prev => [...prev, ...newScenes]);
    setSelectedLibraryIds([]);
    setIsMultiSelect(false);
  };

  const handleBulkAddToAudio = async () => {
    const itemsToAdd = mediaList.filter(m => selectedLibraryIds.includes(m.id) && isAudioItem(m));
    if (itemsToAdd.length === 0) return;

    const newAudios = [];
    let currentOffset = currentTime;

    for (const item of itemsToAdd) {
      let fileDuration = 15;
      const d = await getMediaDuration(item.mediaUrl, false);
      if (d) fileDuration = Math.round(d);

      newAudios.push({
        id: Date.now() + Math.random(),
        url: item.mediaUrl,
        name: item.fileName,
        startTime: currentOffset,
        endTime: currentOffset + fileDuration,
        volume: 0.5
      });
      currentOffset += fileDuration;
    }

    setAudioTracks(prev => [...prev, ...newAudios]);
    setSelectedLibraryIds([]);
    setIsMultiSelect(false);
  };

  const updateSceneDuration = (sceneId, sec) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, duration: Math.max(1, sec) } : s));
  };

  const removeScene = (sceneId) => {
    setScenes(prev => prev.filter(s => s.id !== sceneId));
  };

  const moveSceneOrder = (idx, direction) => {
    const newScenes = [...scenes];
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newScenes.length) return;
    const temp = newScenes[idx];
    newScenes[idx] = newScenes[targetIdx];
    newScenes[targetIdx] = temp;
    setScenes(newScenes);
  };

  // Text management
  const addTextTrack = () => {
    const newId = textTracks.length > 0 ? Math.max(...textTracks.map(t => t.id)) + 1 : 1;
    const newTrack = {
      id: newId,
      text: 'Klik 2x & Ketik teks baru',
      startTime: Math.max(0, currentTime),
      endTime: Math.min(duration, currentTime + 5),
      x: 50,
      y: 50,
      size: 24,
      color: '#ffffff',
      outlineColor: '#000000'
    };
    setTextTracks([...textTracks, newTrack]);
    setSelectedTextId(newId);
  };

  const updateSelectedText = (field, value) => {
    setTextTracks(textTracks.map(t => t.id === selectedTextId ? { ...t, [field]: value } : t));
  };

  const deleteTextTrack = (id) => {
    setTextTracks(textTracks.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const moveTextLayer = (id, direction) => {
    const idx = textTracks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const newTracks = [...textTracks];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newTracks.length) return;
    
    // Swap
    const temp = newTracks[idx];
    newTracks[idx] = newTracks[targetIdx];
    newTracks[targetIdx] = temp;
    setTextTracks(newTracks);
  };

  // Sticker management
  const addStickerTrack = (url, name) => {
    const newId = Date.now() + Math.random();
    const newTrack = {
      id: newId,
      name: name || 'Stiker',
      url,
      startTime: Math.max(0, currentTime),
      endTime: Math.min(duration, currentTime + 5),
      x: 50,
      y: 50,
      scale: 20,
      opacity: 1
    };
    setStickerTracks([...stickerTracks, newTrack]);
    setSelectedStickerId(newId);
    setSelectedTextId(null);
    setSelectedAudioId(null);
    setSelectedSceneId(null);
  };

  // Save Template to Firestore
  const handleSaveTemplate = async () => {
    if (!user) return alert("Silakan masuk log terlebih dahulu!");
    try {
      const templateData = {
        userId: user.id,
        name: templateName,
        aspectRatio,
        videoFilter,
        scenes,
        audioTracks,
        overlayImage: overlayImage ? { url: overlayImage.url, name: overlayImage.name } : null,
        overlayConfig,
        textTracks,
        stickerTracks,
        updatedAt: new Date()
      };

      const existing = templates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
      if (existing) {
        if (!window.confirm(`Template "${templateName}" sudah ada. Apakah Anda ingin memperbaruinya?`)) return;
        await updateDoc(doc(db, 'video_templates', existing.id), templateData);
        alert("Template berhasil diperbarui!");
      } else {
        const docRef = await addDoc(collection(db, 'video_templates'), templateData);
        setTemplates([...templates, { id: docRef.id, ...templateData }]);
        alert("Template baru berhasil disimpan!");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan template: " + err.message);
    }
  };

  // Load template
  const loadTemplate = (tmpl) => {
    setTemplateName(tmpl.name);
    setAspectRatio(tmpl.aspectRatio || '16:9');
    setVideoFilter(tmpl.videoFilter || 'none');
    setOverlayConfig(tmpl.overlayConfig || { x: 80, y: 15, width: 15, opacity: 0.8 });
    setTextTracks(tmpl.textTracks || []);
    setStickerTracks(tmpl.stickerTracks || []);
    setScenes(tmpl.scenes || []);
    setAudioTracks(tmpl.audioTracks || []);

    if (tmpl.overlayImage) {
      setOverlayImage(tmpl.overlayImage);
    } else {
      setOverlayImage(null);
    }

    alert(`Template "${tmpl.name}" berhasil dimuat!`);
  };

  // Delete template
  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus template ini?")) return;
    try {
      await deleteDoc(doc(db, 'video_templates', id));
      setTemplates(templates.filter(t => t.id !== id));
      alert("Template berhasil dihapus.");
    } catch (err) {
      alert("Gagal menghapus template: " + err.message);
    }
  };

  // Client-side Canvas Frame rendering for Render export
  const drawFrameToCanvas = (ctx, time, width, height, loadedVideoEl, watermarkEl, preloadedStickers = {}) => {
    // Find active scene at time
    const activeS = scenesWithBounds.find(s => time >= s.startTime && time <= s.endTime) || null;

    // Background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    // Draw Main Scene
    if (showMainLayer && activeS) {
      ctx.save();
      ctx.globalAlpha = getSceneOpacity(activeS, time);
      if (activeS.type === 'video' && loadedVideoEl) {
        const cleanedVideoSrc = getStreamingUrl(loadedVideoEl.src);
        const cleanedSceneSrc = getStreamingUrl(activeS.url);
        if (cleanedVideoSrc.includes(cleanedSceneSrc) || cleanedSceneSrc.includes(cleanedVideoSrc) || loadedVideoEl.src === activeS.url) {
          ctx.drawImage(loadedVideoEl, 0, 0, width, height);
        }
      } else {
        // Since images might not be cached, draw them synchronously if complete
        const img = new Image();
        img.src = activeS.url;
        if (!activeS.url.includes('drive.google.com') && !activeS.url.startsWith('blob:') && !activeS.url.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        if (img.complete) {
          ctx.drawImage(img, 0, 0, width, height);
        }
      }
      ctx.restore();
    }

    // Apply Filter
    const activeFilter = (activeS && activeS.filter) || videoFilter;
    if (activeFilter !== 'none') {
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      if (activeFilter === 'grayscale') ctx.filter = 'grayscale(100%)';
      else if (activeFilter === 'sepia') ctx.filter = 'sepia(100%)';
      else if (activeFilter === 'warm') ctx.filter = 'sepia(30%) saturate(150%) hue-rotate(-15deg)';
      else if (activeFilter === 'cool') ctx.filter = 'saturate(120%) hue-rotate(15deg) brightness(95%)';
      else if (activeFilter === 'invert') ctx.filter = 'invert(100%)';
      else if (activeFilter === 'vintage') ctx.filter = 'contrast(120%) brightness(90%) sepia(50%)';
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
      ctx.filter = 'none';
    }

    // Watermark
    if (showOverlayLayer && overlayImage && watermarkEl) {
      ctx.save();
      ctx.globalAlpha = overlayConfig.opacity;
      const wWidth = (width * overlayConfig.width) / 100;
      const wHeight = (watermarkEl.height / watermarkEl.width) * wWidth;
      const wX = (width * overlayConfig.x) / 100 - wWidth / 2;
      const wY = (height * overlayConfig.y) / 100 - wHeight / 2;
      ctx.drawImage(watermarkEl, Math.max(0, wX), Math.max(0, wY), wWidth, wHeight);
      ctx.restore();
    }

    // Stickers
    stickerTracks.forEach(track => {
      if (time >= track.startTime && time <= track.endTime) {
        ctx.save();
        ctx.globalAlpha = track.opacity !== undefined ? track.opacity : 1;
        let img = preloadedStickers[track.url];
        if (!img) {
          img = new Image();
          img.src = getStreamingUrl(track.url);
          if (!track.url.includes('drive.google.com') && !track.url.startsWith('blob:') && !track.url.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
          }
        }
        if (img.complete || preloadedStickers[track.url]) {
          const sScale = track.scale || 20;
          const sWidth = (width * sScale) / 100;
          const imgAspect = img.width ? (img.height / img.width) : 1;
          const sHeight = imgAspect * sWidth;
          const sx = (width * track.x) / 100 - sWidth / 2;
          const sy = (height * track.y) / 100 - sHeight / 2;
          ctx.drawImage(img, sx, sy, sWidth, sHeight);
        }
        ctx.restore();
      }
    });

    // Texts
    textTracks.forEach(track => {
      if (time >= track.startTime && time <= track.endTime) {
        ctx.save();
        ctx.font = `bold ${track.size}px Outfit, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tx = (width * track.x) / 100;
        const ty = (height * track.y) / 100;

        ctx.strokeStyle = track.outlineColor || '#000000';
        ctx.lineWidth = 5;
        ctx.strokeText(track.text, tx, ty);

        ctx.fillStyle = track.color || '#ffffff';
        ctx.fillText(track.text, tx, ty);
        ctx.restore();
      }
    });
  };

  // Render & Record composition
  const handleRenderVideo = async (actionType = 'download') => {
    if (rendering) return;
    if (scenes.length === 0) {
      alert("Harap tambahkan media utama (video atau gambar) ke trek Utama terlebih dahulu!");
      return;
    }

    // Ensure Audio Context is active
    initAudioRouting();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    setRendering(true);
    setRenderProgress(0);
    setIsPlaying(false);
    setCurrentTime(0);

    // Mute preview playback sound, enable recording path
    if (previewGainRef.current) previewGainRef.current.gain.value = 0;
    if (recordGainRef.current) recordGainRef.current.gain.value = 1;

    // Unmute video player during render so audio streams to AudioContext
    if (videoElRef.current) {
      videoElRef.current.muted = false;
    }

    // Wait slightly for state updates to settle
    await new Promise(r => setTimeout(r, 200));

    try {
      const canvas = canvasRef.current;
      const { width, height } = getCanvasDimensions(true); // export high-res (e.g. 1080p)
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      let renderWatermark = null;
      if (overlayImage) {
        renderWatermark = new Image();
        renderWatermark.src = getStreamingUrl(overlayImage.url);
        if (!overlayImage.url.includes('drive.google.com') && !overlayImage.url.startsWith('blob:') && !overlayImage.url.startsWith('data:')) {
          renderWatermark.crossOrigin = 'anonymous';
        }
        await new Promise((r) => {
          renderWatermark.onload = r;
          renderWatermark.onerror = r;
        });
      }

      // Preload active stickers in parallel to prevent render lag
      const preloadedStickers = {};
      const activeStickersInComposition = stickerTracks.filter(t => t.url);
      for (const track of activeStickersInComposition) {
        if (!preloadedStickers[track.url]) {
          const img = new Image();
          img.src = getStreamingUrl(track.url);
          if (!track.url.includes('drive.google.com') && !track.url.startsWith('blob:') && !track.url.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
          }
          await new Promise((r) => {
            img.onload = () => {
              preloadedStickers[track.url] = img;
              r();
            };
            img.onerror = r;
          });
        }
      }

      // Capture high-res canvas visual stream at 30 FPS
      const canvasStream = canvas.captureStream(30);

      // Merge canvas video tracks with audio destination tracks
      const tracks = [...canvasStream.getVideoTracks()];
      if (recordDestRef.current) {
        const audioTracks = recordDestRef.current.stream.getAudioTracks();
        tracks.push(...audioTracks);
      }

      const combinedStream = new MediaStream(tracks);
      const chunks = [];

      let recorder;
      let options = {};
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        options = { mimeType: 'video/mp4;codecs=h264', videoBitsPerSecond: 8000000 };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4', videoBitsPerSecond: 8000000 };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        options = { mimeType: 'video/webm;codecs=h264', videoBitsPerSecond: 8000000 };
      } else {
        options = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 };
      }

      try {
        recorder = new MediaRecorder(combinedStream, options);
      } catch (err) {
        recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const stopAndSave = async () => {
        setIsPlaying(false);
        if (videoElRef.current) {
          videoElRef.current.pause();
        }

        // Restore normal gain settings
        if (previewGainRef.current) previewGainRef.current.gain.value = 1;
        if (recordGainRef.current) recordGainRef.current.gain.value = 0;

        const isMp4 = recorder.mimeType.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        const type = isMp4 ? 'video/mp4' : 'video/webm';

        const blob = new Blob(chunks, { type });
        const videoFile = new File([blob], `${templateName.replace(/\s+/g, '_')}_output.${ext}`, { type });

        if (actionType === 'download') {
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = videoFile.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          alert("Rendering selesai! Video berhasil diunduh.");
        } else if (actionType === 'media') {
          setRenderProgress(99);
          alert("Mengunggah video ke pustaka media...");
          const res = await onUploadMedia(videoFile, 'video', ({ percent }) => {
            setRenderProgress(percent);
          });
          alert(`Video berhasil disimpan ke Pustaka Media dengan nama: ${res.fileName}`);
        } else if (actionType === 'publish') {
          setRenderProgress(99);
          alert("Mengunggah video...");
          const res = await onUploadMedia(videoFile, 'video', ({ percent }) => {
            setRenderProgress(percent);
          });
          alert("Video berhasil disimpan ke media. Mengalihkan ke Penjadwal Postingan...");
          onUseMedia(res.mediaUrl);
        }

        setRendering(false);
        setRenderProgress(0);
        setCurrentTime(0);
      };

      recorder.onstop = stopAndSave;

      // Start real-time playback
      setCurrentTime(0);
      setIsPlaying(true);
      recorder.start();

      const drawLoop = () => {
        if (!recorder || recorder.state === 'inactive') return;

        const time = currentTimeRef.current;
        // Stop condition
        if (time >= duration) {
          recorder.stop();
          return;
        }

        // Render current timeline frame onto high-res canvas with preloaded stickers
        drawFrameToCanvas(ctx, time, width, height, videoElRef.current, renderWatermark, preloadedStickers);

        // Update progress
        const progress = Math.min(100, Math.round((time / duration) * 100));
        setRenderProgress(progress);

        requestAnimationFrame(drawLoop);
      };

      requestAnimationFrame(drawLoop);

    } catch (err) {
      console.error(err);
      alert("Gagal merender video: " + err.message);
      setRendering(false);
      setIsPlaying(false);
    }
  };

  const selectedText = textTracks.find(t => t.id === selectedTextId);
  const selectedAudio = audioTracks.find(t => t.id === selectedAudioId);
  const selectedScene = scenesWithBounds.find(s => s.id === selectedSceneId);
  const { width, height } = getCanvasDimensions();

  // Pack video tracks into lanes to avoid overlap
  const videoLanes = [];
  scenesWithBounds.forEach(track => {
    let laneIndex = 0;
    while (true) {
      const hasOverlap = (videoLanes[laneIndex] || []).some(t => {
        return t.startTime < track.endTime && track.startTime < t.endTime;
      });
      if (!hasOverlap) {
        if (!videoLanes[laneIndex]) videoLanes[laneIndex] = [];
        videoLanes[laneIndex].push(track);
        break;
      }
      laneIndex++;
    }
  });

  // Pack audio tracks into lanes to avoid overlap
  const audioLanes = [];
  audioTracks.forEach(track => {
    let laneIndex = 0;
    while (true) {
      const hasOverlap = (audioLanes[laneIndex] || []).some(t => {
        return t.startTime < track.endTime && track.startTime < t.endTime;
      });
      if (!hasOverlap) {
        if (!audioLanes[laneIndex]) audioLanes[laneIndex] = [];
        audioLanes[laneIndex].push(track);
        break;
      }
      laneIndex++;
    }
  });

  // Pack text tracks into lanes to avoid overlap
  const textLanes = [];
  textTracks.forEach(track => {
    let laneIndex = 0;
    while (true) {
      const hasOverlap = (textLanes[laneIndex] || []).some(t => {
        return t.startTime < track.endTime && track.startTime < t.endTime;
      });
      if (!hasOverlap) {
        if (!textLanes[laneIndex]) textLanes[laneIndex] = [];
        textLanes[laneIndex].push(track);
        break;
      }
      laneIndex++;
    }
  });

  // Pack sticker tracks into lanes to avoid overlap
  const stickerLanes = [];
  stickerTracks.forEach(track => {
    let laneIndex = 0;
    while (true) {
      const hasOverlap = (stickerLanes[laneIndex] || []).some(t => {
        return t.startTime < track.endTime && track.startTime < t.endTime;
      });
      if (!hasOverlap) {
        if (!stickerLanes[laneIndex]) stickerLanes[laneIndex] = [];
        stickerLanes[laneIndex].push(track);
        break;
      }
      laneIndex++;
    }
  });

  const videoHeight = scenes.length === 0 ? 28 : (videoLanes.length * 28 + (videoLanes.length - 1) * 6.4);
  const audioHeight = audioTracks.length === 0 ? 28 : (audioLanes.length * 28 + (audioLanes.length - 1) * 6.4);
  const textHeight = textTracks.length === 0 ? 28 : (textLanes.length * 28 + (textLanes.length - 1) * 6.4);
  const stickerHeight = stickerTracks.length === 0 ? 28 : (stickerLanes.length * 28 + (stickerLanes.length - 1) * 6.4);

  return (
    <div 
      ref={containerRef}
      className={`video-editor-container ${isFullscreen ? 'fullscreen-mode' : ''}`} 
      style={{ 
        color: '#f1f5f9', 
        background: '#090d16', 
        padding: isFullscreen ? '2rem 3rem' : '1.5rem', 
        borderRadius: isFullscreen ? '0' : '24px', 
        minHeight: isFullscreen ? '100vh' : '80vh', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem',
        overflowY: isFullscreen ? 'auto' : 'visible'
      }}
    >
      
      {/* Hidden background audio elements dynamically synchronized */}
      {audioTracks.map(track => (
        <audio
          key={track.id}
          ref={(el) => {
            if (el) {
              audioElementsRef.current[track.id] = el;
              routeElementAudio(el);
            } else {
              delete audioElementsRef.current[track.id];
            }
          }}
          crossOrigin="anonymous"
          src={getStreamingUrl(track.url)}
        />
      ))}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', padding: '10px', borderRadius: '12px' }}>
            <Film size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #f3f4f6, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Creative Studio Video Editor</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Gaya CapCut & Filmora. Multi-Scene Sequential & Multi-Track Audio</p>
          </div>
        </div>

        {/* Template Manager & Fullscreen */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input 
            type="text" 
            value={templateName} 
            onChange={(e) => setTemplateName(e.target.value)} 
            placeholder="Nama Templat..."
            style={{ padding: '0.55rem 1rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', width: '160px' }}
          />
          <button onClick={handleSaveTemplate} className="editor-btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', border: '1px solid #334155', padding: '0.55rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', color: '#fff' }}>
            <Save size={16} />
            <span>Simpan Templat</span>
          </button>
          
          <button onClick={toggleFullscreen} className="editor-btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', border: '1px solid #334155', padding: '0.55rem', borderRadius: '10px', cursor: 'pointer', transition: '0.2s', color: '#fff' }} title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}>
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* Main Workspace split into Left Control, Center Preview, Right Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '1.5rem', flex: 1, minHeight: '400px' }} className="editor-grid-responsive">
        
        {/* Left Side: Media Library & Local Assets Selector */}
        <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tab Selector */}
          <div 
            style={{ 
              display: 'flex', 
              background: '#090d16', 
              padding: '0.3rem', 
              borderRadius: '12px', 
              gap: '0.3rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            className="no-scrollbar"
          >
            {['media', 'text', 'stickers', 'layers', 'filters', 'templates'].map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t)}
                style={{ 
                  flex: '0 0 auto',
                  textTransform: 'capitalize', 
                  border: 'none', 
                  padding: '0.5rem 0.8rem', 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  background: activeTab === t ? '#1e293b' : 'transparent', 
                  color: activeTab === t ? '#60a5fa' : '#94a3b8', 
                  transition: '0.2s' 
                }}
              >
                {t === 'layers' ? 'Layer' : t === 'stickers' ? 'Stiker' : t}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px' }} className="editor-scroll">
            {activeTab === 'media' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Local Upload Shortcuts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label className="local-upload-btn" style={{ background: 'rgba(96, 165, 250, 0.1)', border: '1px dashed rgba(96, 165, 250, 0.3)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <Video size={16} color="#60a5fa" />
                    <span>+ Unggah Video/Foto</span>
                    <input type="file" accept="image/*,video/*" multiple onChange={(e) => handleLocalUpload(e, 'main')} style={{ display: 'none' }} />
                  </label>
                  <label className="local-upload-btn" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px dashed rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <Music size={16} color="#f59e0b" />
                    <span>+ Unggah Musik</span>
                    <input type="file" accept="audio/*" multiple onChange={(e) => handleLocalUpload(e, 'music')} style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>Pilih Dari Pustaka Media:</span>
                    <button 
                      onClick={() => {
                        setIsMultiSelect(!isMultiSelect);
                        setSelectedLibraryIds([]);
                      }}
                      style={{
                        background: isMultiSelect ? '#ef4444' : '#1e293b',
                        border: '1px solid #334155',
                        color: '#fff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {isMultiSelect ? 'Batal' : 'Pilih Banyak'}
                    </button>
                  </div>

                  {isMultiSelect && selectedLibraryIds.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#090d16', padding: '0.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{selectedLibraryIds.length} item terpilih</div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          onClick={handleBulkAddToMain} 
                          style={{ flex: 1, padding: '0.35rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          + Utama ({selectedLibraryIds.filter(id => {
                            const item = mediaList.find(m => m.id === id);
                            return item && !isAudioItem(item);
                          }).length})
                        </button>
                        <button 
                          onClick={handleBulkAddToAudio} 
                          style={{ flex: 1, padding: '0.35rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          + Audio ({selectedLibraryIds.filter(id => {
                            const item = mediaList.find(m => m.id === id);
                            return item && isAudioItem(item);
                          }).length})
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Media Categories inside tab */}
                  <div style={{ display: 'flex', gap: '0.2rem', background: '#090d16', padding: '0.2rem', borderRadius: '8px' }}>
                    {['all', 'video', 'music', 'image'].map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setMediaLibraryTab(cat)}
                        style={{ flex: 1, border: 'none', padding: '0.4rem 0.2rem', fontSize: '0.68rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', background: mediaLibraryTab === cat ? '#1e293b' : 'transparent', color: mediaLibraryTab === cat ? '#60a5fa' : '#94a3b8', transition: '0.1s' }}
                      >
                        {cat === 'all' ? 'Semua' : cat === 'video' ? 'Video' : cat === 'music' ? 'Musik' : 'Gambar'}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }} className="editor-scroll">
                    {mediaList.length === 0 ? (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.75rem' }}>
                        Pustaka media kosong. Silakan unggah media di menu Pustaka Media.
                      </div>
                    ) : (
                      mediaList.filter(item => {
                        if (mediaLibraryTab === 'all') return true;
                        if (mediaLibraryTab === 'video') return isVideoItem(item);
                        if (mediaLibraryTab === 'music') return isAudioItem(item);
                        if (mediaLibraryTab === 'image') return !isVideoItem(item) && !isAudioItem(item);
                        return true;
                      }).map(item => {
                        const isVid = isVideoItem(item);
                        const isAud = isAudioItem(item);
                        const isSelected = selectedLibraryIds.includes(item.id);
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              if (isMultiSelect) {
                                setSelectedLibraryIds(prev => 
                                  prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                );
                              }
                            }}
                            className="media-library-card" 
                            style={{ 
                              background: '#1e293b', 
                              borderRadius: '8px', 
                              border: isSelected ? '2px solid #3b82f6' : '1px solid #334155', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              overflow: 'hidden', 
                              position: 'relative',
                              cursor: isMultiSelect ? 'pointer' : 'default'
                            }}
                          >
                            <div style={{ height: '56px', background: isVid ? '#1e1b4b' : isAud ? '#451a03' : '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                              {isVid ? (
                                <Video size={20} color="#818cf8" />
                              ) : isAud ? (
                                <Music size={20} color="#fbbf24" />
                              ) : (
                                <img src={getDirectLink(item.mediaUrl)} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                              
                              {isMultiSelect && (
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '4px',
                                  border: '2px solid #fff',
                                  background: isSelected ? '#3b82f6' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  color: '#fff',
                                  fontWeight: 'bold'
                                }}>
                                  {isSelected ? '✓' : ''}
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.fileName}>
                                {item.fileName}
                              </span>
                              {!isMultiSelect && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                  <button onClick={(e) => { e.stopPropagation(); selectMediaFromLibrary(item, 'main'); }} style={{ width: '100%', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#3b82f6', color: '#fff', fontSize: '0.6rem', padding: '0.15rem 0' }}>+ Trek Utama</button>
                                  {isAud && <button onClick={(e) => { e.stopPropagation(); selectMediaFromLibrary(item, 'music'); }} style={{ width: '100%', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#f59e0b', color: '#fff', fontSize: '0.6rem', padding: '0.15rem 0' }}>+ Backsound</button>}
                                  {!isVid && !isAud && <button onClick={(e) => { e.stopPropagation(); selectMediaFromLibrary(item, 'watermark'); }} style={{ width: '100%', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#10b981', color: '#fff', fontSize: '0.6rem', padding: '0.15rem 0' }}>+ Stamp/Logo</button>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stickers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label className="local-upload-btn" style={{ width: '100%', background: 'rgba(236, 72, 153, 0.1)', border: '1px dashed rgba(236, 72, 153, 0.3)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={16} color="#ec4899" />
                  <span>+ Unggah Stiker Kustom</span>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      addStickerTrack(url, file.name.split('.')[0]);
                    }
                    e.target.value = '';
                  }} style={{ display: 'none' }} />
                </label>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.4rem' }}>Pustaka Stiker CapCut Style:</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }} className="editor-scroll">
                  {PREMIUM_STICKERS.map((st, i) => (
                    <div 
                      key={i} 
                      onClick={() => addStickerTrack(st.url, st.name)}
                      style={{ 
                        background: '#1e293b', 
                        borderRadius: '10px', 
                        padding: '0.5rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '1px solid #334155',
                        transition: '0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <img src={st.url} alt={st.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.3rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textWidth: '100%', textOverflow: 'ellipsis' }}>{st.name}</span>
                    </div>
                  ))}
                </div>

                {stickerTracks.length > 0 && (
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 700 }}>Stiker Aktif di Timeline:</span>
                    {stickerTracks.map(track => (
                      <div key={track.id} onClick={() => setSelectedStickerId(track.id)} style={{ padding: '0.5rem', background: selectedStickerId === track.id ? '#9d174d' : '#1e293b', border: `1px solid ${selectedStickerId === track.id ? '#ec4899' : '#334155'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <img src={track.url} alt="thumb" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff' }}>{track.name}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setStickerTracks(stickerTracks.filter(t => t.id !== track.id)); if (selectedStickerId === track.id) setSelectedStickerId(null); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button onClick={addTextTrack} style={{ width: '100%', padding: '0.6rem', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Type size={16} />
                  <span>Tambahkan Teks Baru</span>
                </button>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {textTracks.map(track => (
                    <div key={track.id} onClick={() => setSelectedTextId(track.id)} style={{ padding: '0.6rem', background: selectedTextId === track.id ? '#1e3a8a' : '#1e293b', border: `1px solid ${selectedTextId === track.id ? '#3b82f6' : '#334155'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{track.text || '(Kosong)'}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteTextTrack(track.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'layers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>Daftar Scene & Layer:</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {/* Scenes management */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700 }}>Daftar Klip Utama (Scenes):</span>
                    {scenes.map((s, i) => (
                      <div 
                        key={s.id} 
                        onClick={() => {
                          setSelectedSceneId(s.id);
                          setSelectedAudioId(null);
                          setSelectedTextId(null);
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '0.4rem', 
                          background: selectedSceneId === s.id ? '#1e3a8a' : '#1e293b', 
                          borderRadius: '6px', 
                          gap: '0.4rem',
                          border: selectedSceneId === s.id ? '1px solid #60a5fa' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => moveSceneOrder(i, 'left')} disabled={i === 0} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.6rem' }}>◀</button>
                          <input type="number" value={s.duration} onChange={(e) => updateSceneDuration(s.id, parseInt(e.target.value) || 5)} style={{ width: '40px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '0.65rem', textAlign: 'center', borderRadius: '4px' }} />
                          <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>s</span>
                          <button onClick={() => moveSceneOrder(i, 'right')} disabled={i === scenes.length - 1} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.6rem' }}>▶</button>
                          <button onClick={() => removeScene(s.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Watermark Logo Layer */}
                  {overlayImage && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
                        <ImageIcon size={14} />
                        <span>Stamp Logo</span>
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => setShowOverlayLayer(!showOverlayLayer)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                          {showOverlayLayer ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={() => setOverlayImage(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audio Backsound Layer list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>Musik Latar (Multi-Track):</span>
                    {audioTracks.map(track => (
                      <div key={track.id} onClick={() => setSelectedAudioId(track.id)} style={{ display: 'flex', alignItems: 'center', justify: 'space-between', padding: '0.4rem', background: selectedAudioId === track.id ? '#451a03' : '#1e293b', borderRadius: '6px', border: selectedAudioId === track.id ? '1px solid #f59e0b' : 'none' }}>
                        <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{track.name}</span>
                        <button onClick={() => setAudioTracks(prev => prev.filter(t => t.id !== track.id))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Text Layers */}
                  {textTracks.map((track, i) => (
                    <div 
                      key={track.id} 
                      onClick={() => setSelectedTextId(track.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.6rem', 
                        background: selectedTextId === track.id ? '#1e3a8a' : '#1e293b', 
                        borderRadius: '8px', 
                        border: `1px solid ${selectedTextId === track.id ? '#3b82f6' : '#334155'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Type size={14} />
                        <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.text}</span>
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button onClick={(e) => { e.stopPropagation(); moveTextLayer(track.id, 'up'); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} disabled={i === 0}>
                          <MoveUp size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveTextLayer(track.id, 'down'); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} disabled={i === textTracks.length - 1}>
                          <MoveDown size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTextTrack(track.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { id: 'none', name: 'Normal 🌈' },
                  { id: 'grayscale', name: 'Grayscale 🖤' },
                  { id: 'sepia', name: 'Sepia 🤎' },
                  { id: 'warm', name: 'Warm 🔥' },
                  { id: 'cool', name: 'Cool ❄️' },
                  { id: 'invert', name: 'Invert 🌀' },
                  { id: 'vintage', name: 'Vintage 🎞️' }
                ].map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setVideoFilter(f.id)} 
                    style={{ padding: '0.8rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #1e293b', borderRadius: '8px', cursor: 'pointer', background: videoFilter === f.id ? '#3b82f6' : '#1e293b', color: '#fff', textAlign: 'center', transition: '0.2s' }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {templates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>Belum ada templat tersimpan.</div>
                ) : (
                  templates.map(tmpl => (
                    <div 
                      key={tmpl.id} 
                      onClick={() => loadTemplate(tmpl)}
                      style={{ padding: '0.65rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', hover: { background: '#334155' } }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{tmpl.name}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{tmpl.aspectRatio}</span>
                      </div>
                      <button onClick={(e) => handleDeleteTemplate(e, tmpl.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Canvas Live Player Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '20px', padding: '1.5rem', gap: '1rem', position: 'relative' }}>
          
          {/* Interactive HTML5 Preview Wrapper (Solves CORS/Lag bugs) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '260px' }}>
            <div 
              className="preview-wrapper"
              style={{
                width: `${width}px`,
                height: `${height}px`,
                position: 'relative',
                background: '#020617',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 15px 30px rgba(0,0,0,0.5)'
              }}
            >
              {/* Main Media Player layer */}
              {showMainLayer && activeScene ? (
                activeScene.type === 'video' ? (
                  <video
                    ref={(el) => {
                      videoElRef.current = el;
                      if (el) routeElementAudio(el);
                    }}
                    crossOrigin="anonymous"
                    loop
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: getSceneOpacity(activeScene, currentTime),
                      filter: (activeScene.filter || videoFilter) === 'grayscale' ? 'grayscale(100%)' :
                              (activeScene.filter || videoFilter) === 'sepia' ? 'sepia(100%)' :
                              (activeScene.filter || videoFilter) === 'warm' ? 'sepia(30%) saturate(150%) hue-rotate(-15deg)' :
                              (activeScene.filter || videoFilter) === 'cool' ? 'saturate(120%) hue-rotate(15deg) brightness(95%)' :
                              (activeScene.filter || videoFilter) === 'invert' ? 'invert(100%)' :
                              (activeScene.filter || videoFilter) === 'vintage' ? 'contrast(120%) brightness(90%) sepia(50%)' : 'none'
                    }}
                  />
                ) : (
                  <img
                    src={getStreamingUrl(activeScene.url)}
                    alt="preview-main"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: getSceneOpacity(activeScene, currentTime),
                      filter: (activeScene.filter || videoFilter) === 'grayscale' ? 'grayscale(100%)' :
                              (activeScene.filter || videoFilter) === 'sepia' ? 'sepia(100%)' :
                              (activeScene.filter || videoFilter) === 'warm' ? 'sepia(30%) saturate(150%) hue-rotate(-15deg)' :
                              (activeScene.filter || videoFilter) === 'cool' ? 'saturate(120%) hue-rotate(15deg) brightness(95%)' :
                              (activeScene.filter || videoFilter) === 'invert' ? 'invert(100%)' :
                              (activeScene.filter || videoFilter) === 'vintage' ? 'contrast(120%) brightness(90%) sepia(50%)' : 'none'
                    }}
                  />
                )
              ) : (
                <div style={{ color: '#475569', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <Film size={32} />
                  <span>Main Video / Foto Kosong</span>
                </div>
              )}

              {/* Watermark Logo Layer */}
              {showOverlayLayer && overlayImage && (
                <img
                  src={getStreamingUrl(overlayImage.url)}
                  className={`draggable-watermark ${selectedTextId === 'watermark' ? 'selected' : ''}`}
                  onMouseDown={handleWatermarkMouseDown}
                  style={{
                    position: 'absolute',
                    left: `${overlayConfig.x}%`,
                    top: `${overlayConfig.y}%`,
                    width: `${overlayConfig.width}%`,
                    opacity: overlayConfig.opacity,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  alt="watermark"
                />
              )}

              {/* Drag-and-drop Text Caption Layers */}
              {textTracks.map(track => {
                const isActive = currentTime >= track.startTime && currentTime <= track.endTime;
                if (!isActive) return null;
                return (
                  <div
                    key={track.id}
                    className={`draggable-text ${selectedTextId === track.id ? 'selected' : ''}`}
                    onMouseDown={(e) => handleTextMouseDown(e, track.id)}
                    onDoubleClick={() => {
                      const newText = window.prompt("Edit teks:", track.text);
                      if (newText !== null) {
                        setTextTracks(textTracks.map(t => t.id === track.id ? { ...t, text: newText } : t));
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${track.x}%`,
                      top: `${track.y}%`,
                      fontFamily: 'Outfit, Inter, sans-serif',
                      fontWeight: 'bold',
                      fontSize: `${track.size}px`,
                      color: track.color,
                      textShadow: `
                        -2px -2px 0 ${track.outlineColor},  
                         2px -2px 0 ${track.outlineColor},
                        -2px  2px 0 ${track.outlineColor},
                         2px  2px 0 ${track.outlineColor}
                      `,
                      zIndex: 20
                    }}
                  >
                    {track.text}
                  </div>
                );
              })}

              {/* Drag-and-drop Sticker Layers */}
              {stickerTracks.map(track => {
                const isActive = currentTime >= track.startTime && currentTime <= track.endTime;
                if (!isActive) return null;
                return (
                  <img
                    key={track.id}
                    src={getStreamingUrl(track.url)}
                    className={`draggable-sticker ${selectedStickerId === track.id ? 'selected' : ''}`}
                    onMouseDown={(e) => handleStickerMouseDown(e, track.id)}
                    style={{
                      position: 'absolute',
                      left: `${track.x}%`,
                      top: `${track.y}%`,
                      width: `${track.scale || 20}%`,
                      opacity: track.opacity !== undefined ? track.opacity : 1,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 30,
                      pointerEvents: 'auto',
                      userSelect: 'none'
                    }}
                    alt={track.name}
                  />
                );
              })}
            </div>
          </div>

          {/* Time Scrubber & Controls */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={handlePlayToggle} 
                style={{ background: 'linear-gradient(45deg, #3b82f6, #60a5fa)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
              >
                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" style={{ marginLeft: '2px' }} />}
              </button>
              
              {/* Timeline Time Slider */}
              <input 
                type="range" 
                min={0} 
                max={duration} 
                step={0.05} 
                value={currentTime} 
                onChange={(e) => handleSeek(parseFloat(e.target.value))} 
                style={{ flex: 1, cursor: 'pointer', accentColor: '#3b82f6', height: '6px' }}
              />

              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', minWidth: '70px', textAlign: 'right', color: '#94a3b8' }}>
                {currentTime.toFixed(1)}s / {duration}s
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Properties / Inspector panel */}
        <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '430px' }} className="editor-scroll">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
            <Settings size={16} color="#60a5fa" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Properti & Efek</span>
          </div>

          {/* Video canvas settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Rasio Aspek:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                {['16:9', '9:16', '1:1'].map(r => (
                  <button key={r} onClick={() => setAspectRatio(r)} style={{ padding: '0.4rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px', border: 'none', cursor: 'pointer', background: aspectRatio === r ? '#3b82f6' : '#1e293b', color: '#fff' }}>{r}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Total Durasi Komposisi:</label>
              <div style={{ padding: '0.5rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', textAlign: 'center' }}>
                {duration} detik (Mengikuti media)
              </div>
            </div>

            {/* Video scene settings */}
            {selectedScene && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#60a5fa', display: 'block', fontWeight: 700 }}>Properti Klip Video/Foto ({selectedScene.name}):</span>
                
                <div>
                  <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Nama Klip:</label>
                  <input 
                    type="text" 
                    value={selectedScene.name} 
                    onChange={(e) => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, name: e.target.value } : s))} 
                    style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Mulai (s):</label>
                    <input 
                      type="number" 
                      min={0} 
                      max={duration} 
                      step={0.5} 
                      value={selectedScene.startTime} 
                      onChange={(e) => {
                        const newStart = Math.max(0, parseFloat(e.target.value) || 0);
                        const len = selectedScene.endTime - selectedScene.startTime;
                        setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, startTime: newStart, endTime: newStart + len } : s));
                      }} 
                      style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Selesai (s):</label>
                    <input 
                      type="number" 
                      min={0} 
                      max={duration} 
                      step={0.5} 
                      value={selectedScene.endTime} 
                      onChange={(e) => {
                        const newEnd = Math.max(selectedScene.startTime + 0.5, parseFloat(e.target.value) || 0);
                        setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, endTime: newEnd, duration: newEnd - s.startTime } : s));
                      }} 
                      style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Durasi (s):</label>
                  <input 
                    type="number" 
                    min={0.5} 
                    step={0.5} 
                    value={selectedScene.duration} 
                    onChange={(e) => {
                      const newDur = Math.max(0.5, parseFloat(e.target.value) || 5);
                      setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, duration: newDur, endTime: s.startTime + newDur } : s));
                    }} 
                    style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem' }}>
                  <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Audio Video Utama:</label>
                  <button
                    onClick={() => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, muted: !s.muted } : s))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem',
                      background: selectedScene.muted ? '#ef4444' : '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    {selectedScene.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{selectedScene.muted ? 'Muted (Audio Mati)' : 'Unmuted (Audio Aktif)'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem' }}>
                  <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Arah Putar Video:</label>
                  <button
                    onClick={() => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, reverse: !s.reverse } : s))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem',
                      background: selectedScene.reverse ? '#f59e0b' : '#3b82f6',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Sliders size={14} />
                    <span>{selectedScene.reverse ? 'Reversed (Putar Terbalik)' : 'Normal (Putar Maju)'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginTop: '0.4rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Transisi Scene:</label>
                    <select
                      value={selectedScene.transition || 'none'}
                      onChange={(e) => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, transition: e.target.value } : s))}
                      style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      <option value="none">Tanpa Transisi</option>
                      <option value="fade">Pudar (Fade)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Efek Filter:</label>
                    <select
                      value={selectedScene.filter || 'none'}
                      onChange={(e) => setScenes(prev => prev.map(s => s.id === selectedScene.id ? { ...s, filter: e.target.value } : s))}
                      style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      <option value="none">Tanpa Filter</option>
                      <option value="invert">Invert (Negatif)</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="sepia">Sepia (Klasik)</option>
                      <option value="warm">Warm (Hangat)</option>
                      <option value="cool">Cool (Dingin)</option>
                      <option value="vintage">Vintage (Jadul)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const newScene = {
                      ...selectedScene,
                      id: Date.now() + Math.random(),
                      startTime: selectedScene.endTime,
                      endTime: selectedScene.endTime + selectedScene.duration
                    };
                    setScenes(prev => [...prev, newScene]);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem',
                    background: '#8b5cf6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '0.4rem',
                    transition: 'background 0.2s'
                  }}
                >
                  <Copy size={13} />
                  <span>Duplikat Klip (Looping)</span>
                </button>

                <button 
                  onClick={() => {
                    removeScene(selectedScene.id);
                    setSelectedSceneId(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Trash2 size={12} />
                  <span>Hapus Klip Utama</span>
                </button>
              </div>
            )}

            {/* Audio settings */}
            {selectedAudio && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', fontWeight: 700 }}>Volume Track Audio ({selectedAudio.name}):</span>
                <input type="range" min={0} max={1} step={0.05} value={selectedAudio.volume !== undefined ? selectedAudio.volume : 0.5} onChange={(e) => setAudioTracks(prev => prev.map(t => t.id === selectedAudio.id ? { ...t, volume: parseFloat(e.target.value) } : t))} style={{ width: '100%', accentColor: '#f59e0b' }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Mulai (s):</label>
                    <input type="number" min={0} max={duration} step={0.5} value={selectedAudio.startTime} onChange={(e) => setAudioTracks(prev => prev.map(t => t.id === selectedAudio.id ? { ...t, startTime: Math.max(0, parseFloat(e.target.value) || 0) } : t))} style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Selesai (s):</label>
                    <input type="number" min={0} max={duration} step={0.5} value={selectedAudio.endTime} onChange={(e) => setAudioTracks(prev => prev.map(t => t.id === selectedAudio.id ? { ...t, endTime: Math.min(duration, parseFloat(e.target.value) || duration) } : t))} style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const length = selectedAudio.endTime - selectedAudio.startTime;
                    const newTrack = {
                      ...selectedAudio,
                      id: Date.now() + Math.random(),
                      startTime: selectedAudio.endTime,
                      endTime: selectedAudio.endTime + length
                    };
                    setAudioTracks(prev => [...prev, newTrack]);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem',
                    background: '#8b5cf6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '0.4rem',
                    transition: 'background 0.2s'
                  }}
                >
                  <Copy size={13} />
                  <span>Duplikat Audio (Looping)</span>
                </button>

                <button 
                  onClick={() => {
                    setAudioTracks(prev => prev.filter(t => t.id !== selectedAudio.id));
                    setSelectedAudioId(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Trash2 size={12} />
                  <span>Hapus Track Audio</span>
                </button>
              </div>
            )}

            {/* Watermark Logo settings */}
            {overlayImage && selectedTextId === 'watermark' && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Logo/Stamp Air ({overlayImage.name}):</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Posisi X (%):</label>
                    <input type="range" min={0} max={100} value={overlayConfig.x} onChange={(e) => setOverlayConfig({ ...overlayConfig, x: parseInt(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Posisi Y (%):</label>
                    <input type="range" min={0} max={100} value={overlayConfig.y} onChange={(e) => setOverlayConfig({ ...overlayConfig, y: parseInt(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Ukuran (%):</label>
                    <input type="range" min={5} max={50} value={overlayConfig.width} onChange={(e) => setOverlayConfig({ ...overlayConfig, width: parseInt(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Opasitas:</label>
                    <input type="range" min={0.1} max={1} step={0.1} value={overlayConfig.opacity} onChange={(e) => setOverlayConfig({ ...overlayConfig, opacity: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                </div>
                <button onClick={() => setOverlayImage(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.2rem' }}>Hapus Stamp/Logo</button>
              </div>
            )}

            {/* Selected Sticker settings */}
            {selectedStickerId && selectedStickerId !== 'watermark' && (
              (() => {
                const selectedSticker = stickerTracks.find(t => t.id === selectedStickerId);
                if (!selectedSticker) return null;
                return (
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#ec4899', display: 'block', fontWeight: 700 }}>Properti Stiker Terpilih ({selectedSticker.name}):</span>
                    
                    <div>
                      <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Nama Stiker:</label>
                      <input 
                        type="text" 
                        value={selectedSticker.name} 
                        onChange={(e) => setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, name: e.target.value } : t))} 
                        style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                      <div>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Mulai (s):</label>
                        <input 
                          type="number" 
                          min={0} 
                          max={duration} 
                          step={0.5} 
                          value={selectedSticker.startTime} 
                          onChange={(e) => {
                            const newStart = Math.max(0, parseFloat(e.target.value) || 0);
                            const len = selectedSticker.endTime - selectedSticker.startTime;
                            setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, startTime: newStart, endTime: newStart + len } : t));
                          }} 
                          style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Selesai (s):</label>
                        <input 
                          type="number" 
                          min={0} 
                          max={duration} 
                          step={0.5} 
                          value={selectedSticker.endTime} 
                          onChange={(e) => {
                            const newEnd = Math.max(selectedSticker.startTime + 0.5, parseFloat(e.target.value) || 0);
                            setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, endTime: newEnd } : t));
                          }} 
                          style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                      <div>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Skala/Ukuran (%):</label>
                        <input 
                          type="range" 
                          min={5} 
                          max={100} 
                          value={selectedSticker.scale || 20} 
                          onChange={(e) => setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, scale: parseInt(e.target.value) } : t))} 
                          style={{ width: '100%' }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Opasitas:</label>
                        <input 
                          type="range" 
                          min={0.1} 
                          max={1} 
                          step={0.1} 
                          value={selectedSticker.opacity !== undefined ? selectedSticker.opacity : 1} 
                          onChange={(e) => setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, opacity: parseFloat(e.target.value) } : t))} 
                          style={{ width: '100%' }} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                      <div>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Posisi X (%):</label>
                        <input 
                          type="range" 
                          min={0} 
                          max={100} 
                          value={selectedSticker.x} 
                          onChange={(e) => setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, x: parseInt(e.target.value) } : t))} 
                          style={{ width: '100%' }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Posisi Y (%):</label>
                        <input 
                          type="range" 
                          min={0} 
                          max={100} 
                          value={selectedSticker.y} 
                          onChange={(e) => setStickerTracks(prev => prev.map(t => t.id === selectedStickerId ? { ...t, y: parseInt(e.target.value) } : t))} 
                          style={{ width: '100%' }} 
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const length = selectedSticker.endTime - selectedSticker.startTime;
                        const newTrack = {
                          ...selectedSticker,
                          id: Date.now() + Math.random(),
                          startTime: selectedSticker.endTime,
                          endTime: selectedSticker.endTime + length
                        };
                        setStickerTracks(prev => [...prev, newTrack]);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem',
                        background: '#8b5cf6',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '0.4rem',
                        transition: 'background 0.2s'
                      }}
                    >
                      <Copy size={13} />
                      <span>Duplikat Stiker (Looping)</span>
                    </button>

                    <button 
                      onClick={() => {
                        setStickerTracks(prev => prev.filter(t => t.id !== selectedStickerId));
                        setSelectedStickerId(null);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Trash2 size={12} />
                      <span>Hapus Stiker</span>
                    </button>
                  </div>
                );
              })()
            )}

            {/* Selected text settings */}
            {selectedText && selectedTextId !== 'watermark' && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Pengaturan Teks Terpilih:</span>
                <input 
                  type="text" 
                  value={selectedText.text} 
                  onChange={(e) => updateSelectedText('text', e.target.value)} 
                  style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Mulai (s):</label>
                    <input type="number" min={0} max={duration} step={0.5} value={selectedText.startTime} onChange={(e) => updateSelectedText('startTime', Math.max(0, parseFloat(e.target.value) || 0))} style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Selesai (s):</label>
                    <input type="number" min={0} max={duration} step={0.5} value={selectedText.endTime} onChange={(e) => updateSelectedText('endTime', Math.min(duration, parseFloat(e.target.value) || duration))} style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Ukuran Font:</label>
                    <input type="number" min={10} max={80} value={selectedText.size} onChange={(e) => updateSelectedText('size', parseInt(e.target.value) || 20)} style={{ width: '100%', padding: '0.3rem', background: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Posisi Y (%):</label>
                    <input type="range" min={0} max={100} value={selectedText.y} onChange={(e) => updateSelectedText('y', parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Warna Teks:</label>
                    <input type="color" value={selectedText.color} onChange={(e) => updateSelectedText('color', e.target.value)} style={{ width: '100%', border: 'none', height: '24px', cursor: 'pointer', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Outline Teks:</label>
                    <input type="color" value={selectedText.outlineColor} onChange={(e) => updateSelectedText('outlineColor', e.target.value)} style={{ width: '100%', border: 'none', height: '24px', cursor: 'pointer', borderRadius: '4px' }} />
                  </div>
                </div>
                <button 
                  onClick={() => deleteTextTrack(selectedText.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Trash2 size={12} />
                  <span>Hapus Trek Teks</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Timeline tracks display */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.4rem' }}>
          <Scissors size={14} color="#ec4899" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trek Garis Waktu (Timeline Editor)</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          {/* Left Column: Track Labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100px', padding: '0.5rem 0', justifyContent: 'flex-start' }}>
            <div style={{ height: `${videoHeight}px`, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, gap: '0.25rem' }}>
              <Film size={12} /> Utama (Klip)
            </div>
            <div style={{ height: `${audioHeight}px`, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, gap: '0.25rem' }}>
              <Music size={12} /> Audio Latar
            </div>
            <div style={{ height: `${textHeight}px`, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#10b981', fontWeight: 700, gap: '0.25rem' }}>
              <Type size={12} /> Trek Teks
            </div>
            <div style={{ height: `${stickerHeight}px`, display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#ec4899', fontWeight: 700, gap: '0.25rem' }}>
              <Sparkles size={12} /> Trek Stiker
            </div>
          </div>

          {/* Right Column: Track Rows + Playhead Line */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget || e.target.getAttribute('data-timeline-row')) {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newTime = Math.max(0, Math.min(duration, percentage * duration));
                handleSeek(newTime);
              }
            }}
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.8rem', 
              position: 'relative', 
              background: '#090d16', 
              padding: '0.6rem', 
              borderRadius: '12px',
              cursor: 'pointer' 
            }}
          >
            {/* Utama Track Container (Dynamic Multi-lane) */}
            <div data-timeline-row="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'transparent', position: 'relative' }}>
              {scenes.length === 0 ? (
                <div style={{ background: '#1e293b', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.68rem', color: '#94a3b8' }}>
                  Pilih Klip Utama dari Pustaka Media Anda
                </div>
              ) : (
                videoLanes.map((lane, laneIdx) => (
                  <div 
                    key={laneIdx} 
                    style={{ 
                      background: '#1e293b', 
                      height: '28px', 
                      borderRadius: '6px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      userSelect: 'none',
                      width: '100%'
                    }}
                  >
                    {lane.map(track => {
                      const leftPercent = (track.startTime / duration) * 100;
                      const widthPercent = ((track.endTime - track.startTime) / duration) * 100;
                      return (
                        <div
                          key={track.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSceneId(track.id);
                            setSelectedAudioId(null);
                            setSelectedTextId(null);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            height: '100%',
                            background: selectedSceneId === track.id ? '#1e3a8a' : '#1e293b',
                            borderRadius: '4px',
                            border: selectedSceneId === track.id ? '2px solid #60a5fa' : '1px solid #3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Left Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'video', 'resizeLeft')}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '4px 0 0 4px',
                              zIndex: 2
                            }}
                          />

                          {/* Middle Grab */}
                          <div
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'video', 'move')}
                            style={{
                              flex: 1,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              cursor: 'grab',
                              fontSize: '0.62rem',
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              zIndex: 1,
                              padding: '0 8px 0 12px'
                            }}
                          >
                            🎬 {track.name}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeScene(track.id);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '0 8px 0 2px',
                              zIndex: 3,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Hapus Video"
                          >
                            <Trash2 size={11} />
                          </button>

                          {/* Right Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'video', 'resizeRight')}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '0 4px 4px 0',
                              zIndex: 2
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Audio Track Container (Dynamic Multi-lane) */}
            <div data-timeline-row="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'transparent', position: 'relative' }}>
              {audioTracks.length === 0 ? (
                <div style={{ background: '#1e293b', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.68rem', color: '#94a3b8' }}>
                  Tambahkan backsound MP3 ke timeline
                </div>
              ) : (
                audioLanes.map((lane, laneIdx) => (
                  <div 
                    key={laneIdx} 
                    style={{ 
                      background: '#1e293b', 
                      height: '28px', 
                      borderRadius: '6px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      userSelect: 'none',
                      width: '100%'
                    }}
                  >
                    {lane.map(track => {
                      const leftPercent = (track.startTime / duration) * 100;
                      const widthPercent = ((track.endTime - track.startTime) / duration) * 100;
                      return (
                        <div
                          key={track.id}
                          style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            height: '100%',
                            background: selectedAudioId === track.id ? '#b45309' : '#78350f',
                            borderRadius: '4px',
                            border: selectedAudioId === track.id ? '2px solid #fbbf24' : '1px solid #d97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Left Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'audio', 'resizeLeft')}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '4px 0 0 4px',
                              zIndex: 2
                            }}
                          />

                          {/* Middle Grab */}
                          <div
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'audio', 'move')}
                            style={{
                              flex: 1,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              cursor: 'grab',
                              fontSize: '0.62rem',
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              zIndex: 1,
                              padding: '0 8px 0 12px'
                            }}
                          >
                            🎵 {track.name}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAudioTracks(prev => prev.filter(t => t.id !== track.id));
                              if (selectedAudioId === track.id) setSelectedAudioId(null);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '0 8px 0 2px',
                              zIndex: 3,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Hapus Audio"
                          >
                            <Trash2 size={11} />
                          </button>

                          {/* Right Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'audio', 'resizeRight')}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '0 4px 4px 0',
                              zIndex: 2
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Text Track Container (Dynamic Multi-lane) */}
            <div data-timeline-row="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'transparent', position: 'relative' }}>
              {textTracks.length === 0 ? (
                <div style={{ background: '#1e293b', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.68rem', color: '#94a3b8' }}>
                  Tambahkan teks ke timeline
                </div>
              ) : (
                textLanes.map((lane, laneIdx) => (
                  <div 
                    key={laneIdx} 
                    style={{ 
                      background: '#1e293b', 
                      height: '28px', 
                      borderRadius: '6px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      userSelect: 'none',
                      width: '100%'
                    }}
                  >
                    {lane.map(track => {
                      const leftPercent = (track.startTime / duration) * 100;
                      const widthPercent = ((track.endTime - track.startTime) / duration) * 100;
                      return (
                        <div
                          key={track.id}
                          style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            height: '100%',
                            background: selectedTextId === track.id ? '#059669' : '#047857',
                            borderRadius: '4px',
                            border: selectedTextId === track.id ? '2px solid #3b82f6' : '1px solid #10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Left Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'text', 'resizeLeft')}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '4px 0 0 4px',
                              zIndex: 2
                            }}
                          />

                          {/* Middle Draggable/Move area */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'text', 'move')}
                            style={{
                              flex: 1,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              cursor: 'grab',
                              userSelect: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              zIndex: 1,
                              padding: '0 8px 0 12px'
                            }}
                          >
                            {track.text}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTextTrack(track.id);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '0 8px 0 2px',
                              zIndex: 3,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Hapus Teks"
                          >
                            <Trash2 size={11} />
                          </button>

                          {/* Right Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'text', 'resizeRight')}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '0 4px 4px 0',
                              zIndex: 2
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Sticker Track Container (Dynamic Multi-lane) */}
            <div data-timeline-row="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'transparent', position: 'relative' }}>
              {stickerTracks.length === 0 ? (
                <div style={{ background: '#1e293b', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.68rem', color: '#94a3b8' }}>
                  Tambahkan stiker ke timeline
                </div>
              ) : (
                stickerLanes.map((lane, laneIdx) => (
                  <div 
                    key={laneIdx} 
                    style={{ 
                      background: '#1e293b', 
                      height: '28px', 
                      borderRadius: '6px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      userSelect: 'none',
                      width: '100%'
                    }}
                  >
                    {lane.map(track => {
                      const leftPercent = (track.startTime / duration) * 100;
                      const widthPercent = ((track.endTime - track.startTime) / duration) * 100;
                      return (
                        <div
                          key={track.id}
                          style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            height: '100%',
                            background: selectedStickerId === track.id ? '#9d174d' : '#831843',
                            borderRadius: '4px',
                            border: selectedStickerId === track.id ? '2px solid #ef4444' : '1px solid #ec4899',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Left Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'sticker', 'resizeLeft')}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '4px 0 0 4px',
                              zIndex: 2
                            }}
                          />

                          {/* Middle Draggable/Move area */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'sticker', 'move')}
                            style={{
                              flex: 1,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              cursor: 'grab',
                              userSelect: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              zIndex: 1,
                              padding: '0 8px 0 12px',
                              fontSize: '0.62rem',
                              color: '#fff'
                            }}
                          >
                            ✨ {track.name}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStickerTracks(prev => prev.filter(t => t.id !== track.id));
                              if (selectedStickerId === track.id) setSelectedStickerId(null);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '0 8px 0 2px',
                              zIndex: 3,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Hapus Stiker"
                          >
                            <Trash2 size={11} />
                          </button>

                          {/* Right Resize Handle */}
                          <div 
                            onMouseDown={(e) => handleTimelineMouseDown(e, track.id, 'sticker', 'resizeRight')}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              cursor: 'ew-resize',
                              background: 'rgba(255, 255, 255, 0.25)',
                              borderRadius: '0 4px 4px 0',
                              zIndex: 2
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Moving Playhead Pointer Line */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(currentTime / duration) * 100}%`,
                width: '2px',
                background: '#ef4444',
                pointerEvents: 'none',
                zIndex: 10,
                transition: isPlaying ? 'none' : 'left 0.1s ease'
              }}
            >
              {/* circular playhead handle */}
              <div style={{
                position: 'absolute',
                top: '-4px',
                left: '-5px',
                width: '12px',
                height: '12px',
                background: '#ef4444',
                borderRadius: '50%',
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)'
              }} />
            </div>

          </div>
        </div>
      </div>

      {/* Render/Export Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', flexWrap: 'wrap', borderTop: '1px solid #1e293b', paddingTop: '1.2rem' }}>
        <button 
          onClick={() => handleRenderVideo('download')} 
          disabled={rendering}
          className="render-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
        >
          <Download size={16} />
          <span>Render & Unduh Video</span>
        </button>

        <button 
          onClick={() => handleRenderVideo('media')} 
          disabled={rendering}
          className="render-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', border: 'none', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
        >
          <Folder size={16} />
          <span>Render & Simpan ke Pustaka Media</span>
        </button>

        <button 
          onClick={() => handleRenderVideo('publish')} 
          disabled={rendering}
          className="render-btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', border: 'none', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s', boxShadow: '0 8px 16px rgba(236,72,153,0.2)' }}
        >
          <Send size={16} />
          <span>Render & Jadwalkan Postingan</span>
        </button>
      </div>

      {/* Rendering Overlay */}
      {rendering && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '3rem 2.5rem', borderRadius: '24px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '2rem', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', border: '5px solid #1e293b', borderTopColor: '#ec4899', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }}></div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                {renderProgress}%
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Merender Video Anda...</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: '1.5', margin: 0 }}>
              Merakit frame demi frame visual, filter, stamp logo, dan musik latar. Mohon tunggu.
            </p>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
        </div>
      )}

      {/* Hidden Canvas for rendering/exporting */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Global CSS Inject */}
      <style dangerouslySetInnerHTML={{ __html: `
        .video-editor-container.fullscreen-mode {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
          width: 100vw !important;
          height: 100vh !important;
          border-radius: 0 !important;
          background: #090d16 !important;
        }
        .preview-wrapper {
          position: relative;
          overflow: hidden;
          background: #020617;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .draggable-text {
          position: absolute;
          cursor: move;
          user-select: none;
          white-space: nowrap;
          transform: translate(-50%, -50%);
        }
        .draggable-text.selected {
          outline: 2px dashed #3b82f6;
          padding: 2px 6px;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 4px;
        }
        .draggable-watermark {
          position: absolute;
          cursor: move;
          user-select: none;
          transform: translate(-50%, -50%);
        }
        .draggable-watermark.selected {
          outline: 2px dashed #10b981;
          background: rgba(16, 185, 129, 0.15);
          border-radius: 4px;
        }
        .media-library-card:hover {
          border-color: #60a5fa !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .media-library-card {
          transition: all 0.2s ease-in-out;
        }
        .draggable-sticker {
          position: absolute;
          cursor: move;
          user-select: none;
          transform: translate(-50%, -50%);
        }
        .draggable-sticker.selected {
          outline: 2px dashed #ec4899;
          background: rgba(236, 72, 153, 0.15);
          border-radius: 4px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 1024px) {
          .editor-grid-responsive {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
        @media (max-width: 640px) {
          .editor-grid-responsive {
            grid-template-columns: 1fr !important;
          }
          .video-editor-container {
            padding: 0.8rem !important;
            border-radius: 12px !important;
          }
        }
      ` }} />

    </div>
  );
};

export default VideoEditor;
