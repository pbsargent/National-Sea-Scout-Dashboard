#!/usr/bin/env python3
"""Fail closed if a refresh drops privacy, BeAScout enrichment, or TY history."""
import csv
import json
from pathlib import Path
import re
from public_data import PUBLIC_CSV_FIELDS, public_name


def validate_exports(root):
    root = Path(root)
    payload = json.loads((root/'data/dashboard-data.json').read_text())
    ships = payload.get('ships', [])
    if not ships:
        raise ValueError('Public export has no ships')
    if not payload.get('history', {}).get('annual'):
        raise ValueError('Annual membership history was lost; refusing publication')
    if not payload.get('monthlyHistory', {}).get('observations'):
        raise ValueError('TY History monthly observations were lost; refusing publication')
    links = json.loads((root/'data/beascout-links.json').read_text())
    if not links:
        raise ValueError('Verified BeAScout link map is empty')
    for ship in ships:
        if ship.get('skipperName','') != public_name(ship.get('skipperName','')):
            raise ValueError('Public JSON contains an unabbreviated skipper surname')
        if ship.get('beascoutUrl','') != links.get(str(ship['unitId']), ''):
            raise ValueError('Verified BeAScout enrichment was lost')
    with (root/'data/ships.csv').open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(PUBLIC_CSV_FIELDS):
            raise ValueError('Public CSV contains unapproved columns')
        rows = list(reader)
    if len(rows) != len(ships) or payload.get('meta',{}).get('rowCount') != len(ships):
        raise ValueError('Public CSV/JSON ship counts differ')
    by_id = {ship['unitId']: ship for ship in ships}
    for row in rows:
        if row['Skipper Name'] != public_name(row['Skipper Name']):
            raise ValueError('Public CSV contains an unabbreviated skipper surname')
        if row['Skipper Name'] != by_id.get(row['UnitID'],{}).get('skipperName'):
            raise ValueError('Public CSV/JSON names differ')
    for name in ['data/ships.csv','data/dashboard-data.json']:
        if re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', (root/name).read_text()):
            raise ValueError('Public export contains an email address')
    return {'ships':len(ships), 'beascoutLinks':sum(bool(s.get('beascoutUrl')) for s in ships),
            'annualRecords':len(payload['history']['annual']),
            'monthlyObservations':len(payload['monthlyHistory']['observations'])}

if __name__ == '__main__':
    print(json.dumps(validate_exports(Path(__file__).resolve().parents[1])))
