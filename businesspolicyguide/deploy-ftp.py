from ftplib import FTP
from pathlib import Path
import json
import time

FTP_HOST = "212.85.28.149"
FTP_USER = "u868313694.businesspolicyguide.com"
FTP_PASS = "Xxh113324~"
REMOTE_ROOT = "/public_html"
ROOT = Path(__file__).resolve().parent
CACHE_FILE = ROOT / "deploy-cache.json"

EXCLUDE = {
    ".git",
    "node_modules",
    "build-site.js",
    "audit.js",
    "deploy-ftp.js",
    "deploy-ftp.py",
    "ftp-debug.js",
    "deploy-cache.json",
    "package.json",
    "package-lock.json",
    "AGENTS.md",
    "CLAUDE.md",
}


def load_cache():
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"files": {}}


def save_cache(cache):
    CACHE_FILE.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def collect(cache):
    files = []
    for path in ROOT.rglob("*"):
      if any(part in EXCLUDE for part in path.relative_to(ROOT).parts):
          continue
      if not path.is_file():
          continue
      rel = path.relative_to(ROOT).as_posix()
      remote = f"{REMOTE_ROOT}/{rel}"
      mtime = path.stat().st_mtime
      if cache["files"].get(remote, 0) < mtime:
          files.append((path, remote, mtime))
    return files


def ensure_dir(ftp, remote_file):
    parts = remote_file.strip("/").split("/")[:-1]
    ftp.cwd("/")
    for part in parts:
        try:
            ftp.mkd(part)
        except Exception:
            pass
        ftp.cwd(part)


def upload():
    cache = load_cache()
    files = collect(cache)
    print(f"Deploy BusinessPolicyGuide via Python FTP: {len(files)} files")
    ftp = FTP()
    ftp.connect(FTP_HOST, 21, timeout=60)
    ftp.login(FTP_USER, FTP_PASS)
    for local, remote, mtime in files:
        ensure_dir(ftp, remote)
        ftp.cwd("/")
        with local.open("rb") as fh:
            ftp.storbinary(f"STOR {remote}", fh)
        cache["files"][remote] = mtime
        print(f"OK {remote}")
    ftp.quit()
    cache["lastDeploy"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save_cache(cache)


if __name__ == "__main__":
    upload()
