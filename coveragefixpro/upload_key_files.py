import ftplib, os

HOST = '212.85.28.149'
USER = 'u868313694.coveragefixpro.com'
PASS = 'Xxh113324~'
LOCAL = r'C:\Users\Administrator\coveragefixpro'

FILES = [
    (r'css\style.css', '/public_html/css/style.css'),
    ('index.html', '/public_html/index.html'),
    ('logo.svg', '/public_html/logo.svg'),
    ('favicon.svg', '/public_html/favicon.svg'),
]

ftp = ftplib.FTP()
ftp.connect(HOST, 21, timeout=30)
ftp.login(USER, PASS)
print('Connected')

for local_rel, remote in FILES:
    local_path = os.path.join(LOCAL, local_rel)
    with open(local_path, 'rb') as f:
        ftp.storbinary(f'STOR {remote}', f)
    print(f'Uploaded: {remote}')

ftp.quit()
print('Done')
