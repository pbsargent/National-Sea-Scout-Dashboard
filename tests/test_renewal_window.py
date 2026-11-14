import sys
from pathlib import Path
from datetime import date
from unittest import TestCase
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from refresh_data import in_renewal_window

class RenewalWindowTests(TestCase):
    def test_current_and_next_month_include_full_current_month(self):
        current=date(2026,11,6)
        self.assertTrue(in_renewal_window(date(2026,11,1),current))
        self.assertTrue(in_renewal_window(date(2026,12,31),current))
        self.assertFalse(in_renewal_window(date(2027,1,1),current))
        self.assertFalse(in_renewal_window(None,current))
    def test_no_december_grace_before_on_after_cutoff(self):
        renewal=date(2026,12,31)
        for reference,expected in [(date(2026,12,30),True),(date(2026,12,31),True),(date(2027,1,1),False)]:
            with self.subTest(reference=reference):self.assertEqual(in_renewal_window(renewal,reference),expected)
        self.assertTrue(in_renewal_window(date(2027,1,31),date(2026,12,31)))
        self.assertFalse(in_renewal_window(date(2027,2,28),date(2026,12,31)))

    def test_temporary_september_october_grace_does_not_recur(self):
        cases = [
            (date(2026,9,30), date(2026,11,30), True),
            (date(2026,9,30), date(2026,12,1), False),
            (date(2026,10,31), date(2026,12,30), True),
            (date(2026,10,31), date(2026,12,31), True),
            (date(2026,10,31), date(2027,1,1), False),
            (date(2026,11,30), date(2026,12,1), False),
            (date(2027,9,30), date(2027,11,1), False),
            (date(2027,10,31), date(2027,11,1), False),
        ]
        for renewal, reference, expected in cases:
            with self.subTest(renewal=renewal,reference=reference):
                self.assertEqual(in_renewal_window(renewal,reference),expected)
