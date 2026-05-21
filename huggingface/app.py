import os
import re
import subprocess
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify, render_template_string
import requests
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)

# Native CORS middleware to support client-side status checks from the PWA dashboard
@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
    return response

# =========================================================================
# FIREBASE ADMIN INITIALIZATION
# =========================================================================
db = None
try:
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    
    if project_id and client_email and private_key:
        formatted_key = private_key.replace("\\n", "\n")
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": project_id,
            "private_key": formatted_key,
            "client_email": client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase Admin successfully initialized!")
    else:
        print("Offline/Unconfigured Mode: Firebase environment variables are missing.")
except Exception as e:
    print(f"Error initializing Firebase: {e}")

# =========================================================================
# STATE MANAGER & STREAM CONTROL
# =========================================================================
stream_lock = threading.Lock()
active_stream = {
    "status": "IDLE",       # IDLE, DOWNLOADING, STREAMING, ERROR
    "post_id": None,
    "video_url": None,
    "rtmp_url": None,
    "duration": None,
    "start_time": None,
    "error_message": "",
    "process": None,        # Popen instance FFmpeg
    "logs": []
}

HF_SECRET = os.getenv("HF_SECRET", "SnooplinkSuperSecret123")
TEMP_VIDEO_PATH = "/tmp/stream_input.mp4"

# =========================================================================
# GOOGLE DRIVE DOWNLOAD & WARNING BYPASS LOGIC
# =========================================================================
def get_direct_download_url(url):
    file_id = ""
    if "/file/d/" in url:
        parts = url.split("/file/d/")
        if len(parts) > 1:
            file_id = parts[1].split("/")[0].split("?")[0]
    elif "id=" in url:
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        if "id" in params:
            file_id = params["id"][0]
    elif "/uc" in url:
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        if "id" in params:
            file_id = params["id"][0]
            
    if not file_id:
        return url
    return f"https://docs.google.com/uc?export=download&id={file_id}"

def download_video(url, dest_path):
    download_url = get_direct_download_url(url)
    print(f"Resolving download URL: {download_url}")
    session = requests.Session()
    response = session.get(download_url, stream=True)
    
    # Detect Google Drive warning screen for large files (grabs the token cookie)
    token = None
    for key, val in response.cookies.items():
        if key.startswith("download_warning"):
            token = val
            break
            
    if token:
        file_id = re.search(r'id=([^&]+)', download_url) or re.search(r'id=([^&]+)', url)
        file_id = file_id.group(1) if file_id else ""
        download_url = f"https://docs.google.com/uc?export=download&confirm={token}&id={file_id}"
        print(f"Re-fetching large file with warning confirmation: {download_url}")
        response = session.get(download_url, stream=True)
        
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024*1024):
            if chunk:
                f.write(chunk)
    print("Download completed successfully.")

# =========================================================================
# YOUTUBE LIVE LIFECYCLE MANAGEMENT
# =========================================================================
def end_youtube_broadcast(post_id):
    if not db:
        print("Firebase DB not initialized, skipping ending YouTube broadcast.")
        return
    try:
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()
        if not post_doc.exists:
            print(f"Post {post_id} not found in Firestore.")
            return
            
        post_data = post_doc.to_dict() or {}
        platform = post_data.get('platform')
        broadcast_id = post_data.get('ytBroadcastId')
        account_id = post_data.get('accountId')
        
        if platform != 'youtube' or not broadcast_id or not account_id:
            return
            
        print(f"Attempting to end YouTube live broadcast: {broadcast_id} for account: {account_id}...")
        
        account_ref = db.collection('social_accounts').document(account_id)
        account_doc = account_ref.get()
        if not account_doc.exists:
            print(f"Social account {account_id} not found in Firestore.")
            return
            
        account_data = account_doc.to_dict() or {}
        refresh_token = account_data.get('accessToken')
        
        if not refresh_token:
            print("YouTube refresh token (accessToken) is missing in social account.")
            return
            
        # Refresh YouTube access token
        client_id = "687270813688-8fsdi9hsnjrv8jvna051acs7ofiuk0uo.apps.googleusercontent.com"
        client_secret = "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"
        
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        token_res = requests.post(token_url, data=token_data)
        token_json = token_res.json()
        
        if "access_token" not in token_json:
            print(f"Failed to refresh YouTube token: {token_json}")
            return
            
        access_token = token_json["access_token"]
        
        # Transition YouTube broadcast status to complete
        transition_url = "https://www.googleapis.com/youtube/v3/liveBroadcasts/transition"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        params = {
            "broadcastStatus": "complete",
            "id": broadcast_id,
            "part": "id,status"
        }
        
        res = requests.post(transition_url, headers=headers, params=params)
        print(f"YouTube broadcast transition response: {res.status_code} - {res.text}")
        
    except Exception as e:
        print(f"Error in end_youtube_broadcast: {e}")

