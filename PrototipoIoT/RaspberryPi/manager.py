import firebase_admin
from firebase_admin import credentials, firestore
import subprocess
import time
import signal
import sys

cred = credentials.Certificate("credencial.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

processes = {}

SCRIPTS = {
    "control-manual": "control-manual.py",
    "receptor-esp32cam": "receptor-esp32cam.py",
    "publicador-backend": "publicador-backend.py"
}

def start_script(name):
    if name not in SCRIPTS:
        return

    if name in processes and processes[name].poll() is None:
        print(f"{name} is already running.")
        return

    print(f"Starting {name}...")

    if name == "receptor-esp32cam":
        processes[name] = subprocess.Popen([
            "/home/raspyfx666g/.local/bin/uvicorn",
            "receptor-esp32cam:app",
            "--host", "0.0.0.0",
            "--port", "8000"
        ])
    else:
        processes[name] = subprocess.Popen(["python3", SCRIPTS[name]])

def stop_script(name):
    if name in processes and processes[name].poll() is None:
        print(f"Stopping {name}...")
        processes[name].terminate()
        try:
            processes[name].wait(timeout=5)
        except subprocess.TimeoutExpired:
            processes[name].kill()
        
        if name in processes:
            del processes[name]

def sync_scripts(data):
    if not data: return

    for name, should_run in data.items():
        if name in SCRIPTS:
            if should_run:
                start_script(name)
            else:
                stop_script(name)

doc_ref = db.collection("control").document("raspberry")

def on_snapshot(doc_snapshot, changes, read_time):
    for doc in doc_snapshot:
        data = doc.to_dict()
        print("Change detected in Firestore:", data)
        sync_scripts(data)

if __name__ == "__main__":
    print("Starting Manager...")

    doc_ref.on_snapshot(on_snapshot)

    print("Manager listening for changes...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nManager stopped by user.")
        for name in list(processes.keys()):
            stop_script(name)
        sys.exit(0)