"""Privacy boundary shared by public CSV and dashboard JSON exports."""
import csv
import re
from pathlib import Path

# Only reviewed operational fields may be published. New source columns stay private.
PUBLIC_CSV_FIELDS = (
    'UnitID', 'CST', 'Ship #', 'Council Name', 'District',
    'Total Youth', 'Total Youth YOY', 'Total Adult', 'Primary Youth', 'Primary YOY',
    '%Advancement', 'Retention', 'Unit Metric', 'Renewal', 'Charter Organization',
    'Skipper Name', 'Ship Focus', 'Ship Name if tracking', 'CG Aux Districts', 'Status',
    'Skipper Trained', 'CC Trained', 'Size', 'Growth', '20% Advance', 'Outdoor',
)


def public_name(value):
    """Keep a first name and last initial, dropping middle names and suffixes."""
    name = re.sub(r'\s+', ' ', str(value or '')).strip()
    if not name:
        return ''
    if ',' in name:
        last, first = name.split(',', 1)
        # A trailing suffix alone does not indicate Last, First format.
        if first.strip().lower().rstrip('.') not in {'jr', 'sr', 'ii', 'iii', 'iv'}:
            name = first.strip() + ' ' + last.strip()
        else:
            name = last.strip()
    parts = name.split()
    while len(parts) >= 3 and parts[-1].lower().rstrip('.') in {'jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md'}:
        parts.pop()
    first = parts[0]
    if first.isupper() or first.islower():
        first = first.capitalize()
    if len(parts) == 1:
        return first
    initial = next((char for char in parts[-1] if char.isalpha()), '')
    return f'{first} {initial.upper()}.' if initial else first


def public_csv_row(row):
    result = {field: row.get(field, '') for field in PUBLIC_CSV_FIELDS}
    result['Skipper Name'] = public_name(result['Skipper Name'])
    return result


def sanitize_csv(path):
    path = Path(path)
    with path.open(newline='', encoding='utf-8-sig') as handle:
        rows = list(csv.DictReader(handle))
    with path.open('w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=PUBLIC_CSV_FIELDS)
        writer.writeheader()
        writer.writerows(public_csv_row(row) for row in rows)
    return len(rows)


def sanitize_payload(payload):
    for ship in payload['ships']:
        ship['skipperName'] = public_name(ship.get('skipperName'))
    # A workstation path can disclose the operator's name and account email.
    meta = payload['meta']
    if 'sourceCapture' in meta:
        meta['sourceCapture'] = meta.get('sourceCaptureName') or str(meta['sourceCapture']).replace('\\', '/').rsplit('/', 1)[-1]
    return payload