# =========================================================================
# STREAMING RUNNER THREAD
# =========================================================================
def run_streaming_process(post_id, video_url, rtmp_url, duration):
    global active_stream
    
    with stream_lock:
        active_stream["status"] = "DOWNLOADING"
        active_stream["post_id"] = post_id
        active_stream["video_url"] = video_url
        active_stream["rtmp_url"] = rtmp_url
        active_stream["duration"] = duration
        active_stream["start_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        active_stream["error_message"] = ""
        active_stream["logs"] = ["Memulai pengunduhan video dari Google Drive..."]
        
    try:
        bitrate = "copy"
        backsound_urls = []
        image_stamp_url = None
        combined_audio_path = None
        
        # 1. Update status to Processing in Firestore and fetch configuration
        if db:
            post_ref = db.collection('posts').document(post_id)
            post_doc = post_ref.get()
            if post_doc.exists:
                post_data = post_doc.to_dict()
                bitrate = post_data.get('bitrate', 'copy')
                backsound_urls = post_data.get('backsoundUrls', [])
                image_stamp_url = post_data.get('imageStampUrl', None)
                
            db.collection('posts').document(post_id).update({
                'status': 'Processing',
                'error_log': 'Hugging Face: Mengunduh file media...'
            })
            
        # 2. Download file locally to avoid FFmpeg seek/network problems on looped streams
        download_video(video_url, TEMP_VIDEO_PATH)
        
        # Download and process backsounds if provided
        downloaded_backsounds = []
        if backsound_urls:
            with stream_lock:
                active_stream["logs"].append("Mengunduh file backsound MP3...")
            for idx, bs_url in enumerate(backsound_urls):
                bs_path = f"/tmp/backsound_{idx}.mp3"
                if db:
                    db.collection('posts').document(post_id).update({
                        'error_log': f'Hugging Face: Mengunduh backsound {idx+1}/{len(backsound_urls)}...'
                    })
                download_video(bs_url, bs_path)
                downloaded_backsounds.append(bs_path)
                
            # Concatenate backsounds if multiple
            if len(downloaded_backsounds) > 1:
                with stream_lock:
                    active_stream["logs"].append("Menggabungkan file-file backsound...")
                concat_cmd = ["ffmpeg", "-y"]
                for bs in downloaded_backsounds:
                    concat_cmd.extend(["-i", bs])
                
                # Convert each backsound to 44100Hz stereo to prevent layout/rate mismatch errors
                filter_str = ""
                for i in range(len(downloaded_backsounds)):
                    filter_str += f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a{i}];"
                filter_str += "".join([f"[a{i}]" for i in range(len(downloaded_backsounds))])
                filter_str += f"concat=n={len(downloaded_backsounds)}:v=0:a=1[outa]"
                
                concat_cmd.extend([
                    "-filter_complex", filter_str,
                    "-map", "[outa]",
                    "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                    "/tmp/backsound_combined.mp3"
                ])
                res = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode != 0:
                    raise Exception(f"Gagal menggabungkan backsound: {res.stderr.decode('utf-8', errors='ignore')}")
                combined_audio_path = "/tmp/backsound_combined.mp3"
                
                # Cleanup raw downloaded backsound files to save space
                for bs in downloaded_backsounds:
                    if bs != combined_audio_path and os.path.exists(bs):
                        try: os.remove(bs)
                        except: pass
            elif len(downloaded_backsounds) == 1:
                # Standardize single audio file to stereo 44100Hz to prevent playback issues
                standard_path = "/tmp/backsound_standard.mp3"
                cmd = ["ffmpeg", "-y", "-i", downloaded_backsounds[0], "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100", "-ac", "2", standard_path]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode == 0:
                    combined_audio_path = standard_path
                else:
                    combined_audio_path = downloaded_backsounds[0]
        
        # Process image stamp watermark cover if provided
        if image_stamp_url:
            with stream_lock:
                active_stream["logs"].append("Mengunduh gambar stamp untuk watermark cover...")
            stamp_path = "/tmp/image_stamp.png"
            if db:
                db.collection('posts').document(post_id).update({
                    'error_log': 'Hugging Face: Mengunduh gambar stamp...'
                })
            download_video(image_stamp_url, stamp_path)
            
            with stream_lock:
                active_stream["logs"].append("Menempelkan gambar stamp ke video (5% dari konten)...")
            if db:
                db.collection('posts').document(post_id).update({
                    'error_log': 'Hugging Face: Menempelkan gambar stamp...'
                })
            
            stamp_cmd = [
                "ffmpeg", "-y", "-i", TEMP_VIDEO_PATH, "-loop", "1", "-i", stamp_path,
                "-filter_complex", "[1:v][0:v]scale2ref=w=iw*0.05:h=-1[stamp][video];[video][stamp]overlay=main_w-overlay_w-10:main_h-overlay_h-10:shortest=1[outv]",
                "-map", "[outv]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "superfast", "-crf", "23",
                "-c:a", "copy",
                "/tmp/stream_input_stamped.mp4"
            ]
            res = subprocess.run(stamp_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode != 0:
                raise Exception(f"Gagal menempelkan gambar stamp: {res.stderr.decode('utf-8', errors='ignore')}")
            os.replace("/tmp/stream_input_stamped.mp4", TEMP_VIDEO_PATH)
            
            # Cleanup downloaded image stamp
            if os.path.exists(stamp_path):
                try: os.remove(stamp_path)
                except: pass
        
        # Check if cancelled during download/processing
        with stream_lock:
            if active_stream["post_id"] != post_id or active_stream["status"] == "IDLE":
                print("Stream has been cancelled during download.")
                return
            active_stream["status"] = "STREAMING"
            active_stream["logs"] = ["Video diunduh dan diproses. Memulai FFmpeg..."]
            
        # 3. Update status to LIVE in Firestore
        if db:
            db.collection('posts').document(post_id).update({
                'status': 'LIVE',
                'error_log': 'Hugging Face: Siaran sedang mengudara.'
            })
            
        start_datetime = datetime.now()
        retry_count = 0
        backoff_delay = 5  # Mulai penundaan di 5 detik
        max_backoff = 60   # Maksimal penundaan 60 detik
        
        while True:
            # Check if cancelled before starting/retrying
            with stream_lock:
                if active_stream["post_id"] != post_id or active_stream["status"] == "IDLE":
                    print("Stream has been cancelled or stopped.")
                    break
                active_stream["status"] = "STREAMING"
            
            # Calculate remaining duration if not 24/7
            cmd_duration = []
            if duration != "24/7":
                try:
                    duration_sec = int(duration) * 60
                except ValueError:
                    duration_sec = 3600
                
                elapsed = (datetime.now() - start_datetime).total_seconds()
                remaining_sec = duration_sec - elapsed
                if remaining_sec <= 0:
                    with stream_lock:
                        active_stream["logs"].append("[SYSTEM] Durasi live streaming telah terpenuhi secara lengkap.")
                    break
                cmd_duration = ["-t", str(int(remaining_sec))]

            # 4. Compile FFmpeg Command
            inputs = ["-re", "-stream_loop", "-1", "-i", TEMP_VIDEO_PATH]
            if combined_audio_path:
                inputs.extend(["-stream_loop", "-1", "-i", combined_audio_path])
                mapping = ["-map", "0:v:0", "-map", "1:a:0"]
            else:
                mapping = ["-map", "0:v:0", "-map", "0:a?"]
     
            if bitrate == "copy":
                bitrate = "3000k"
                
            buf_size = f"{int(bitrate.replace('k', '')) * 2}k"
            vcodec = ["-c:v", "libx264", "-b:v", bitrate, "-maxrate", bitrate, "-bufsize", buf_size, "-pix_fmt", "yuv420p", "-g", "60", "-preset", "ultrafast", "-tune", "zerolatency"]
            acodec = ["-c:a", "aac", "-b:a", "128k", "-ar", "44100"]

            cmd = ["ffmpeg", "-y"]
            cmd.extend(inputs)
            if cmd_duration:
                cmd.extend(cmd_duration)
            cmd.extend(mapping)
            cmd.extend(vcodec)
            cmd.extend(acodec)
            # Add network timeout in microseconds (15 seconds) to prevent hanging silently
            cmd.extend(["-rw_timeout", "15000000"])
            cmd.extend(["-f", "flv", rtmp_url])
                
            # 5. Run FFmpeg subprocess
            with stream_lock:
                active_stream["logs"].append(f"[SYSTEM] Memulai proses FFmpeg (Percobaan #{retry_count + 1})...")
                active_stream["logs"].append(f"FFmpeg command: {' '.join(cmd)}")
                print(f"Running FFmpeg command: {' '.join(cmd)}")

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True
            )
            
            with stream_lock:
                active_stream["process"] = process
                
            # Read FFmpeg logs in real-time
            for line in iter(process.stdout.readline, ""):
                with stream_lock:
                    if active_stream["post_id"] != post_id or active_stream["status"] == "IDLE":
                        break
                    if len(active_stream["logs"]) > 45:
                        active_stream["logs"].pop(0)
                    active_stream["logs"].append(line.strip())
                    
            process.stdout.close()
            return_code = process.wait()
            
            # Check if cancelled during/after FFmpeg execution
            with stream_lock:
                if active_stream["post_id"] != post_id or active_stream["status"] == "IDLE":
                    break
            
            # 6. Stream Finalization checking
            if return_code == 0:
                with stream_lock:
                    active_stream["status"] = "IDLE"
                    active_stream["logs"].append("Streaming selesai secara normal.")
                    if db:
                        db.collection('posts').document(post_id).update({
                            'status': 'Completed',
                            'error_log': ''
                        })
                break
            else:
                retry_count += 1
                with stream_lock:
                    active_stream["logs"].append(f"[SYSTEM] WARNING: FFmpeg terhenti dengan kode {return_code} (Kemungkinan gangguan jaringan).")
                    active_stream["logs"].append(f"[SYSTEM] Mencoba menghubungkan kembali dalam {backoff_delay} detik (Percobaan #{retry_count})...")
                    if db:
                        try:
                            db.collection('posts').document(post_id).update({
                                'error_log': f'Gangguan jaringan (Broken pipe). Reconnecting in {backoff_delay}s... (Retry #{retry_count})'
                            })
                        except:
                            pass
                
                # Interruptible sleep interval check
                sleep_interval = 0.5
                slept = 0.0
                while slept < backoff_delay:
                    with stream_lock:
                        if active_stream["post_id"] != post_id or active_stream["status"] == "IDLE":
                            break
                    time.sleep(sleep_interval)
                    slept += sleep_interval
                    
                # Exponential backoff update
                backoff_delay = min(backoff_delay * 1.5, max_backoff)
                        
    except Exception as e:
        print(f"Error in stream thread: {e}")
        with stream_lock:
            if active_stream["post_id"] == post_id:
                active_stream["status"] = "ERROR"
                active_stream["error_message"] = str(e)
                active_stream["logs"].append(f"EXCEPTION: {str(e)}")
                if db:
                    db.collection('posts').document(post_id).update({
                        'status': 'Failed',
                        'error_log': str(e)
                    })
    finally:
        # End YouTube broadcast if applicable
        end_youtube_broadcast(post_id)

        # Delete temporary files
        for p in [TEMP_VIDEO_PATH, "/tmp/stream_input_replaced.mp4", "/tmp/backsound_combined.mp3", "/tmp/image_stamp.png", "/tmp/stream_input_stamped.mp4"]:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass
                
        import glob
        for p in glob.glob("/tmp/backsound_*.mp3"):
            try: os.remove(p)
            except: pass
            
        with stream_lock:
            if active_stream["post_id"] == post_id:
                active_stream["process"] = None

