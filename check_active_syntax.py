"""BrickSync 구문 + 미러 동기화 검사.

1) web_app/ 의 활성 .html 인라인 <script> 와 .js 파일을 `node --check` 로 구문 검사
2) web_app/ 의 파일이 다른 3곳 미러(루트, bricksync_project/web_app, BrickSync-main/bricksync_project/web_app)와
   바이트 단위로 같은지 검사 (미러에 파일이 있는 경우만)
사용: py check_active_syntax.py        (실패가 있으면 종료 코드 1)
"""
import os, re, subprocess, sys, tempfile, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'web_app')
MIRRORS = [ROOT, os.path.join(ROOT, 'bricksync_project', 'web_app'),
           os.path.join(ROOT, 'BrickSync-main', 'bricksync_project', 'web_app')]
SKIP = re.compile(r'(_copy|_utf8|_[0-9a-f]{7}|_v2)\.html$|^(patch|fix_)')   # 백업/임시 파일은 검사하지 않는다
SCRIPT = re.compile(r'<script(?P<a>[^>]*)>(?P<b>.*?)</script>', re.S | re.I)

def node_check(code, label):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(code); p = f.name
    try:
        r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
        return None if r.returncode == 0 else (r.stderr.strip().splitlines() or ['?'])[-1] + '  @ ' + label
    finally:
        os.unlink(p)

def digest(p):
    with open(p, 'rb') as f: return hashlib.md5(f.read().replace(b'\r\n', b'\n')).hexdigest()

fails, checked = [], 0
for name in sorted(os.listdir(SRC)):
    p = os.path.join(SRC, name)
    if not os.path.isfile(p) or SKIP.search(name): continue
    if name.endswith('.js'):
        checked += 1
        with open(p, encoding='utf-8') as f: e = node_check(f.read(), name)
        if e: fails.append('구문: ' + e)
    elif name.endswith('.html'):
        with open(p, encoding='utf-8') as f: t = f.read()
        for i, m in enumerate(SCRIPT.finditer(t)):
            a = m.group('a')
            if 'src=' in a or re.search(r'type\s*=\s*["\'](?!text/javascript|module)', a): continue
            if not m.group('b').strip(): continue
            checked += 1
            e = node_check(m.group('b'), '%s <script #%d>' % (name, i))
            if e: fails.append('구문: ' + e)
    else:
        continue
    for mr in MIRRORS:
        q = os.path.join(mr, name)
        if os.path.isfile(q) and digest(p) != digest(q):
            fails.append('미러 불일치: ' + os.path.relpath(q, ROOT))

print('검사한 스크립트: %d개' % checked)
if fails:
    print('FAIL %d건' % len(fails)); [print('  - ' + x) for x in fails]; sys.exit(1)
print('PASS (0 Fail)')
