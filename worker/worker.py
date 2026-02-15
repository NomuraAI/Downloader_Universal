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
            # to avoid rate limits.
        except Exception:
            pass
    if d['status'] == 'finished':
        print("Download finished, post-processing...")

def process_download(job):
    print(f"Processing job: {job['id']} - {job['original_url']}")
    
    url = job['original_url']
    # Organize by Uploader/Channel Name
    # yt-dlp handles 'uploader' for YouTube, Instagram, TikTok, etc.
    output_path = "Downloads/%(uploader)s/%(title)s.%(ext)s" 
    
    # Ensure Downloads folder exists (yt-dlp will create subfolders automatically)
    if not os.path.exists("Downloads"):
        os.makedirs("Downloads")

    ydl_opts = {
        'outtmpl': output_path,
        'progress_hooks': [progress_hook],
        'format': 'best', # Simplified for now
        'quiet': False,
        'no_warnings': True,
        # 'restrictfilenames': True, # Optional: to ensure safe filenames
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
            'filename': str(e) # Store error message in filename for debug
        }).eq('id', job['id']).execute()

async def main():
    print("Universal Downloader Worker Started...")
    print("Waiting for new download jobs...")

    # Initial check for pending jobs
    response = supabase.table('downloads').select("*").eq('status', 'processing').execute()
    for job in response.data:
        process_download(job)

    # Poll for new jobs (Simple polling for now as Realtime setup in Python can be complex)
    while True:
        try:
            # Check for 'processing' jobs which acts as our queue
            response = supabase.table('downloads').select("*").eq('status', 'processing').execute()
            
            if response.data:
                for job in response.data:
                    process_download(job)
            
            time.sleep(5) # Poll every 5 seconds
        except Exception as e:
            print(f"Error in polling loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