# =========================================================================
# AUTO-RESUME LIVE STREAMS ON STARTUP
# =========================================================================
def check_and_resume_active_stream():
    if not db:
        return
    try:
        print("Checking Firestore for active stream to resume...")
        docs = db.collection('posts').where('status', '==', 'LIVE').stream()
        for doc in docs:
            post_data = doc.to_dict()
            post_id = doc.id
            post_type = post_data.get('postType', 'post')
            
            if post_type == 'live':
                media_url = post_data.get('mediaUrl')
                stream_key = post_data.get('streamKey')
                duration = post_data.get('liveDuration', '24/7')
                
                if media_url and stream_key:
                    if stream_key.startswith("rtmp://") or stream_key.startswith("rtmps://"):
                        rtmp_url = stream_key
                    else:
                        rtmp_url = f"rtmp://a.rtmp.youtube.com/live2/{stream_key}"
                        
                    print(f"Resuming live stream for post {post_id}")
                    t = threading.Thread(
                        target=run_streaming_process,
                        args=(post_id, media_url, rtmp_url, duration)
                    )
                    t.daemon = True
                    t.start()
                    break
    except Exception as e:
        print(f"Error resuming active stream: {e}")

# Call resume scan in a separate background thread at startup
threading.Thread(target=check_and_resume_active_stream).start()

