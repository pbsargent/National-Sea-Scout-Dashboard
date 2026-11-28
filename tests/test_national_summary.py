import sys
from pathlib import Path
from datetime import datetime
from types import SimpleNamespace
from unittest import TestCase, mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"scripts"))
from refresh_data import read_national_summary

class NationalSummaryTests(TestCase):
    def read(self, **overrides):
        values = dict(AI1=datetime(2026,11,6), AJ1=datetime(2025,10,31),
                      AI2=3637, AJ2=3673, AK2=-36, AI3=1765, AJ3=2018, AK3=-253, AI13=16)
        values.update(overrides)
        sheet = {k: SimpleNamespace(value=v) for k,v in values.items()}
        book = mock.MagicMock(); book.__getitem__.return_value = sheet
        with mock.patch("refresh_data.load_workbook", return_value=book):
            return read_national_summary(Path("capture.xlsx"))
    def test_workbook_headlines_include_lone_scouts(self):
        d=self.read()
        self.assertEqual([d[k] for k in ("youth","youthYoY","primaryYouth","primaryYoY")], [3637,-36,1765,-253])
        self.assertEqual(d["comparison"]["loneScouts"],16)
    def test_comparator_date_and_values_follow_workbook(self):
        d=self.read(AJ1=datetime(2025,11,6), AJ2=3600, AK2=37)
        self.assertEqual(d["comparison"]["baselineDate"],"2025-11-06")
        self.assertEqual(d["youthYoY"],37)
    def test_missing_cache_and_inconsistent_comparison_stop_refresh(self):
        for override in ({"AI3":None},{"AJ1":None},{"AK2":256}):
            with self.subTest(override=override), self.assertRaises(ValueError): self.read(**override)
