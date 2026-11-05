#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if curl --fail --silent --max-time 2 http://127.0.0.1:5173/ | /usr/bin/grep -q '<title>舞台用語ライブラリ</title>'; then
  open http://127.0.0.1:5173/
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  print 'Node.js が見つかりません。Node.js を準備してから開いてください。'
  read '?Enter で閉じます。'
  exit 1
fi

npm run dev -- --open
