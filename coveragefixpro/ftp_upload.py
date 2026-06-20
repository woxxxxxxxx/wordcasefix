"""
FTP upload via SOCKS5 proxy (127.0.0.1:7897)
PySocks monkey-patches socket globally — all FTP connections (control + PASV data) go through proxy
"""
import os, socket, ftplib, socks

PROXY_HOST = '127.0.0.1'
PROXY_PORT = 7897
FTP_HOST   = '212.85.28.149'
FTP_PORT   = 21
FTP_USER   = 'u868313694.coveragefixpro.com'
FTP_PASS   = 'Xxh113324~'
LOCAL_DIR  = r'C:\Users\Administrator\coveragefixpro'
REMOTE_DIR = '/public_html'
EXCLUDE    = {
    'node_modules', 'deploy-ftp.js', 'ftp_upload.py', '.git',
    'pinterest', '.gitignore', 'coveragefixpro-upload.zip',
    'package.json', 'package-lock.json'
}

# Route ALL socket connections through SOCKS5 proxy
socks.set_default_proxy(socks.SOCKS5, PROXY_HOST, PROXY_PORT)
socket.socket = socks.socksocket

count = 0

def ensure_dir(ftp, path):
    try:
        ftp.mkd(path)
    except ftplib.error_perm:
        pass  # already exists

def get_remote_files(ftp, remote_dir):
    """Get set of files already on server"""
    existing = set()
    try:
        lines = []
        ftp.retrlines('LIST ' + remote_dir, lines.append)
        for line in lines:
            parts = line.split()
            if parts:
                name = parts[-1]
                if not line.startswith('d'):
                    existing.add(remote_dir + '/' + name)
    except Exception:
        pass
    return existing

def make_ftp():
    """Create a fresh FTP connection via SOCKS5"""
    f = ftplib.FTP()
    f.connect(FTP_HOST, FTP_PORT, timeout=60)
    f.login(FTP_USER, FTP_PASS)
    f.set_pasv(True)
    return f

def upload_file(ftp_ref, local_path, remote_path, retries=4):
    global count
    for attempt in range(retries):
        try:
            with open(local_path, 'rb') as f:
                ftp_ref[0].storbinary('STOR ' + remote_path, f)
            count += 1
            print('Uploaded:', remote_path)
            return
        except Exception as e:
            print(f'  Attempt {attempt+1} failed: {e}')
            if attempt < retries - 1:
                import time; time.sleep(3)
                try:
                    ftp_ref[0].quit()
                except Exception:
                    pass
                ftp_ref[0] = make_ftp()
            else:
                print(f'  SKIPPED (all retries failed): {remote_path}')

def upload_dir(ftp_ref, local_dir, remote_dir):
    for item in sorted(os.listdir(local_dir)):
        if item in EXCLUDE:
            continue
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isdir(local_path):
            ensure_dir(ftp_ref[0], remote_path)
            upload_dir(ftp_ref, local_path, remote_path)
        else:
            upload_file(ftp_ref, local_path, remote_path)

print('Connecting via SOCKS5 proxy...')
ftp = make_ftp()
print('Logged in! Starting upload...')

ftp_ref = [ftp]
upload_dir(ftp_ref, LOCAL_DIR, REMOTE_DIR)

try:
    ftp_ref[0].quit()
except Exception:
    pass
print(f'\nUpload complete! Total files uploaded: {count}')
