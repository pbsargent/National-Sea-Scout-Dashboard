#!/usr/bin/env python3
"""Apply verified BeAScout URLs without rebuilding or changing membership data."""
import argparse
import json
from pathlib import Path
from resolve_beascout_links import CANONICAL

ROOT = Path(__file__).resolve().parents[1]

def apply(audit, root=ROOT):
    data_path = root / 'data/dashboard-data.json'
    payload = json.loads(data_path.read_text())
    links = {}
    for ship in payload['ships']:
        result = audit.get(ship['unitId'], {})
        url = result.get('url', '')
        if result.get('status') == 'verified' and CANONICAL.fullmatch(url):
            links[ship['unitId']] = url
        elif CANONICAL.fullmatch(str(ship.get('beascoutUrl', ''))):
            links[ship['unitId']] = ship['beascoutUrl']
        ship['beascoutUrl'] = links.get(ship['unitId'], '')
    (root / 'data/beascout-links.json').write_text(json.dumps(links, indent=2, sort_keys=True)+'\n')
    data_path.write_text(json.dumps(payload, indent=2)+'\n')
    return len(links), len(payload['ships'])

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('audit', type=Path)
    args = parser.parse_args()
    linked, total = apply(json.loads(args.audit.read_text()))
    print(f'Applied {linked} verified links across {total} ships.')
