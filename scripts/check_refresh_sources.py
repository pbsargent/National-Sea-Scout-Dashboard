#!/usr/bin/env python3
"""Require reviewed refresh code and complete TY page assets before a daily run."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'scripts/refresh_data.py', 'scripts/public_data.py', 'scripts/membership_history.py',
    'scripts/monthly_history.py', 'scripts/validate_public_exports.py',
    'scripts/check_refresh_sources.py', 'data/beascout-links.json',
    'src/monthly.html', 'src/monthly.js', 'src/monthly-model.js',
    'src/history.html', 'src/information.js', 'src/information.css',
    'src/ship-board.js', 'src/help.html',
]

def check_sources(root=ROOT):
    root = Path(root)
    contract = json.loads((root/'config/refresh-contract.json').read_text())
    if set(contract['sha256']) != set(FILES):
        raise ValueError('Refresh contract omits required files')
    for name, expected in contract['sha256'].items():
        path = root/name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Refresh source drift: {name}. Review and reseal the source contract before running.')
    return {'status':'reviewed source verified', 'version':contract['version'], 'files':len(FILES)}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--seal', action='store_true', help='Record reviewed files after intentional code changes and tests')
    args=parser.parse_args()
    if args.seal:
        path=ROOT/'config/refresh-contract.json';path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps({'version':'2026-10-29-history-privacy-links',
            'sha256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in FILES}},indent=2)+'\n')
    print(json.dumps(check_sources()))
