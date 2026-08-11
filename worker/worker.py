import os
import time
import json
import asyncio
import subprocess
import platform
import glob
from supabase import create_client, Client
from dotenv import load_dotenv
import yt_dlp

# Auto-detect node binary in NVM or system for yt-dlp JavaScript runtimes
nvm_node_path = os.path.expanduser("~/.nvm/versions/node")
if os.path.exists(nvm_node_path):
    node_bins = glob.glob(os.path.join(nvm_node_path, "v*", "bin"))
    if node_bins:
        os.environ["PATH"] = node_bins[-1] + os.path.pathsep + os.environ.get("PATH", "")

from pathlib import Path
# Load environment variables from project root
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Prefer Service Role Key for backend

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    print("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def safe_extract_info(url, ydl_opts, download=False):
    """
    Extracts info (and optionally downloads) with fallback logic for browser cookies.
    """
    cookies_browser_env = os.getenv("YT_DLP_COOKIES_BROWSER")
    browsers_to_try = []
    if cookies_browser_env:
        browsers_to_try = [b.strip() for b in cookies_browser_env.split(',') if b.strip()]
    
    # If a specific cookiefile is provided in opts, try it first!
    if 'cookiefile' in ydl_opts:
        # None in browsers_to_try means "no browser cookies, use ydl_opts as-is (which includes cookiefile)"
        browsers_to_try = [None] + browsers_to_try
    else:
        # Otherwise try browser cookies first, fallback to None (no cookies)
        browsers_to_try = browsers_to_try + [None]
        
    last_exception = None
    for browser in browsers_to_try:
        opts = ydl_opts.copy()
        if browser:
            print(f"--> [AUTH] Trying cookies from browser: {browser}")
            opts['cookiesfrombrowser'] = (browser,)
        else:
            opts.pop('cookiesfrombrowser', None)
            
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=download)
                filename = ydl.prepare_filename(info) if download else None
                return info, filename
        except Exception as e:
            last_exception = e
            is_cookie_error = any(err in str(e).lower() for err in ['cookie', 'database', 'permission', 'find'])
            if browser and is_cookie_error:
                print(f"--> [AUTH Warning] Failed to load cookies from browser '{browser}': {e}. Trying next option...")
                continue
            elif browser:
                print(f"--> [Warning] Extraction/download failed with browser '{browser}': {e}. Trying next option...")
                continue
            else:
                # No more options left, will raise the last exception
                break
                
    raise last_exception

def progress_hook(d):
    if d['status'] == 'downloading':
        try:
            p = d.get('_percent_str', '0%').replace('%','')
            print(f"Progress: {p}%")
            # In a real scenario, we might want to throttle these updates to Supabase
        except Exception:
            pass
    if d['status'] == 'finished':
        print("Download finished, post-processing...")

