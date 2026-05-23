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
db_init_status = "Firebase variables not checked yet"
try:
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")
    
    if project_id:
        project_id = project_id.strip().strip('"').strip("'").strip()
    if client_email:
        client_email = client_email.strip().strip('"').strip("'").strip()
    if private_key:
        private_key = private_key.strip().strip('"').strip("'").strip()
    
    missing = []
    if not project_id: missing.append("FIREBASE_PROJECT_ID")
    if not client_email: missing.append("FIREBASE_CLIENT_EMAIL")
    if not private_key: missing.append("FIREBASE_PRIVATE_KEY")
    
    if not missing:
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
        db_init_status = "Successfully initialized"
        print("Firebase Admin successfully initialized!")
    else:
        db_init_status = f"Missing environment variables: {', '.join(missing)}"
        print(f"Offline/Unconfigured Mode: {db_init_status}")
except Exception as e:
    db_init_status = f"Error initializing Firebase: {str(e)}"
    print(db_init_status)

# =========================================================================
# STATE MANAGER & STREAM CONTROL (MULTI-STREAM CONCURRENT SUPPORT)
# =========================================================================
stream_lock = threading.Lock()
active_streams = {}  # Dictionary mapping post_id -> active_stream details

HF_SECRET = os.getenv("HF_SECRET", "SnooplinkSuperSecret123").strip().strip('"').strip("'")

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
            
        # Fetch YouTube credentials dynamically from Environment Variables or Firestore settings/config
        client_id = os.getenv("YT_CLIENT_ID")
        client_secret = os.getenv("YT_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            try:
                config_ref = db.collection('settings').document('config')
                config_doc = config_ref.get()
                if config_doc.exists:
                    config_data = config_doc.to_dict() or {}
                    if not client_id:
                        client_id = config_data.get('ytClientId')
                    if not client_secret:
                        client_secret = config_data.get('ytClientSecret')
            except Exception as fe:
                print(f"[SYSTEM] Gagal membaca kredensial YT dari Firestore: {fe}")
                
        if not client_id or not client_secret:
            print("[SYSTEM] YouTube client_id atau client_secret tidak terkonfigurasi di env/Firestore!")
            return
        
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
def trigger_next_live(parent_post_id):
    if not db:
        print("Firebase DB not initialized, skipping next live trigger.")
        return
    try:
        config_ref = db.collection('settings').document('config')
        config_doc = config_ref.get()
        
        # Fallback to default GAS webAppUrl
        web_app_url = "https://script.google.com/macros/s/AKfycbwdxnTBbLtzqglMPRAx_whpyZt4_zmZNA77TsWI6AmJEociu0h_QhsSCTXinDua8HJleg/exec"
        
        if config_doc.exists:
            config_data = config_doc.to_dict() or {}
            db_web_app_url = config_data.get('webAppUrl')
            if db_web_app_url:
                web_app_url = db_web_app_url
                print(f"Loaded webAppUrl from Firestore: {web_app_url}")
            else:
                print(f"webAppUrl empty in settings/config, using fallback: {web_app_url}")
        else:
            print(f"settings/config doc not found in Firestore, using fallback: {web_app_url}")
        
        url = f"{web_app_url}?action=triggerNextLive&parentPostId={parent_post_id}"
        print(f"Triggering next live via GAS: {url}")
        
        def fire_request():
            try:
                res = requests.post(url, timeout=30)
                print(f"GAS triggerNextLive response: {res.status_code} - {res.text}")
            except Exception as req_err:
                print(f"Failed to fire GAS triggerNextLive: {req_err}")
                
        threading.Thread(target=fire_request, daemon=True).start()
    except Exception as e:
        print(f"Error in trigger_next_live: {e}")

def update_live_metadata(post_id):
    if not db:
        print("Firebase DB not initialized, skipping metadata update.")
        return
    try:
        config_ref = db.collection('settings').document('config')
        config_doc = config_ref.get()
        
        # Fallback to default GAS webAppUrl
        web_app_url = "https://script.google.com/macros/s/AKfycbwdxnTBbLtzqglMPRAx_whpyZt4_zmZNA77TsWI6AmJEociu0h_QhsSCTXinDua8HJleg/exec"
        
        if config_doc.exists:
            config_data = config_doc.to_dict() or {}
            db_web_app_url = config_data.get('webAppUrl')
            if db_web_app_url:
                web_app_url = db_web_app_url
                print(f"Loaded webAppUrl from Firestore: {web_app_url}")
        
        url = f"{web_app_url}?action=updateLiveMetadata&postId={post_id}"
        print(f"Triggering live metadata update via GAS: {url}")
        
        def fire_request():
            try:
                res = requests.post(url, timeout=30)
                print(f"GAS updateLiveMetadata response: {res.status_code} - {res.text}")
            except Exception as req_err:
                print(f"Failed to fire GAS updateLiveMetadata: {req_err}")
                
        threading.Thread(target=fire_request, daemon=True).start()
    except Exception as e:
        print(f"Error in update_live_metadata: {e}")

# =========================================================================
# STREAMING RUNNER THREAD
# =========================================================================
def run_streaming_process(post_id, video_url, rtmp_url, duration):
    global active_streams
    
    with stream_lock:
        active_streams[post_id] = {
            "status": "DOWNLOADING",
            "post_id": post_id,
            "video_url": video_url,
            "rtmp_url": rtmp_url,
            "duration": duration,
            "start_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "error_message": "",
            "process": None,
            "logs": ["Memulai pengunduhan video dari Google Drive..."]
        }
        
    temp_video_path = f"/tmp/stream_input_{post_id}.mp4"
    temp_combined_audio_path = f"/tmp/backsound_combined_{post_id}.mp3"
    temp_standard_audio_path = f"/tmp/backsound_standard_{post_id}.mp3"
    temp_stamp_path = f"/tmp/image_stamp_{post_id}.png"
    temp_stamped_video_path = f"/tmp/stream_input_stamped_{post_id}.mp4"
        
    try:
        bitrate = "copy"
        backsound_urls = []
        image_stamp_url = None
        combined_audio_path = None
        is_auto_loop = False
        
        # 1. Update status to Processing in Firestore and fetch configuration
        if db:
            post_ref = db.collection('posts').document(post_id)
            post_doc = post_ref.get()
            if post_doc.exists:
                post_data = post_doc.to_dict()
                bitrate = post_data.get('bitrate', 'copy')
                backsound_urls = post_data.get('backsoundUrls', [])
                image_stamp_url = post_data.get('imageStampUrl', None)
                raw_auto_loop = post_data.get('isAutoLoop', False)
                if isinstance(raw_auto_loop, str):
                    is_auto_loop = raw_auto_loop.lower() in ['true', '1']
                else:
                    is_auto_loop = bool(raw_auto_loop)
                
            db.collection('posts').document(post_id).update({
                'status': 'Processing',
                'error_log': 'Hugging Face: Mengunduh file media...'
            })
            
        print(f"[STREAM RUNNER] Starting stream process for post_id: {post_id}")
        print(f"[STREAM RUNNER] duration: {duration}, is_auto_loop: {is_auto_loop} (raw: {post_data.get('isAutoLoop') if db and post_doc.exists else 'N/A'})")
        
        # 2. Download file locally to avoid FFmpeg seek/network problems on looped streams
        download_video(video_url, temp_video_path)
        
        # Download and process backsounds if provided
        downloaded_backsounds = []
        if backsound_urls:
            with stream_lock:
                if post_id in active_streams:
                    active_streams[post_id]["logs"].append("Mengunduh file backsound MP3...")
            for idx, bs_url in enumerate(backsound_urls):
                bs_path = f"/tmp/backsound_{post_id}_{idx}.mp3"
                if db:
                    db.collection('posts').document(post_id).update({
                        'error_log': f'Hugging Face: Mengunduh backsound {idx+1}/{len(backsound_urls)}...'
                    })
                download_video(bs_url, bs_path)
                downloaded_backsounds.append(bs_path)
                
            # Concatenate backsounds if multiple
            if len(downloaded_backsounds) > 1:
                with stream_lock:
                    if post_id in active_streams:
                        active_streams[post_id]["logs"].append("Menggabungkan file-file backsound...")
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
                    temp_combined_audio_path
                ])
                res = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode != 0:
                    raise Exception(f"Gagal menggabungkan backsound: {res.stderr.decode('utf-8', errors='ignore')}")
                combined_audio_path = temp_combined_audio_path
                
                # Cleanup raw downloaded backsound files to save space
                for bs in downloaded_backsounds:
                    if bs != combined_audio_path and os.path.exists(bs):
                        try: os.remove(bs)
                        except: pass
            elif len(downloaded_backsounds) == 1:
                # Standardize single audio file to stereo 44100Hz to prevent playback issues
                cmd = ["ffmpeg", "-y", "-i", downloaded_backsounds[0], "-c:a", "libmp3lame", "-b:a", "192k", "-ar", "44100", "-ac", "2", temp_standard_audio_path]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode == 0:
                    combined_audio_path = temp_standard_audio_path
                else:
                    combined_audio_path = downloaded_backsounds[0]
        
        # Process image stamp watermark cover if provided
        if image_stamp_url:
            with stream_lock:
                if post_id in active_streams:
                    active_streams[post_id]["logs"].append("Mengunduh gambar stamp untuk watermark cover...")
            if db:
                db.collection('posts').document(post_id).update({
                    'error_log': 'Hugging Face: Mengunduh gambar stamp...'
                })
            download_video(image_stamp_url, temp_stamp_path)
            
            with stream_lock:
                if post_id in active_streams:
                    active_streams[post_id]["logs"].append("Menempelkan gambar stamp ke video (5% dari konten)...")
            if db:
                db.collection('posts').document(post_id).update({
                    'error_log': 'Hugging Face: Menempelkan gambar stamp...'
                })
            
            # Scale the stamp proportionally to exactly 12% of the video display height, pre-compensating for standard 16:9 playback stretch
            stamp_cmd = [
                "ffmpeg", "-y", "-i", temp_video_path, "-loop", "1", "-i", temp_stamp_path,
                "-filter_complex", "[1:v][0:v]scale2ref=w=rw*0.12*(9/16)*iw/ih:h=rh*0.12[stamp_raw][video];[stamp_raw]setsar=1[stamp];[video][stamp]overlay=main_w-overlay_w-10:main_h-overlay_h-10:shortest=1[outv]",
                "-map", "[outv]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "superfast", "-crf", "23",
                "-c:a", "copy",
                temp_stamped_video_path
            ]
            res = subprocess.run(stamp_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode != 0:
                raise Exception(f"Gagal menempelkan gambar stamp: {res.stderr.decode('utf-8', errors='ignore')}")
            os.replace(temp_stamped_video_path, temp_video_path)
            
            # Cleanup downloaded image stamp
            if os.path.exists(temp_stamp_path):
                try: os.remove(temp_stamp_path)
                except: pass
                
        # 2.5. If auto loop is enabled, preprocess the video to make it a seamless crossfade loop (Video Dissolve)
        # This is extremely effective for fire, water, smoke, and ambient content, keeping flow forward naturally.
        if is_auto_loop:
            try:
                # Check video duration first
                duration_check = subprocess.run(["ffmpeg", "-i", temp_video_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                duration_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+|\d+)", duration_check.stderr)
                is_short_video = False
                total_duration_sec = 0.0
                if duration_match:
                    hours, minutes, seconds = duration_match.groups()
                    total_duration_sec = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
                    is_short_video = 5.0 <= total_duration_sec <= 600  # Safe between 5 seconds and 10 minutes
                    
                if is_short_video:
                    with stream_lock:
                        if post_id in active_streams:
                            active_streams[post_id]["logs"].append("[SYSTEM] Membuat loop siaran menjadi seamless (Crossfade Loop)...")
                            
                    temp_seamless_path = f"/tmp/stream_input_seamless_{post_id}.mp4"
                    
                    # 2-second crossfade duration
                    fade_dur = 2.0
                    if total_duration_sec < 10.0:
                        fade_dur = 1.0  # Use 1 second for very short videos
                        
                    main_start = fade_dur
                    main_end = total_duration_sec - fade_dur
                    
                    # Construct FFmpeg command using xfade (video) and acrossfade (audio)
                    if "Audio:" in duration_check.stderr:
                        seamless_cmd = [
                            "ffmpeg", "-y", "-i", temp_video_path,
                            "-filter_complex", 
                            f"[0:v]split[v1][v2];"
                            f"[v1]trim=start={main_start}:end={main_end},setpts=PTS-STARTPTS[vmain];"
                            f"[v2]trim=start={main_end}:end={total_duration_sec},setpts=PTS-STARTPTS[vfadeout];"
                            f"[0:v]trim=start=0:end={fade_dur},setpts=PTS-STARTPTS[vfadein];"
                            f"[vfadeout][vfadein]xfade=transition=fade:duration={fade_dur}:offset=0[vjoin];"
                            f"[vmain][vjoin]concat=n=2:v=1:a=0[outv];"
                            f"[0:a]asplit[a1][a2];"
                            f"[a1]atrim=start={main_start}:end={main_end},asetpts=PTS-STARTPTS[amain];"
                            f"[a2]atrim=start={main_end}:end={total_duration_sec},asetpts=PTS-STARTPTS[afadeout];"
                            f"[0:a]atrim=start=0:end={fade_dur},asetpts=PTS-STARTPTS[afadein];"
                            f"[afadeout][afadein]acrossfade=d={fade_dur}:c1=tri:c2=tri[ajoin];"
                            f"[amain][ajoin]concat=n=2:v=0:a=1[outa]",
                            "-map", "[outv]", "-map", "[outa]",
                            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                            "-c:a", "aac", "-b:a", "128k",
                            temp_seamless_path
                        ]
                    else:
                        seamless_cmd = [
                            "ffmpeg", "-y", "-i", temp_video_path,
                            "-filter_complex", 
                            f"[0:v]split[v1][v2];"
                            f"[v1]trim=start={main_start}:end={main_end},setpts=PTS-STARTPTS[vmain];"
                            f"[v2]trim=start={main_end}:end={total_duration_sec},setpts=PTS-STARTPTS[vfadeout];"
                            f"[0:v]trim=start=0:end={fade_dur},setpts=PTS-STARTPTS[vfadein];"
                            f"[vfadeout][vfadein]xfade=transition=fade:duration={fade_dur}:offset=0[vjoin];"
                            f"[vmain][vjoin]concat=n=2:v=1:a=0[outv]",
                            "-map", "[outv]",
                            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                            temp_seamless_path
                        ]
                        
                    res = subprocess.run(seamless_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    if res.returncode == 0:
                        os.replace(temp_seamless_path, temp_video_path)
                        with stream_lock:
                            if post_id in active_streams:
                                active_streams[post_id]["logs"].append("[SYSTEM] Loop video seamless (Crossfade Loop) berhasil diterapkan!")
                    else:
                        print(f"[SYSTEM] Gagal membuat loop seamless: {res.stderr.decode('utf-8', errors='ignore')}")
                        with stream_lock:
                            if post_id in active_streams:
                                active_streams[post_id]["logs"].append("[SYSTEM] Warning: Gagal membuat loop seamless. Menggunakan loop standar...")
                else:
                    print("[SYSTEM] Video durasi di luar rentang loop (5s - 10m), menggunakan loop standar.")
            except Exception as le:
                print(f"[SYSTEM] Error creating seamless loop: {le}")
        
        # Check if cancelled during download/processing
        with stream_lock:
            if post_id not in active_streams or active_streams[post_id]["status"] == "IDLE":
                print("Stream has been cancelled during download.")
                return
            active_streams[post_id]["status"] = "STREAMING"
            active_streams[post_id]["logs"] = ["Video diunduh dan diproses. Memulai FFmpeg..."]
            
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
        next_live_state = {"triggered": False}
        
        # Background Watchdog Thread to guarantee dynamic metadata update or graceful duration completion,
        # completely immune to FFmpeg log buffering or process stdout readline delays.
        def watchdog_loop():
            print(f"[WATCHDOG] Started background watchdog for stream: {post_id}. Target duration: {duration} mins, auto_loop: {is_auto_loop}")
            
            try:
                interval_mins = int(duration)
            except ValueError:
                interval_mins = 60  # Default to 60 minutes if duration is 24/7 or invalid
                
            last_update = datetime.now()
            
            while True:
                # Terminate watchdog thread if the stream goes inactive
                with stream_lock:
                    if post_id not in active_streams or active_streams[post_id]["status"] not in ["STREAMING", "DOWNLOADING"]:
                        print(f"[WATCHDOG] Stream {post_id} is no longer active. Exiting watchdog thread.")
                        break
                        
                # If Auto Loop is enabled, we perform periodic dynamic metadata updates (Method 1 - Seamless)
                if is_auto_loop:
                    elapsed_from_last_update = (datetime.now() - last_update).total_seconds()
                    if elapsed_from_last_update >= (interval_mins * 60):
                        print(f"[WATCHDOG] Time for metadata update. Interval: {interval_mins} mins. Triggering update...")
                        last_update = datetime.now()
                        with stream_lock:
                            if post_id in active_streams:
                                active_streams[post_id]["logs"].append("[SYSTEM] [WATCHDOG] Waktunya memperbarui metadata. Memicu update metadata dinamis...")
                        update_live_metadata(post_id)
                
                # If NOT auto loop, stop stream when duration ends
                elif duration != "24/7":
                    elapsed_from_start = (datetime.now() - start_datetime).total_seconds()
                    if elapsed_from_start >= (int(duration) * 60):
                        print(f"[WATCHDOG] Duration met. Stopping stream {post_id}.")
                        with stream_lock:
                            if post_id in active_streams:
                                active_streams[post_id]["logs"].append("[SYSTEM] [WATCHDOG] Durasi siaran telah terpenuhi. Menghentikan siaran...")
                                s = active_streams[post_id]
                                s["status"] = "IDLE"
                                if s.get("process"):
                                    try: s["process"].kill()
                                    except: pass
                                if db:
                                    try:
                                        db.collection('posts').document(post_id).update({
                                            'status': 'Completed',
                                            'error_log': ''
                                        })
                                    except: pass
                        break
                
                time.sleep(10)
                
        watchdog_thread = threading.Thread(target=watchdog_loop, daemon=True)
        watchdog_thread.start()
        
        while True:
            # Check if cancelled before starting/retrying
            with stream_lock:
                if post_id not in active_streams or active_streams[post_id]["status"] == "IDLE":
                    print("Stream has been cancelled or stopped.")
                    break
                active_streams[post_id]["status"] = "STREAMING"
            
            # Calculate remaining duration if not 24/7 and not auto loop
            cmd_duration = []
            if duration != "24/7" and not is_auto_loop:
                try:
                    duration_sec = int(duration) * 60
                except ValueError:
                    duration_sec = 3600
                
                elapsed = (datetime.now() - start_datetime).total_seconds()
                remaining_sec = duration_sec - elapsed
                if remaining_sec <= 0:
                    with stream_lock:
                        if post_id in active_streams:
                            active_streams[post_id]["logs"].append("[SYSTEM] Durasi live streaming telah terpenuhi secara lengkap.")
                    break
                cmd_duration = ["-t", str(int(remaining_sec))]
 
            # 4. Compile FFmpeg Command
            inputs = ["-re", "-stream_loop", "-1", "-i", temp_video_path]
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
                if post_id in active_streams:
                    active_streams[post_id]["logs"].append(f"[SYSTEM] Memulai proses FFmpeg (Percobaan #{retry_count + 1})...")
                    active_streams[post_id]["logs"].append(f"FFmpeg command: {' '.join(cmd)}")
                    print(f"Running FFmpeg command: {' '.join(cmd)}")
 
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True
            )
            
            with stream_lock:
                if post_id in active_streams:
                    active_streams[post_id]["process"] = process
                
            # Read FFmpeg logs in real-time
            for line in iter(process.stdout.readline, ""):
                with stream_lock:
                    if post_id not in active_streams or active_streams[post_id]["status"] == "IDLE":
                        break
                    if len(active_streams[post_id]["logs"]) > 45:
                        active_streams[post_id]["logs"].pop(0)
                    active_streams[post_id]["logs"].append(line.strip())
                    
            process.stdout.close()
            return_code = process.wait()
            
            # Check if cancelled during/after FFmpeg execution
            with stream_lock:
                if post_id not in active_streams or active_streams[post_id]["status"] == "IDLE":
                    break
            
            # 6. Stream Finalization checking
            if return_code == 0:
                with stream_lock:
                    if post_id in active_streams:
                        active_streams[post_id]["status"] = "IDLE"
                        active_streams[post_id]["logs"].append("Streaming selesai secara normal.")
                        if db:
                            db.collection('posts').document(post_id).update({
                                'status': 'Completed',
                                'error_log': ''
                            })
                break
            else:
                retry_count += 1
                with stream_lock:
                    if post_id in active_streams:
                        active_streams[post_id]["logs"].append(f"[SYSTEM] WARNING: FFmpeg terhenti dengan kode {return_code} (Kemungkinan gangguan jaringan).")
                        active_streams[post_id]["logs"].append(f"[SYSTEM] Mencoba menghubungkan kembali dalam {backoff_delay} detik (Percobaan #{retry_count})...")
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
                        if post_id not in active_streams or active_streams[post_id]["status"] == "IDLE":
                            break
                    time.sleep(sleep_interval)
                    slept += sleep_interval
                    
                # Exponential backoff update
                backoff_delay = min(backoff_delay * 1.5, max_backoff)
                        
    except Exception as e:
        print(f"Error in stream thread: {e}")
        with stream_lock:
            if post_id in active_streams:
                active_streams[post_id]["status"] = "ERROR"
                active_streams[post_id]["error_message"] = str(e)
                active_streams[post_id]["logs"].append(f"EXCEPTION: {str(e)}")
                if db:
                    db.collection('posts').document(post_id).update({
                        'status': 'Failed',
                        'error_log': str(e)
                    })
    finally:
        # End YouTube broadcast if applicable
        end_youtube_broadcast(post_id)

        # Delete temporary files belonging to this post_id ONLY
        for p in [temp_video_path, temp_combined_audio_path, temp_standard_audio_path, temp_stamp_path, temp_stamped_video_path]:
            if os.path.exists(p):
                try: os.remove(p)
                except: pass
                
        import glob
        for p in glob.glob(f"/tmp/backsound_{post_id}_*.mp3"):
            try: os.remove(p)
            except: pass
            
        with stream_lock:
            if post_id in active_streams:
                active_streams[post_id]["process"] = None

# =========================================================================
# AUTO-RESUME LIVE STREAMS ON STARTUP
# =========================================================================
def check_and_resume_active_stream():
    if not db:
        return
    try:
        # Get this Space's own domain or ID to avoid resuming streams from other nodes
        space_host = os.getenv("SPACE_HOST") # e.g. "arsafaqih94-tandon.hf.space"
        space_id = os.getenv("SPACE_ID")     # e.g. "Arsafaqih94/tandon"
        
        self_urls = []
        if space_host:
            self_urls.append(f"https://{space_host.strip().lower()}")
        if space_id:
            parts = space_id.split("/")
            if len(parts) == 2:
                user, space = parts[0].lower(), parts[1].lower()
                self_urls.append(f"https://{user}-{space}.hf.space")
                
        print(f"[SYSTEM] Startup resume scan. Self URLs: {self_urls}")
        print("Checking Firestore for active stream to resume...")
        
        docs = db.collection('posts').where('status', '==', 'LIVE').stream()
        for doc in docs:
            post_data = doc.to_dict()
            post_id = doc.id
            post_type = post_data.get('postType', 'post')
            
            if post_type == 'live':
                streaming_node_url = post_data.get('streamingNodeUrl')
                node_url_clean = streaming_node_url.strip().lower().rstrip("/") if streaming_node_url else ""
                
                # Verify if this post is assigned to this specific Space server
                is_assigned_to_me = False
                if self_urls and node_url_clean:
                    for self_url in self_urls:
                        self_url_clean = self_url.strip().lower().rstrip("/")
                        if self_url_clean in node_url_clean or node_url_clean in self_url_clean:
                            is_assigned_to_me = True
                            break
                else:
                    # Fallback for local development or if not running on HF Space
                    is_assigned_to_me = True
                    
                if not is_assigned_to_me:
                    print(f"[SYSTEM] Skip resuming post {post_id} because it belongs to another node: {streaming_node_url}")
                    continue
                    
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
                        <p class="text-xs text-zinc-400 font-semibold">Multi-Stream Engine</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <span class="text-sm font-bold text-emerald-400">Node Active</span>
                </div>
            </div>
        </header>

        <main class="flex-grow max-w-6xl w-full mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
            <!-- Left Column: Active Streams List -->
            <div class="md:col-span-1 flex flex-col gap-6">
                <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 glow flex flex-col">
                    <h2 class="text-zinc-400 text-sm font-bold tracking-wider uppercase mb-4">Daftar Streaming Aktif</h2>
                    <div id="streams-list" class="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                        <div class="text-zinc-500 italic text-center py-6 text-sm">Loading active streams...</div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Log Console & Selected Stream Details -->
            <div class="md:col-span-2 flex flex-col gap-6">
                <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 glow flex flex-col" id="details-panel">
                    <div class="text-center py-6 text-zinc-500">
                        <h3 class="text-lg font-bold text-zinc-400 mb-2">Semua Sistem Siap</h3>
                        <p class="text-sm italic">Menunggu pemicu jadwal posting dari Google Apps Script...</p>
                    </div>
                </div>
                
                <div class="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex-grow flex flex-col min-h-[350px]">
                    <div class="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                        <h2 class="text-zinc-400 text-sm font-bold uppercase tracking-wider">Log Konsol FFmpeg</h2>
                        <span id="log-badge" class="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-zinc-500 font-mono">Select a stream</span>
                    </div>
                    <div id="logs-container" class="flex-grow bg-black/60 p-4 rounded-2xl border border-zinc-900 font-mono text-xs overflow-y-auto max-h-[300px] leading-relaxed text-zinc-400 flex flex-col gap-1.5">
                        <div class="text-zinc-600 italic">Pilih salah satu stream aktif untuk melihat log konsol secara real-time.</div>
                    </div>
                </div>
            </div>
        </main>
        
        <footer class="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600 font-semibold mt-auto">
            &copy; 2026 Snooplink Pro. Seluruh hak cipta dilindungi.
        </footer>

        <script>
            let selectedPostId = null;
            const secret = "{{ secret }}";

            async function stopStream(postId) {
                if (!confirm(`Apakah Anda yakin ingin menghentikan live streaming ${postId}?`)) return;
                try {
                    const response = await fetch(`/stop_stream?postId=${postId}&secret=${secret}`, {
                        method: 'POST'
                    });
                    const resJson = await response.json();
                    if (resJson.status === 'success') {
                        if (selectedPostId === postId) {
                            selectedPostId = null;
                        }
                        updateStatus();
                    } else {
                        alert('Gagal menghentikan: ' + resJson.message);
                    }
                } catch (e) {
                    alert('Error: ' + e.message);
                }
            }

            async function updateStatus() {
                try {
                    const response = await fetch('/status?_t=' + Date.now());
                    if (!response.ok) return;
                    const data = await response.json();
                    
                    const streamsList = document.getElementById('streams-list');
                    const detailsPanel = document.getElementById('details-panel');
                    const logsContainer = document.getElementById('logs-container');
                    const logBadge = document.getElementById('log-badge');

                    const activeStreams = data.active_streams || {};
                    const postIds = Object.keys(activeStreams);

                    // Auto select first stream if nothing is selected or if selected is no longer active
                    if (postIds.length > 0) {
                        if (!selectedPostId || !activeStreams[selectedPostId]) {
                            selectedPostId = postIds[0];
                        }
                    } else {
                        selectedPostId = null;
                    }

                    // 1. Render Streams List
                    if (postIds.length === 0) {
                        streamsList.innerHTML = '<div class="text-zinc-500 italic text-center py-6 text-sm">Tidak ada streaming aktif.</div>';
                    } else {
                        let listHtml = '';
                        postIds.forEach(pid => {
                            const s = activeStreams[pid];
                            const isSelected = pid === selectedPostId;
                            let statusColor = 'bg-zinc-600';
                            let statusText = s.status;
                            
                            if (s.status === 'STREAMING') {
                                statusColor = 'bg-red-500 glow-live';
                            } else if (s.status === 'DOWNLOADING') {
                                statusColor = 'bg-amber-500 animate-pulse';
                            } else if (s.status === 'ERROR') {
                                statusColor = 'bg-rose-500';
                            }

                            listHtml += `
                                <div onclick="selectedPostId='${pid}'; updateStatus();" class="p-4 rounded-2xl border cursor-pointer transition ${isSelected ? 'bg-indigo-950/40 border-indigo-500' : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'}">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="font-mono text-xs font-bold text-zinc-300 break-all select-none mr-2">${pid}</span>
                                        <span class="w-2.5 h-2.5 rounded-full ${statusColor}"></span>
                                    </div>
                                    <div class="flex items-center justify-between text-xs text-zinc-400 mt-1">
                                        <span>Duration: ${s.duration}</span>
                                        <span class="text-indigo-400 font-semibold">${statusText}</span>
                                    </div>
                                </div>
                            `;
                        });
                        streamsList.innerHTML = listHtml;
                    }

                    // 2. Render Details and Logs for Selected Stream
                    if (selectedPostId && activeStreams[selectedPostId]) {
                        const s = activeStreams[selectedPostId];
                        logBadge.innerText = `Stream: ${selectedPostId}`;
                        
                        // Render details panel
                        let detailsHtml = `
                            <div class="flex flex-col gap-4">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                        <span class="w-3 h-3 rounded-full ${s.status === 'STREAMING' ? 'bg-red-500 glow-live' : (s.status === 'DOWNLOADING' ? 'bg-amber-500' : 'bg-rose-500')}"></span>
                                        Detail Siaran: ${s.status}
                                    </h3>
                                    <button onclick="stopStream('${selectedPostId}')" class="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition active:scale-95">Hentikan Siaran</button>
                                </div>
                                <div class="grid grid-cols-2 gap-4 text-sm border-t border-zinc-800 pt-4">
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Post ID</span>
                                        <span class="font-mono bg-zinc-950 px-2 py-1 rounded text-xs text-indigo-400">${s.post_id}</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Mulai Siaran</span>
                                        <span class="text-zinc-300">${s.start_time || '-'}</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Durasi Siaran</span>
                                        <span class="bg-indigo-950/50 border border-indigo-900/50 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-400">${s.duration}</span>
                                    </div>
                                    <div>
                                        <span class="text-zinc-500 block text-xs font-bold uppercase mb-1">Tujuan RTMP</span>
                                        <span class="font-mono text-zinc-400 text-xs truncate block" title="${s.rtmp_url}">${s.rtmp_url}</span>
                                    </div>
                                </div>
                                ${s.error_message ? `
                                <div class="border-t border-zinc-800 pt-3">
                                    <span class="text-rose-500 block text-xs font-bold uppercase mb-1">Pesan Error</span>
                                    <span class="text-rose-400 text-xs font-mono">${s.error_message}</span>
                                </div>
                                ` : ''}
                            </div>
                        `;
                        detailsPanel.innerHTML = detailsHtml;

                        // Render logs
                        if (s.logs && s.logs.length > 0) {
                            const logsHtml = s.logs.map(log => `<div class="border-l-2 border-zinc-800 pl-2 py-0.5">${log}</div>`).join('');
                            const wasScrolledToBottom = logsContainer.scrollHeight - logsContainer.clientHeight <= logsContainer.scrollTop + 45;
                            logsContainer.innerHTML = logsHtml;
                            if (wasScrolledToBottom) {
                                logsContainer.scrollTop = logsContainer.scrollHeight;
                            }
                        } else {
                            logsContainer.innerHTML = '<div class="text-zinc-600 italic">Konsol kosong. Tidak ada aktivitas log.</div>';
                        }
                    } else {
                        logBadge.innerText = 'Idle';
                        detailsPanel.innerHTML = `
                            <div class="text-center py-6 text-zinc-500">
                                <h3 class="text-lg font-bold text-zinc-400 mb-2">Semua Sistem Siap</h3>
                                <p class="text-sm italic">Menunggu pemicu jadwal posting dari Google Apps Script...</p>
                            </div>
                        `;
                        logsContainer.innerHTML = '<div class="text-zinc-600 italic">Konsol kosong. Tidak ada aktivitas streaming aktif.</div>';
                    }
                    
                } catch (e) {
                    console.error("Gagal memperbarui status real-time:", e);
                }
            }
            
            // Poll status every 2 seconds
            setInterval(updateStatus, 2000);
            updateStatus();
        </script>
    </body>
    </html>
    """
    return render_template_string(html_template, secret=HF_SECRET)

# API endpoint triggered by Google Apps Script
@app.route("/start_stream", methods=["POST"])
def start_stream():
    global active_streams
    
    post_id = request.args.get("postId")
    secret = request.args.get("secret")
    
    clean_secret = secret.strip().strip('"').strip("'") if secret else ""
    if clean_secret != HF_SECRET:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    if not post_id:
        return jsonify({"status": "error", "message": "Missing postId parameter"}), 400
        
    if not db:
        return jsonify({"status": "error", "message": f"Database not initialized: {db_init_status}"}), 500
        
    try:
        # Check if already running
        with stream_lock:
            if post_id in active_streams:
                s = active_streams[post_id]
                if s.get("status") in ["STREAMING", "DOWNLOADING"] and s.get("process") is not None:
                    return jsonify({"status": "success", "message": "Streaming process already running for this postId"}), 200

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
    global active_streams
    
    secret = request.args.get("secret") or request.form.get("secret")
    post_id = request.args.get("postId") or request.form.get("postId")
    
    clean_secret = secret.strip().strip('"').strip("'") if secret else ""
    if clean_secret != HF_SECRET:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    stopped_posts = []
    
    with stream_lock:
        targets = []
        if post_id:
            if post_id in active_streams:
                targets.append(post_id)
        else:
            targets = list(active_streams.keys())
            
        for pid in targets:
            s = active_streams[pid]
            if s.get("process"):
                try:
                    s["process"].kill()
                    print(f"FFmpeg process for post {pid} killed manually.")
                except Exception as ex:
                    print(f"Error killing process for post {pid}: {ex}")
            
            s["status"] = "IDLE"
            s["process"] = None
            s["logs"].append("Siaran dihentikan secara manual oleh pengguna.")
            stopped_posts.append(pid)
            
            if db:
                try:
                    db.collection('posts').document(pid).update({
                        'status': 'Failed',
                        'error_log': 'Siaran dihentikan secara manual oleh pengguna dari Dashboard.'
                    })
                except Exception as ex:
                    print(f"Error updating Firestore status to Failed for {pid}: {ex}")
                    
    return jsonify({"status": "success", "message": f"Streaming stopped successfully for: {stopped_posts}"}), 200

# Fetch status endpoint
@app.route("/status", methods=["GET"])
def get_status():
    with stream_lock:
        # Determine fallback values for backward compatibility
        fallback_status = "IDLE"
        fallback_post_id = None
        fallback_start_time = None
        fallback_duration = None
        fallback_error_message = ""
        fallback_logs = []
        
        # If there are active streams, pick the first one as fallback
        active_list = [s for s in active_streams.values() if s.get("status") in ["STREAMING", "DOWNLOADING", "ERROR"]]
        if active_list:
            active_list.sort(key=lambda x: 0 if x.get("status") == "STREAMING" else (1 if x.get("status") == "DOWNLOADING" else 2))
            first = active_list[0]
            fallback_status = first.get("status", "IDLE")
            fallback_post_id = first.get("post_id")
            fallback_start_time = first.get("start_time")
            fallback_duration = first.get("duration")
            fallback_error_message = first.get("error_message", "")
            fallback_logs = first.get("logs", [])
        
        # Serialize active_streams details without the Process object
        serialized_streams = {}
        for pid, s in active_streams.items():
            serialized_streams[pid] = {
                "status": s.get("status"),
                "post_id": s.get("post_id"),
                "video_url": s.get("video_url"),
                "rtmp_url": s.get("rtmp_url"),
                "duration": s.get("duration"),
                "start_time": s.get("start_time"),
                "error_message": s.get("error_message"),
                "logs": s.get("logs")
            }
            
        resp = jsonify({
            "status": fallback_status,
            "post_id": fallback_post_id,
            "postId": fallback_post_id, # for React compatibility
            "start_time": fallback_start_time,
            "duration": fallback_duration,
            "error_message": fallback_error_message,
            "logs": fallback_logs,
            "active_streams": serialized_streams
        })
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
