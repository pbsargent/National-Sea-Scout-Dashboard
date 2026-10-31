import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from openpyxl import Workbook
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from monthly_history import read_monthly_history

class MonthlyHistoryTests(unittest.TestCase):
    def read(self, rows, title='TY History'):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'capture.xlsx'
            book=Workbook(); sheet=book.active; sheet.title=title
            for row in rows: sheet.append(row)
            book.save(path)
            return read_monthly_history(path)

    headers=['Date','Level_Type','Level_Number','Unit_Type','Total_Units','Total_Adults','Total_Youth','Private Notes']
    def test_scope_nulls_order_and_allowlist(self):
        result=self.read([self.headers,
          [datetime(2026,9,30),'National',0,'Ship',374,3286,3581,'secret'],
          [datetime(2026,8,31),'Council',42,'Ship',2,10,20],
          [datetime(2026,8,31),'National',0,'Troop',99,99,99],
          [datetime(2026,7,31),'National',0,'Ship',0,'#N/A',None]])
        self.assertEqual(len(result['observations']),2)
        self.assertEqual(result['observations'][0],{'date':'2026-07-31','ships':0,'adults':None,'youth':None})
        self.assertNotIn('secret',str(result))
    def test_duplicate_month_rejected(self):
        with self.assertRaisesRegex(ValueError,'duplicate'):
            self.read([self.headers,[datetime(2026,9,1),'National',0,'Ship',1,2,3],[datetime(2026,9,30),'National',0,'Ship',1,2,3]])
    def test_missing_sheet_and_invalid_schema(self):
        self.assertEqual(self.read([],title='Other')['observations'],[])
        with self.assertRaises(ValueError): self.read([['Date']])
    def test_invalid_date_rejected(self):
        with self.assertRaisesRegex(ValueError,'invalid observation date'):
            self.read([self.headers,['bad','National',0,'Ship',1,2,3]])
