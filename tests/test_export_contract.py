import csv
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from validate_public_exports import validate_exports
ROOT=Path(__file__).resolve().parents[1]

class ExportContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);(self.root/'data').mkdir()
        for name in ['ships.csv','dashboard-data.json','beascout-links.json']:
            shutil.copyfile(ROOT/'data'/name,self.root/'data'/name)
    def change(self,fn):
        p=self.root/'data/dashboard-data.json';d=json.loads(p.read_text());fn(d);p.write_text(json.dumps(d))
    def test_current_export_passes(self):self.assertGreater(validate_exports(self.root)['monthlyObservations'],0)
    def test_lost_monthly_history_blocks(self):
        self.change(lambda d:d.pop('monthlyHistory'))
        with self.assertRaisesRegex(ValueError,'TY History'):validate_exports(self.root)
    def test_lost_links_blocks(self):
        self.change(lambda d:d['ships'][0].pop('beascoutUrl'))
        with self.assertRaisesRegex(ValueError,'BeAScout'):validate_exports(self.root)
    def test_full_surname_blocks(self):
        self.change(lambda d:d['ships'][0].update(skipperName='Alex Morgan'))
        with self.assertRaisesRegex(ValueError,'surname'):validate_exports(self.root)
    def test_raw_csv_blocks(self):
        p=self.root/'data/ships.csv';p.write_text(p.read_text().replace('UnitID,','Skipper EMAIL,',1))
        with self.assertRaisesRegex(ValueError,'unapproved'):validate_exports(self.root)
