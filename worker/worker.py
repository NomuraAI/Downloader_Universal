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
                for f in info.get('formats', []):
                    # Only keep video+audio or distinct useful formats to reduce noise
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        formats.append({
                            'format_id': f['format_id'],
                            'resolution': f.get('resolution') or f'{f.get("width")}x{f.get("height")}',
                            'ext': f['ext'],
                            'filesize': f.get('filesize_approx') or f.get('filesize'),
                            'note': f.get('format_note')
                        })
                
                # Sort best to worst roughly
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

        ydl_opts = {
            'outtmpl': output_path,
            'progress_hooks': [progress_hook],
            'format': format_str,
            'quiet': False,
            'no_warnings': True,
        }

        try:
            # Update status to downloading
            supabase.table('downloads').update({'status': 'downloading'}).eq('id', job['id']).execute()

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
                print(f"Successfully downloaded to: {filename}")
                
                # Update status to completed
                supabase.table('downloads').update({
                    'status': 'completed',
                    'filename': filename
                }).eq('id', job['id']).execute()

        except Exception as e:
            print(f"Error downloading {url}: {e}")
            supabase.table('downloads').update({
                'status': 'failed',
                'filename': str(e)
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
