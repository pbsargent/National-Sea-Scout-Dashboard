#!/usr/bin/env python3
"""Resolve BeAScout links using exact UnitID matches; never publish contact data."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

CANONICAL = re.compile(r'https://beascout\.scouting\.org/units/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/?$', re.I)


def resolve(record):
    uid = str(record['unitId'])
    result = {key: record.get(key, '') for key in ('unitId', 'shipNumber', 'council')}
    query = {'unitID': uid}
    if record.get('zip'):
        query = {'zip': record['zip'], **query}
    resolver = 'https://beascout.scouting.org/list/?' + urllib.parse.urlencode(query)
    result['resolver'] = resolver
    try:
        request = urllib.request.Request(resolver, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read().decode('utf-8', errors='replace')
            url = response.url
            if response.status != 200 or not CANONICAL.fullmatch(url):
                raise ValueError('Resolver did not return a canonical unit page')
        # The public page embeds the authoritative legacy identifier. Require it,
        # plus the ship program and number, rather than trusting HTTP 200 alone.
        if not re.search(r'legacyUnitId\s*:\s*' + re.escape(uid) + r'\s*[,}]', body):
            raise ValueError('Internal UnitID not confirmed on returned page')
        title = re.search(r'<title>(.*?)</title>', body, re.S)
        title = html.unescape(title.group(1)) if title else ''
        number = re.search(r'\d+', str(record['shipNumber']))
        page_number = re.search(r'\bShip\s+0*(\d+)\b', title, re.I)
        if not number or not page_number or int(number.group()) != int(page_number.group(1)):
            raise ValueError('Ship program/number does not match page title')
        # Confirm council when supplied on the page, comparing its stable number.
        council = re.search(r'"parentOrganization"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"', body)
        expected_number = re.search(r'(\d{3})\s*$', record.get('council', ''))
        if council and expected_number:
            actual_number = re.search(r'(\d{3})\s*$', council.group(1))
            if not actual_number or actual_number.group(1) != expected_number.group(1):
                raise ValueError('Council number does not match returned page')
        if record.get('zip') and not re.search(r'\b' + re.escape(record['zip']) + r'\b', title):
            result['locationNote'] = 'BeAScout location ZIP differs from the captured source address; exact UnitID, Ship number and council confirmed'
        result.update(url=url.rstrip('/'), status='verified', verifiedAt=datetime.now(timezone.utc).isoformat(timespec='seconds'))
    except Exception as exc:
        result.update(status='unresolved', reason=str(exc))
    return result



def source_records(capture, dashboard):
    """Read only unit identity and address fields; never retain contact columns."""
    from openpyxl import load_workbook
    workbook = load_workbook(capture, read_only=True, data_only=True)
    try:
        iterator = workbook['Pin & CharOrg data'].iter_rows(values_only=True)
        headers = next(iterator)
        unit_ids = {str(ship['unitId']) for ship in dashboard['ships']}
        records = []
        for row in iterator:
            values = dict(zip(headers, row))
            uid = str(values.get('UnitID') or '').removesuffix('.0')
            if uid not in unit_ids:
                continue
            address = str(values.get('Meeting or Charter Org Addr') or '')
            zip_match = re.search(r'\b(\d{5})(?:-\d{4})?\s*$', address)
            short_zip = re.search(r'\b(?:NH|MA|ME|CT|NJ|PR)\s+(\d{3,4})\s*$', address)
            apo_zip = re.search(r'\b(\d{5})\s+APO\b', address)
            zipcode = zip_match.group(1) if zip_match else short_zip.group(1).zfill(5) if short_zip else apo_zip.group(1) if apo_zip else ''
            records.append({'unitId': uid, 'shipNumber': str(values.get('Ship #') or ''), 'council': str(values.get('Council') or ''), 'zip': zipcode})
        return records
    finally:
        workbook.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path, nargs='?')
    parser.add_argument('--capture', type=Path)
    parser.add_argument('--dashboard', type=Path, default=Path(__file__).resolve().parents[1] / 'data/dashboard-data.json')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.capture:
        records = source_records(args.capture, json.loads(args.dashboard.read_text()))
    elif args.input:
        records = json.loads(args.input.read_text())
    else:
        parser.error('Provide an input file or --capture workbook')
    grouped = {}
    for record in records:
        grouped.setdefault(record['unitId'], []).append(record)
    unique, results = [], json.loads(args.output.read_text()) if args.output.exists() else {}
    for uid, candidates in grouped.items():
        identities = {(r['shipNumber'], r['council'], r.get('zip', '')) for r in candidates}
        if len(identities) != 1:
            results[uid] = {'unitId': uid, 'status': 'unresolved', 'reason': 'Ambiguous source records'}
        else:
            unique.append(candidates[0])
    for attempt, workers in enumerate((3, 2)):
        pending = [r for r in unique if results.get(r['unitId'], {}).get('status') != 'verified']
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(resolve, row) for row in pending]
            for index, future in enumerate(as_completed(futures), 1):
                item = future.result(); results[item['unitId']] = item
                if index % 25 == 0:
                    args.output.write_text(json.dumps(results, indent=2)+'\n')
                    print(f'Pass {attempt + 1}: {index}/{len(pending)} checked; {sum(r["status"] == "verified" for r in results.values())} verified', flush=True)
        args.output.write_text(json.dumps(results, indent=2)+'\n')
        print(f'Pass {attempt + 1} complete: {sum(r["status"] == "verified" for r in results.values())}/{len(grouped)} verified', flush=True)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
