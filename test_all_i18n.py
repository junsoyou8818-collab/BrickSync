"""다국어(i18n) 태그 검사.

- web_app/ 의 .html 에서 쓰인 data-i18n / data-i18n-placeholder / data-i18n-title 키가 settings.js 의 ko·en 사전에 모두 있는지
- ko 와 en 사전의 키가 서로 같은지
사용: py test_all_i18n.py        (실패가 있으면 종료 코드 1)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'web_app')
SKIP = re.compile(r'(_copy|_utf8|_[0-9a-f]{7}|_v2)\.html$')

with open(os.path.join(SRC, 'settings.js'), encoding='utf-8') as f: js = f.read()
m_ko = re.search(r'^\s*ko\s*:\s*\{', js, re.M); m_en = re.search(r'^\s*en\s*:\s*\{', js, re.M)
key = re.compile(r'^\s*([A-Za-z_][\w]*)\s*:\s*["\'`]', re.M)
ko = set(key.findall(js[m_ko.end():m_en.start()]))
# en 사전은 ko 이후 첫 줄 시작의 닫는 괄호(`    };`)에서 끝난다
tail = js[m_en.end():]; end = re.search(r'^\s{0,4}\};', tail, re.M)
en = set(key.findall(tail[:end.start()] if end else tail))

used = {}
for name in sorted(os.listdir(SRC)):
    if not name.endswith('.html') or SKIP.search(name): continue
    with open(os.path.join(SRC, name), encoding='utf-8') as f: t = f.read()
    for k in re.findall(r'data-i18n(?:-[a-z]+)?\s*=\s*"([^"]+)"', t):
        used.setdefault(k, set()).add(name)

fails = []
for k in sorted(used):
    miss = [l for l, d in (('ko', ko), ('en', en)) if k not in d]
    if miss: fails.append('%s 사전에 없음: %s  (%s)' % ('/'.join(miss), k, ', '.join(sorted(used[k]))))
for k in sorted(ko - en): fails.append('en 번역 누락: ' + k)
for k in sorted(en - ko): fails.append('ko 번역 누락: ' + k)

print('ko 키 %d개, en 키 %d개, 사용된 키 %d개' % (len(ko), len(en), len(used)))
if fails:
    print('FAIL %d건' % len(fails)); [print('  - ' + x) for x in fails]; sys.exit(1)
print('PASS (0 Fail)')
