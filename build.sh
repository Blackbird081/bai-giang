#!/usr/bin/env bash
# Ghép trang từ mã nguồn và kiểm cú pháp mô-đun JS.
set -euo pipefail
cd "$(dirname "$0")"
cat src/head.part src/body.part src/script.part > te-bao/index.html
python3 tools/inject_shell.py te-bao/index.html
python3 - <<'PY'
s = open("te-bao/index.html").read(); a = s.index('<script type="module">') + len('<script type="module">'); b = s.index('</script>', a)
open('/tmp/htvtb_module.mjs', 'w').write(s[a:b])
PY
node --check /tmp/htvtb_module.mjs && echo "te-bao/index.html: cú pháp JS hợp lệ"
