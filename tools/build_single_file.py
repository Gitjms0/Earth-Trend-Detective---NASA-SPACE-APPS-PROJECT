"""
build_single_file.py — Builds dist/earth-trend-detective.html, a version of the app
in a single file that opens with a double click (no web server needed).

It inlines css/style.css, the example cases in data/demos/ (as window.__DEMOS__)
and every module in js/, in dependency order, inside one plain <script>.
The import/export lines are removed: inside a single script the modules share scope.

Usage, from the project folder:
    python3 tools/build_single_file.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Each module comes after the modules it imports.
ORDER = ['power', 'catalog', 'stats', 'birth', 'heat', 'model', 'geo', 'globe', 'brand', 'ui', 'app']


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def module_body(name):
    src = read(f'js/{name}.js')
    src = re.sub(r"^import \{[^}]*\} from '[^']+';\n", '', src, flags=re.M)
    src = re.sub(r'^export ', '', src, flags=re.M)
    return src.rstrip() + '\n'


def demos():
    index = json.loads(read('data/demos/index.json'))
    return [{**d, **json.loads(read(f"data/demos/{d['file']}"))} for d in index]


def build():
    html = read('index.html')
    css = read('css/style.css')
    js = '\n'.join(module_body(m) for m in ORDER)
    data = json.dumps(demos(), ensure_ascii=False, separators=(',', ':'))
    script = f'<script>window.__DEMOS__={data};\n(function(){{\n{js}\n}})();</script>'

    link = '<link rel="stylesheet" href="css/style.css">'
    entry = '<script type="module" src="js/app.js"></script>'
    assert link in html and entry in html, 'index.html no longer has the expected tags'
    html = html.replace(link, f'<style>\n{css}</style>').replace(entry, script)

    out = ROOT / 'dist' / 'earth-trend-detective.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print(f'Written {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    build()
