import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from public_data import PUBLIC_CSV_FIELDS, public_name, sanitize_csv, sanitize_payload

class PublicExportTests(unittest.TestCase):
    def test_names_and_idempotence(self):
        for original, expected in [
            ('Alex Morgan', 'Alex M.'), ('Alex Jordan Morgan Jr.', 'Alex M.'),
            ('Morgan, Alex Jordan', 'Alex M.'), ('Alex Morgan, Jr.', 'Alex M.'),
            ('Alex Smith-Jones', 'Alex S.'), ('Alex van der Meer', 'Alex M.'),
            ('Alex O’Neil', 'Alex O.'), ('JUAN COTTO', 'Juan C.'),
            ('Alex', 'Alex'), ('', ''), (None, ''), ('Alex V.', 'Alex V.'),
        ]:
            with self.subTest(original=original):
                self.assertEqual(public_name(original), expected)
                self.assertEqual(public_name(expected), expected)

    def test_csv_drops_unreviewed_fields_and_preserves_metrics(self):
        row = {'UnitID': '42', 'Total Youth': '17', 'Skipper Name': 'Alex Jordan Morgan',
               'Skipper EMAIL': 'private@example.com', 'Phone': '555-123-4567',
               'BeAScout Contact': 'Private Person', 'Focus Comment': 'Private note',
               'New Unreviewed Column': 'private value', 'Skipper Ship Pull': 'Alex Jordan Morgan'}
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'ships.csv'
            with p.open('w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=row); writer.writeheader(); writer.writerow(row)
            self.assertEqual(sanitize_csv(p), 1)
            text = p.read_text()
            for value in ['private@example.com', '555-123-4567', 'Private Person', 'Private note', 'private value', 'Jordan', 'Morgan']:
                self.assertNotIn(value, text)
            with p.open(newline='') as f:
                reader = csv.DictReader(f); self.assertEqual(reader.fieldnames, list(PUBLIC_CSV_FIELDS)); result = next(reader)
            self.assertEqual(result['Total Youth'], '17')
            self.assertEqual(result['Skipper Name'], 'Alex M.')
            before = p.read_bytes(); sanitize_csv(p); self.assertEqual(before, p.read_bytes())

    def test_json_preserves_totals_dates_and_source_link(self):
        payload = {'meta': {'generatedAt': '2026-10-18T09:15:19-05:00', 'sourceCaptureName': 'capture.xlsx', 'sourceCapture': '/private/account@example.com/capture.xlsx', 'sourceUrl': 'https://docs.google.com/example'}, 'summary': {'youth': 17}, 'ships': [{'unitId': '42', 'youth': 17, 'skipperName': 'Alex Morgan'}]}
        before = json.loads(json.dumps(payload)); sanitize_payload(payload)
        self.assertEqual(payload['summary'], before['summary'])
        self.assertEqual(payload['meta']['generatedAt'], before['meta']['generatedAt'])
        self.assertEqual(payload['meta']['sourceUrl'], before['meta']['sourceUrl'])
        self.assertEqual(payload['ships'][0]['skipperName'], 'Alex M.')
        self.assertEqual(payload['meta']['sourceCapture'], 'capture.xlsx')

if __name__ == '__main__': unittest.main()