def process_job(job):
    print(f"Processing job: {job['id']} - {job['original_url']} [{job['status']}]")
    
    url = job['original_url']
    
    # --- SCANNING PHASE ---
    if job['status'] == 'scanning':
        try:
            print(f"--> [SCAN START] Fetching info for: {url}")
            # Check for cookies.txt in project root
            cookies_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'cookies.txt')
            
            ydl_opts = {
                'quiet': True, 
                'no_warnings': True,
                'noplaylist': True,
                'extract_flat': 'in_playlist', # Faster extraction
                'js_runtimes': {'node': {}},
                'remote_components': ['ejs:github'],
            }
            
            if os.path.exists(cookies_path):
                print(f"--> [AUTH] Using cookies from: {cookies_path}")
                ydl_opts['cookiefile'] = cookies_path
            
            info, _ = safe_extract_info(url, ydl_opts, download=False)
            print(f"--> [SCAN DONE] Info extracted. Title: {info.get('title')}")
            
            formats = []
            
            # Filter and simplify formats for UI
            seen_resolutions = set()
            for f in info.get('formats', []):
                # Skip if no video
                if f.get('vcodec') == 'none':
                    continue
                    
                # Determine if it needs audio merging
                is_video_only = f.get('acodec') == 'none'
                
                # Construct smart format ID
                # If video-only (common for 1080p+), request merge with best audio (with fallback if no audio exists)
                smart_format_id = f"{f['format_id']}+bestaudio/{f['format_id']}" if is_video_only else f['format_id']
                
                # Basic attributes
                resolution = f.get('resolution') or f'{f.get("width")}x{f.get("height")}'
                ext = f['ext']
                filesize = f.get('filesize_approx') or f.get('filesize')
                
                # Deduplication strategy:
                # Prefer MP4 over others for same resolution (simple heuristic)
                # We create a unique key for resolution.
                # Note: users might want specific codec, but for "Simple" UI, unique resolution is better.
                # We process generally from worst to best in format list usually, or reverse in the loop below.
                # Let's just allow all strictly, OR filter duplicates.
                # Let's allow all for now but maybe prioritize MP4 visually? 
                # Actually, simple dedupe: if 1080p mp4 exists, don't show 1080p webm
                
                res_key = f"{resolution}"
                if res_key in seen_resolutions and ext != 'mp4': 
                     continue # Skip non-mp4 duplicates if we already saw one (assuming sorting helps)
                # Actually better to just add all unique combos of Res+Ext
                
                # Simpler filter: just ensure we have meaningful resolution
                if not resolution or 'audio only' in resolution: 
                    continue

                # Human readable size
                size_str = "Unknown"
                if filesize:
                    size_str = f"{filesize / 1024 / 1024:.1f} MB"

                formats.append({
                    'format_id': smart_format_id,
                    'resolution': resolution,
                    'ext': ext,
                    'filesize': size_str,
                    'note': f.get('format_note')
                })
                seen_resolutions.add(res_key)
            
            # Sort: Highest Resolution first
            # We can rely on yt-dlp sorting roughly, but let's reverse to show best on top
            formats.reverse()

            # Add Audio Only Option
            formats.insert(0, {
                'format_id': 'audio_only',
                'resolution': 'Audio Only',
                'ext': 'mp3',
                'filesize': 'Varies',
                'note': 'Convert to MP3'
            })
            
            # Update DB
            supabase.table('downloads').update({
                'status': 'waiting_for_selection',
                'available_formats': formats,
                'title': info.get('title', 'Unknown Title') # Store title early
            }).eq('id', job['id']).execute()
            print("Formats extracted. Waiting for user selection.")

        except Exception as e:
            print(f"Error scanning {url}: {e}")
            supabase.table('downloads').update({
                'status': 'failed',
                'filename': str(e)
            }).eq('id', job['id']).execute()
        return

    # --- DOWNLOAD PHASE ---
    if job['status'] == 'processing':
        # Smart Path Detection Logic
        def get_download_path():
            # 1. Environment Variable (Highest Priority)
            env_path = os.getenv("DOWNLOAD_ROOT")
            if env_path:
                return env_path

            # 2. Handle sudo on Linux / Unix (If run with sudo, target real user's Downloads folder)
            sudo_user = os.getenv("SUDO_USER")
            if sudo_user:
                try:
                    import pwd
                    user_home = pwd.getpwnam(sudo_user).pw_dir
                    user_downloads = os.path.join(user_home, 'Downloads')
                    if os.path.exists(user_downloads):
                        return user_downloads
                    return user_home
                except Exception:
                    pass
            
            # 3. Android (Termux) Detection
            if "ANDROID_ROOT" in os.environ or "TERMUX_VERSION" in os.environ:
                 # Prefer ~/storage/downloads (symlink created by termux-setup-storage)
                 termux_storage = os.path.expanduser('~/storage/downloads')
                 if os.path.exists(termux_storage):
                     return termux_storage
                 return "/storage/emulated/0/Download"
            
            # 4. Windows Detection
            if os.name == 'nt' or platform.system() == 'Windows':
                return os.path.join(os.environ.get('USERPROFILE', os.path.expanduser('~')), 'Downloads')
            
            # 5. Linux / Unix Detection
            try:
                # Use xdg-user-dir if available
                result = subprocess.check_output(['xdg-user-dir', 'DOWNLOAD'], stderr=subprocess.STDOUT).decode('utf-8').strip()
                if result and os.path.exists(result):
                    return result
            except Exception:
                pass

            # Fallback to default ~/Downloads
            return os.path.join(os.path.expanduser('~'), 'Downloads')

        # Base Downloads folder
        downloads_folder = get_download_path()
        
        # Target folder for this app
        base_path = os.path.join(downloads_folder, 'UniversalDownloader')
        
        # Output template: Save in UniversalDownloader/ChannelName/Title.ext
        # Using a fallback chain: uploader -> channel -> domain -> "Unknown"
        output_template = os.path.join(base_path, "%(uploader|channel|webpage_url_domain|Unknown)s", "%(title)s.%(ext)s")
        
        print(f"--> Target Base Path: {base_path}")
        print(f"--> Output Template: {output_template}")

        # Ensure Base folder exists 
        try:
            os.makedirs(base_path, exist_ok=True)
        except Exception as e:
            print(f"Warning: Could not create base path {base_path}: {e}")

        # Use selected format if available, otherwise best (with fallback chain for format stability)
        selected_format = job.get('selected_format')
        if selected_format and selected_format != 'audio_only':
            if '/' in selected_format:
                format_str = f"{selected_format}/bestvideo+bestaudio/best"
            elif '+' in selected_format:
                base_format = selected_format.split('+')[0]
                format_str = f"{selected_format}/{base_format}/bestvideo+bestaudio/best"
            else:
                format_str = f"{selected_format}/bestvideo+bestaudio/best"
        elif selected_format == 'audio_only':
            format_str = 'bestaudio/best'
        else:
            format_str = 'bestvideo+bestaudio/best'
        
        # Audio Only Logic
        ydl_opts_extra = {}
        if selected_format == 'audio_only':
            ydl_opts_extra = {
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }

        # Progress Hook with Throttling
        last_update_time = 0
        
        def db_progress_hook(d):
            nonlocal last_update_time
            current_time = time.time()
            
            # Throttle: Update DB max once every 0.5 seconds (more frequent updates for user feedback)
            if current_time - last_update_time < 0.5 and d['status'] != 'finished':
                return
            
            if d['status'] == 'downloading':
                try:
                    p_str = d.get('_percent_str', '0%').replace('%','')
                    progress = float(p_str)
                    
                    status_log = f"Downloading: {p_str}% of {d.get('_total_bytes_str') or d.get('_total_bytes_estimate_str') or '?'}"
                    print(f"--> {status_log}")
                    
                    supabase.table('downloads').update({
                        'status': 'downloading',
                        'progress': int(progress),
                        'last_log': status_log
                    }).eq('id', job['id']).execute()
                    
                    last_update_time = current_time
                    
                except Exception as e:
                    print(f"Error sending progress: {e}")
                    pass
            
            if d['status'] == 'finished':
                print("Download phase finished. Converting/Merging...")
                supabase.table('downloads').update({
                    'progress': 100,
                    'last_log': "Download finished. Merging formats..."
                }).eq('id', job['id']).execute()

        # Check for cookies.txt in project root
        cookies_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'cookies.txt')

        ydl_opts = {
            'outtmpl': output_template,
            'progress_hooks': [db_progress_hook],
            'format': format_str,
            'quiet': False,
            'no_warnings': True,
            'js_runtimes': {'node': {}},
            'remote_components': ['ejs:github'],
            **ydl_opts_extra
        }

        if os.path.exists(cookies_path):
            print(f"--> [AUTH] Using cookies for download from: {cookies_path}")
            ydl_opts['cookiefile'] = cookies_path

        try:
            # Update status to downloading start
            supabase.table('downloads').update({
                'status': 'downloading', 
                'progress': 0,
                'last_log': f"Starting download to: {base_path}"
            }).eq('id', job['id']).execute()

            try:
                info, filename = safe_extract_info(url, ydl_opts, download=True)
            except Exception as first_err:
                err_msg = str(first_err).lower()
                if "requested format" in err_msg or "format" in err_msg:
                    print(f"--> [Fallback Triggered] Specific format unavailable: {first_err}. Retrying with best available format...")
                    ydl_opts['format'] = 'bestvideo+bestaudio/best'
                    info, filename = safe_extract_info(url, ydl_opts, download=True)
                else:
                    raise first_err
                
            print(f"Successfully downloaded to: {filename}")
            
            # Update status to completed
            supabase.table('downloads').update({
                'status': 'completed',
                'filename': filename,
                'progress': 100,
                'last_log': f"Download Complete! Saved to: {filename}"
            }).eq('id', job['id']).execute()

        except Exception as e:
            print(f"Error downloading {url}: {e}")
            supabase.table('downloads').update({
                'status': 'failed',
                'filename': str(e),
                'last_log': f"Error: {str(e)}"
            }).eq('id', job['id']).execute()

async def main():
    print("Universal Downloader Worker Started...")
    try:
        # Test connection
        supabase.table('downloads').select("count", count="exact").limit(1).execute()
        print("Connected to Supabase successfully.")
    except Exception as e:
        print(f"Critical Error: Could not connect to Supabase: {e}")
        return

    print("Waiting for jobs (scanning or processing)...")

    # Initial check
    response = supabase.table('downloads').select("*").in_('status', ['scanning', 'processing']).execute()
    for job in response.data:
        process_job(job)

    # Poll loop
    while True:
        try:
            response = supabase.table('downloads').select("*").in_('status', ['scanning', 'processing']).execute()
            
            if response.data:
                for job in response.data:
                    process_job(job)
            
            time.sleep(3) # Faster poll
        except Exception as e:
            print(f"Error in polling loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
