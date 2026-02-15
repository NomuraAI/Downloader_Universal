import os
import time
import json
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv
import yt_dlp

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Prefer Service Role Key for backend

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    print("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
            ydl_opts = {'quiet': True, 'no_warnings': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
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
                    # If video-only (common for 1080p+), request merge with best audio
                    smart_format_id = f"{f['format_id']}+bestaudio" if is_video_only else f['format_id']
                    
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
        # User requested specific path
        base_path = "/run/media/bapperida/DATA BAPPERIDA/YouTube VIDEOS"
        
        # Organize by Uploader/Channel Name
        output_path = os.path.join(base_path, "%(uploader)s", "%(title)s.%(ext)s")
        
        # Ensure Base folder exists 
        if not os.path.exists(base_path):
            os.makedirs(base_path)

        # Use selected format if available, otherwise best
        selected_format = job.get('selected_format')
        format_str = selected_format if selected_format else 'best'

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

        ydl_opts = {
            'outtmpl': output_path,
            'progress_hooks': [db_progress_hook],
            'format': format_str,
            'quiet': False,
            'no_warnings': True,
        }

        try:
            # Update status to downloading start
            supabase.table('downloads').update({
                'status': 'downloading', 
                'progress': 0,
                'last_log': "Starting download engine..."
            }).eq('id', job['id']).execute()

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
                print(f"Successfully downloaded to: {filename}")
                
                # Update status to completed
                supabase.table('downloads').update({
                    'status': 'completed',
                    'filename': filename,
                    'progress': 100,
                    'last_log': "Download Complete!"
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
