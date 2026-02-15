import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('worker/.env')

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing credentials in worker/.env")
    exit(1)

supabase = create_client(url, key)

print("Checking for pending jobs...")
try:
    # Query last 5 jobs
    response = supabase.table('downloads').select("*").order('created_at', desc=True).limit(5).execute()
    print(f"Found {len(response.data)} recent jobs.")
    for job in response.data:
        print(f"- [{job['created_at']}] ID: {job['id']} | Status: {job['status']} | Msg/File: {job['filename']}")
except Exception as e:
    print(f"Error querying Supabase: {e}")
