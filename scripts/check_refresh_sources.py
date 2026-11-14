#!/usr/bin/env python3
"""Require reviewed refresh code and complete TY page assets before a daily run."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'scripts/refresh_data.py', 'scripts/public_data.py', 'scripts/membership_history.py',
    'scripts/monthly_history.py', 'scripts/validate_public_exports.py',
    'scripts/check_refresh_sources.py', 'data/beascout-links.json',
    'src/monthly.html', 'src/monthly.js', 'src/monthly-model.js',
    'src/history.html', 'src/information.js', 'src/information.css',
    'src/ship-board.js', 'src/help.html', 'src/app.js', 'src/index.html', 'src/cst.html', 'src/cst.js',
    'tests/test_renewal_window.cjs', 'tests/test_renewal_window.py',
    'docs/renewal-window-rule.md', 'docs/scouts-without-unit-rule.md', 'tests/test_terminology.py',
]

def check_terminology(root):
    root = Path(root)
    rendered = [*root.joinpath('src').rglob('*.html'), *root.joinpath('src').rglob('*.js')]
    for path in rendered:
        if re.search(r'\blone\s+scouts?\b', path.read_text(), re.IGNORECASE):
            raise ValueError('Terminology regression: use Scouts without a unit in ' + str(path.relative_to(root)))
    if 'Scouts without a unit' not in (root/'src/app.js').read_text():
        raise ValueError('Scouts without a unit label was lost')


def check_sources(root=ROOT):
    root = Path(root)
    contract = json.loads((root/'config/refresh-contract.json').read_text())
    if set(contract['sha256']) != set(FILES):
        raise ValueError('Refresh contract omits required files')
    for name, expected in contract['sha256'].items():
        path = root/name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Refresh source drift: {name}. Review and reseal the source contract before running.')
    check_terminology(root)
    node = shutil.which('node') or '/usr/local/bin/node'
    for command in ([node, str(root/'tests/test_renewal_window.cjs')],
                    [sys.executable, '-m', 'unittest', 'discover', '-s', str(root/'tests'), '-p', 'test_renewal_window.py'],
                    [sys.executable, '-m', 'unittest', 'discover', '-s', str(root/'tests'), '-p', 'test_terminology.py']):
        result = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise ValueError('Renewal boundary regression failed: ' + result.stdout + result.stderr)
    return {'status':'reviewed source verified' , 'version':contract['version'], 'files':len(FILES)}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--seal', action='store_true', help='Record reviewed files after intentional code changes and tests')
    args=parser.parse_args()
    if args.seal:
        path=ROOT/'config/refresh-contract.json';path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'version':'2026-11-06-without-unit-terminology',
            'sha256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in FILES}},indent=2)+'\n')
    print(json.dumps(check_sources()))
