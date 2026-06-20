import ftplib, os

HOST = '212.85.28.149'
USER = 'u868313694.coveragefixpro.com'
PASS = 'Xxh113324~'
LOCAL_ROOT = r'C:\Users\Administrator\coveragefixpro'
REMOTE_ROOT = '/public_html'

EXCLUDE = {'node_modules', '.git', 'pinterest', 'coveragefixpro-upload.zip',
           'deploy-ftp.js', 'ftp_deploy.py', 'fix_logo.py', 'ftp_upload.py',
           'fix_orphan_toolcards.py', 'fix_related.py', 'package.json',
           'package-lock.json', '__pycache__'}

def ensure_dir(ftp, remote_dir):
    try:
        ftp.cwd(remote_dir)
    except ftplib.error_perm:
        ftp.mkd(remote_dir)
        ftp.cwd(remote_dir)

def upload_dir(ftp, local_dir, remote_dir):
    ensure_dir(ftp, remote_dir)
    for item in os.listdir(local_dir):
        if item in EXCLUDE or item.startswith('.'):
            continue
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isdir(local_path):
            upload_dir(ftp, local_path, remote_path)
            ftp.cwd(remote_dir)
        else:
            with open(local_path, 'rb') as f:
                ftp.storbinary(f'STOR {item}', f)
            print(f'  {remote_path}')

ftp = ftplib.FTP()
ftp.connect(HOST, 21, timeout=60)
ftp.login(USER, PASS)
print('Connected:', ftp.getwelcome()[:50])

upload_dir(ftp, LOCAL_ROOT, REMOTE_ROOT)

ftp.quit()
print('\nAll done.')