# =========================================================================
# WEB ROUTES & CONTROLLERS
# =========================================================================

# Dashboard Web UI (Mewah & Premium - Tailwind CSS Style)
@app.route("/")
def dashboard():
    html_template = """
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Snooplink Pro - Streaming Node Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #09090b; }
            .glow { box-shadow: 0 0 20px rgba(99, 102, 241, 0.1); }
            .glow-live { box-shadow: 0 0 25px rgba(239, 68, 68, 0.4); animation: pulse 2s infinite; }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        </style>
    </head>
    <body class="text-zinc-100 min-h-screen flex flex-col">
        <header class="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
            <div class="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-white text-lg">S</div>
                    <div>
                        <h1 class="text-lg font-extrabold tracking-tight">Snooplink Pro</h1>
                        <p class="text-xs text-zinc-400 font-semibold">Live Streaming Engine</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <span class="text-sm font-bold text-emerald-400">Online & Active</span>
                </div>
            </div>
        </header>

        <main class="flex-grow max-w-6xl w-full mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
            <!-- Left Column: Status Card -->
            <div class="md:col-span-1 flex flex-col gap-6">
                <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 glow flex flex-col">
                    <h2 class="text-zinc-400 text-sm font-bold tracking-wider uppercase mb-4">Status Node</h2>
                    <div class="flex items-center gap-4 mb-6" id="status-container">
                        {% if state.status == 'STREAMING' %}
                            <div class="w-5 h-5 rounded-full bg-red-500 glow-live"></div>
                            <span class="text-2xl font-extrabold text-red-500">LIVE</span>
                        {% elif state.status == 'DOWNLOADING' %}
                            <div class="w-5 h-5 rounded-full bg-amber-500 animate-pulse"></div>
                            <span class="text-2xl font-extrabold text-amber-500">DOWNLOADING</span>
                        {% elif state.status == 'ERROR' %}
                            <div class="w-5 h-5 rounded-full bg-rose-500"></div>
                            <span class="text-2xl font-extrabold text-rose-500">ERROR</span>
                        {% else %}
                            <div class="w-5 h-5 rounded-full bg-zinc-600"></div>
                            <span class="text-2xl font-extrabold text-zinc-400">IDLE</span>
                        {% endif %}
                    </div>

                    <div id="details-container">
                        {% if state.post_id %}
                        <div class="border-t border-zinc-800 pt-4 flex flex-col gap-3 text-sm text-zinc-300">
                            <div>
                                <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Post ID</span>
                                <span class="font-mono bg-zinc-950 px-2 py-1 rounded text-xs text-indigo-400">{{ state.post_id }}</span>
                            </div>
                            <div>
                                <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Mulai Siaran</span>
                                <span>{{ state.start_time }}</span>
                            </div>
                            <div>
                                <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Durasi Siaran</span>
                                <span class="bg-indigo-950/50 border border-indigo-900/50 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-400">{{ state.duration }}</span>
                            </div>
                            
                            <form action="/stop_stream" method="POST" class="mt-4">
                                <input type="hidden" name="secret" value="{{ secret }}">
                                <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-lg shadow-red-900/20 active:scale-95">Hentikan Live Streaming</button>
                            </form>
                        </div>
                        {% else %}
                        <p class="text-sm text-zinc-500 italic mt-2">Menunggu pemicu jadwal posting dari Google Apps Script...</p>
                        {% endif %}
                    </div>
                </div>
            </div>

            <!-- Right Column: Log Console -->
            <div class="md:col-span-2 flex flex-col">
                <div class="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex-grow flex flex-col min-h-[450px]">
                    <div class="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                        <h2 class="text-zinc-400 text-sm font-bold uppercase tracking-wider">Log Konsol FFmpeg</h2>
                        <span class="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-zinc-500 font-mono">Real-time</span>
                    </div>
                    <div id="logs-container" class="flex-grow bg-black/60 p-4 rounded-2xl border border-zinc-900 font-mono text-xs overflow-y-auto max-h-[350px] leading-relaxed text-zinc-400 flex flex-col gap-1.5">
                        {% if state.logs %}
                            {% for log in state.logs %}
                                <div class="border-l-2 border-zinc-800 pl-2 py-0.5">{{ log }}</div>
                            {% endfor %}
                        {% else %}
                            <div class="text-zinc-600 italic">Konsol kosong. Tidak ada aktivitas streaming aktif.</div>
                        {% endif %}
                    </div>
                </div>
            </div>
        </main>
        
        <footer class="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600 font-semibold mt-auto">
            &copy; 2026 Snooplink Pro. Seluruh hak cipta dilindungi.
        </footer>

        <script>
            async function updateStatus() {
                try {
                    const response = await fetch('/status?_t=' + Date.now());
                    if (!response.ok) return;
                    const data = await response.json();
                    
                    // 1. Update Status Container HTML
                    const statusContainer = document.getElementById('status-container');
                    if (statusContainer) {
                        let statusHtml = '';
                        if (data.status === 'STREAMING') {
                            statusHtml = '<div class="w-5 h-5 rounded-full bg-red-500 glow-live"></div><span class="text-2xl font-extrabold text-red-500">LIVE</span>';
                        } else if (data.status === 'DOWNLOADING') {
                            statusHtml = '<div class="w-5 h-5 rounded-full bg-amber-500 animate-pulse"></div><span class="text-2xl font-extrabold text-amber-500">DOWNLOADING</span>';
                        } else if (data.status === 'ERROR') {
                            statusHtml = '<div class="w-5 h-5 rounded-full bg-rose-500"></div><span class="text-2xl font-extrabold text-rose-500">ERROR</span>';
                        } else {
                            statusHtml = '<div class="w-5 h-5 rounded-full bg-zinc-600"></div><span class="text-2xl font-extrabold text-zinc-400">IDLE</span>';
                        }
                        if (statusContainer.innerHTML !== statusHtml) {
                            statusContainer.innerHTML = statusHtml;
                        }
                    }
                    
                    // 2. Update Details Container HTML
                    const detailsContainer = document.getElementById('details-container');
                    if (detailsContainer) {
                        let detailsHtml = '';
                        if (data.post_id) {
                            detailsHtml = `
                                <div class="border-t border-zinc-800 pt-4 flex flex-col gap-3 text-sm text-zinc-300">
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Post ID</span>
                                        <span class="font-mono bg-zinc-950 px-2 py-1 rounded text-xs text-indigo-400">${data.post_id}</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Mulai Siaran</span>
                                        <span>${data.start_time || '-'}</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Durasi Siaran</span>
                                        <span class="bg-indigo-950/50 border border-indigo-900/50 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-400">${data.duration || '24/7'}</span>
                                    </div>
                                    ${data.error_message ? `
                                    <div>
                                        <span class="text-rose-500 block text-xs font-bold uppercase mb-1">Pesan Error</span>
                                        <span class="text-rose-400 text-xs">${data.error_message}</span>
                                    </div>
                                    ` : ''}
                                    <form action="/stop_stream" method="POST" class="mt-4">
                                        <input type="hidden" name="secret" value="{{ secret }}">
                                        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-lg shadow-red-900/20 active:scale-95">Hentikan Live Streaming</button>
                                    </form>
                                </div>
                            `;
                        } else {
                            detailsHtml = '<p class="text-sm text-zinc-500 italic mt-2">Menunggu pemicu jadwal posting dari Google Apps Script...</p>';
                        }
                        // Simple check to prevent re-rendering forms while clicking stop
                        if (detailsContainer.getAttribute('data-status') !== data.status || !detailsContainer.innerHTML.includes('Post ID') && data.post_id) {
                            detailsContainer.innerHTML = detailsHtml;
                            detailsContainer.setAttribute('data-status', data.status);
                        }
                    }
                    
                    // 3. Update Logs Container HTML
                    const logsContainer = document.getElementById('logs-container');
                    if (logsContainer) {
                        if (data.logs && data.logs.length > 0) {
                            const logsHtml = data.logs.map(log => `<div class="border-l-2 border-zinc-800 pl-2 py-0.5">${log}</div>`).join('');
                            
                            if (logsContainer.innerHTML !== logsHtml) {
                                const wasScrolledToBottom = logsContainer.scrollHeight - logsContainer.clientHeight <= logsContainer.scrollTop + 40;
                                logsContainer.innerHTML = logsHtml;
                                if (wasScrolledToBottom) {
                                    logsContainer.scrollTop = logsContainer.scrollHeight;
                                }
                            }
                        } else {
                            logsContainer.innerHTML = '<div class="text-zinc-600 italic">Konsol kosong. Tidak ada aktivitas streaming aktif.</div>';
                        }
                    }
                    
                } catch (e) {
                    console.error("Gagal memperbarui status real-time:", e);
                }
            }
            
            // Poll status every 2 seconds
            setInterval(updateStatus, 2000);
            
            // Initial scroll to bottom
            window.addEventListener('DOMContentLoaded', () => {
                const logsContainer = document.getElementById('logs-container');
                if (logsContainer) {
                    logsContainer.scrollTop = logsContainer.scrollHeight;
                }
            });
        </script>
    </body>
    </html>
    """
    return render_template_string(html_template, state=active_stream, secret=HF_SECRET)

