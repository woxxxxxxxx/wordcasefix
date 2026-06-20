#!/bin/bash
FTP_HOST="212.85.28.149"
FTP_USER="u868313694.coveragefixpro.com"
FTP_PASS="Xxh113324~"
REMOTE_BASE="ftp://${FTP_HOST}/public_html"
LOCAL_BASE="$(cd "$(dirname "$0")" && pwd)"

EXCLUDES=("node_modules" ".git" "deploy-ftp.js" "deploy-curl.sh" "pinterest" "package.json" "package-lock.json")

function is_excluded() {
  local name="$1"
  for ex in "${EXCLUDES[@]}"; do
    [[ "$name" == "$ex" ]] && return 0
  done
  return 1
}

function upload_dir() {
  local local_dir="$1"
  local remote_dir="$2"

  for item in "$local_dir"/*; do
    [[ -e "$item" ]] || continue
    local name=$(basename "$item")
    is_excluded "$name" && continue

    if [[ -d "$item" ]]; then
      upload_dir "$item" "${remote_dir}/${name}"
    else
      echo "Uploading: ${remote_dir}/${name}"
      curl -s --max-time 30 --retry 2 \
        --user "${FTP_USER}:${FTP_PASS}" \
        --ftp-create-dirs \
        -T "$item" \
        "${remote_dir}/${name}" 2>&1
    fi
  done
}

echo "Starting FTP upload to Hostinger..."
upload_dir "$LOCAL_BASE" "$REMOTE_BASE"
echo "Done!"
