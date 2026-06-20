import ftplib, os

HOST = '212.85.28.149'
USER = 'u868313694.coveragefixpro.com'
PASS = 'Xxh113324~'
LOCAL = r'C:\Users\Administrator\coveragefixpro'
REMOTE = '/public_html'

SKIP_DIRS = {'node_modules', '.git', '__pycache__'}
SKIP_FILES = {'ftp_deploy.py', 'fix_logo.py', 'ftp_upload.py', 'fix_orphan_toolcards.py',
              'fix_related.py', 'fix_logo_img.py', 'fix_logo_height.py', 'upload_key_files.py',
              'upload_all_html.py', 'deploy-ftp.js', 'upload-css.js'}

ftp = ftplib.FTP()
ftp.connect(HOST, 21, timeout=30)
ftp.login(USER, PASS)
print('Connected')

count = 0
for root, dirs, files in os.walk(LOCAL):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        if not fname.endswith('.html'):
            continue
        if fname in SKIP_FILES:
            continue
        local_path = os.path.join(root, fname)
        rel = os.path.relpath(local_path, LOCAL).replace('\\', '/')
        remote_path = f'{REMOTE}/{rel}'
        # ensure remote dir exists
        remote_dir = remote_path.rsplit('/', 1)[0]
        try:
            ftp.mkd(remote_dir)
        except Exception:
            pass
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {remote_path}', f)
        count += 1
        if count % 20 == 0:
            print(f'  {count} files uploaded...')

ftp.quit()
print(f'Done: {count} HTML files uploaded')