# API endpoint triggered by Google Apps Script
@app.route("/start_stream", methods=["POST"])
def start_stream():
    global active_stream
    
    post_id = request.args.get("postId")
    secret = request.args.get("secret")
    
    if secret != HF_SECRET:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    if not post_id:
        return jsonify({"status": "error", "message": "Missing postId parameter"}), 400
        
    if not db:
        return jsonify({"status": "error", "message": "Database not initialized"}), 500
        
    try:
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()
        
        if not post_doc.exists:
            return jsonify({"status": "error", "message": "Post document not found in Firestore"}), 404
            
        post_data = post_doc.to_dict()
        post_type = post_data.get("postType", "post")
        
        if post_type != "live":
            return jsonify({"status": "error", "message": "Target post is not a live stream"}), 400
            
        video_url = post_data.get("mediaUrl")
        stream_key = post_data.get("streamKey")
        duration = post_data.get("liveDuration", "24/7")
        
        if not video_url or not stream_key:
            return jsonify({"status": "error", "message": "Missing mediaUrl or streamKey in document"}), 400
            
        # Determine full RTMP url
        if stream_key.startswith("rtmp://") or stream_key.startswith("rtmps://"):
            rtmp_url = stream_key
        else:
            rtmp_url = f"rtmp://a.rtmp.youtube.com/live2/{stream_key}"
            
        # Cancel current running stream if exists
        with stream_lock:
            if active_stream["process"]:
                try:
                    active_stream["process"].kill()
                    print("Killed previous streaming process.")
                except:
                    pass
                active_stream["status"] = "IDLE"
                active_stream["process"] = None
                active_stream["post_id"] = None
                
        # Launch streaming in a background thread
        thread = threading.Thread(
            target=run_streaming_process,
            args=(post_id, video_url, rtmp_url, duration)
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({"status": "success", "message": "Streaming process started in background"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Stop Stream manually (triggered by Dashboard or API)
@app.route("/stop_stream", methods=["POST"])
def stop_stream():
    global active_stream
    
    secret = request.args.get("secret") or request.form.get("secret")
    
    if secret != HF_SECRET:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    with stream_lock:
        if active_stream["process"]:
            try:
                active_stream["process"].kill()
                print("FFmpeg process killed manually.")
            except:
                pass
                
        post_id = active_stream["post_id"]
        active_stream["status"] = "IDLE"
        active_stream["process"] = None
        active_stream["post_id"] = None
        active_stream["logs"].append("Siaran dihentikan secara manual oleh pengguna.")
        
        if db and post_id:
            try:
                db.collection('posts').document(post_id).update({
                    'status': 'Failed',
                    'error_log': 'Siaran dihentikan secara manual oleh pengguna dari Dashboard.'
                })
            except:
                pass
                
    return jsonify({"status": "success", "message": "Streaming stopped successfully"}), 200

# Fetch status endpoint
@app.route("/status", methods=["GET"])
def get_status():
    with stream_lock:
        resp = jsonify({
            "status": active_stream["status"],
            "post_id": active_stream["post_id"],
            "start_time": active_stream["start_time"],
            "duration": active_stream["duration"],
            "error_message": active_stream["error_message"],
            "logs": active_stream["logs"]
        })
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
