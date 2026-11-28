import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from openpyxl import Workbook
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from membership_history import read_history, read_data_source_history, HISTORY_SHEET


class MembershipHistoryTests(unittest.TestCase):
    def data_source(self):
        w=Workbook(); s=w.active; s.title='Data Source'
        for address,value in {'I1':'Total_Youth','I2':'Unit_Type','I7':'Ship',
                'I11':'Total_Adults','I12':'Unit_Type','I17':'Ship',
                'V17':'Year End','V18':'Ships','V31':'Primary Youth',
                'V32':'Year End','V33':'Sea Scouts','AC32':datetime(2026,10,31),
                'AC17':datetime(2026,10,31)}.items(): s[address]=value
        for row in [2,12]:
            for c,year in enumerate(range(2022,2027),10): s.cell(row,c,str(year))
        for row in [17,32]:
            for c,year in zip([18,19,20,21,23,24,25,26,27,28],range(2016,2026)):
                s.cell(row,c,year)
        for address,value in {'M7':3711,'N7':3672,'M17':3382,'N17':3343,
                              'AB18':369,'AC18':379,'AB33':2006,'AC33':1790,
                              'Y7':'#REF!','AA33':2562,'R18':394,'R33':3484}.items():
            s[address]=value
        return w,s

    def test_new_layout_keeps_partial_snapshot_out_of_annual_history(self):
        w,s=self.data_source()
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'capture.xlsx';w.save(p)
            result=read_history(p)
        self.assertEqual(result['sourceSheet'],'Data Source')
        self.assertEqual(result['snapshotDate'],'2026-10-31')
        self.assertEqual([r['year'] for r in result['annual']],list(range(2016,2026)))
        last=result['annual'][-1]
        self.assertEqual((last['ships'],last['youth'],last['adults'],last['primaryYouth']),
                         (369,3711,3382,2006))
        self.assertIsNone(last['multipleYouth']);self.assertIsNone(last['councils'])
        self.assertIsNone(result['annual'][0]['youth'])

    def test_missing_counts_and_error_cells_stay_null(self):
        w,s=self.data_source();s['M7']='#REF!';s['AB18']=0
        result=read_data_source_history(s)
        self.assertIsNone(result['annual'][-1]['youth'])
        self.assertEqual(result['annual'][-1]['ships'],0)

    def test_layout_and_snapshot_drift_rejected(self):
        for address,value in [('V33','Troops'),('AC32','3Q26'),('K2','2022')]:
            with self.subTest(address=address):
                w,s=self.data_source();s[address]=value
                with self.assertRaises(ValueError):read_data_source_history(s)

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
