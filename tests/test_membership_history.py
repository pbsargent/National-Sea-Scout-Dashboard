import sys
import tempfile
import unittest
from pathlib import Path
from openpyxl import Workbook
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from membership_history import read_history, HISTORY_SHEET


class MembershipHistoryTests(unittest.TestCase):
    def test_reads_only_annual_aggregates_and_preserves_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'capture.xlsx'
            w = Workbook(); s = w.active; s.title = HISTORY_SHEET
            s.append(['Sea Scout Membership', 2024, 2025, None, 'private@example.com'])
            s.append(['# Ships', 355, 368])
            s.append(['Total Youth', 3975, '#REF!'])
            s.append(['Primary Youth', 2495, 2006])
            s.append(['Multiple Youth', 1480, 1765])
            s.append(['private notes', 'secret'])
            s.append(['Primary Youth', '#REF!', '#REF!'])
            w.save(p)
            result = read_history(p)
            self.assertEqual([r['year'] for r in result['annual']], [2024, 2025])
            self.assertEqual(result['annual'][0]['youth'], 3975)
            self.assertIsNone(result['annual'][1]['youth'])
            self.assertEqual(result['annual'][1]['primaryYouth'], 2006)
            self.assertIsNone(result['annual'][0]['adults'])
            self.assertNotIn('private', str(result)); self.assertNotIn('secret', str(result))

    def test_absent_history_is_explicit(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'capture.xlsx'; w = Workbook(); w.save(p)
            self.assertEqual(read_history(p)['annual'], [])


if __name__ == '__main__': unittest.main()
