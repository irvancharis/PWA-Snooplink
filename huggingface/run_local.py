import os
import json
import sys

# Path to the service account credentials in the parent directory
cred_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "snooplink-pro-firebase-adminsdk-fbsvc-a12a040462.json"))

if not os.path.exists(cred_path):
    print(f"Error: Credential file not found at '{cred_path}'")
    print("Please make sure the file 'snooplink-pro-firebase-adminsdk-fbsvc-a12a040462.json' is present in the parent directory.")
    sys.exit(1)

print(f"Loading credentials from {cred_path}...")
try:
    with open(cred_path, "r") as f:
        cred = json.load(f)
        
    os.environ["FIREBASE_PROJECT_ID"] = cred.get("project_id", "")
    os.environ["FIREBASE_CLIENT_EMAIL"] = cred.get("client_email", "")
    os.environ["FIREBASE_PRIVATE_KEY"] = cred.get("private_key", "")
    os.environ["HF_SECRET"] = "SnooplinkSuperSecret123"
    
    print("Successfully set environment variables for Firebase Admin SDK and HF Secret.")
except Exception as e:
    print(f"Error loading credentials: {e}")
    sys.exit(1)

# Import and run the Flask app
print("Starting local server...")
from app import app

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=7860, debug=True)
