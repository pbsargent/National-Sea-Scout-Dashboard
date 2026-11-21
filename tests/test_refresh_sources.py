import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from check_refresh_sources import FILES,check_sources
ROOT=Path(__file__).resolve().parents[1]
class SourceTests(unittest.TestCase):
    def test_reviewed_sources_pass(self):self.assertEqual(check_sources(ROOT)['files'],len(FILES))
    def test_old_exporter_or_missing_ty_page_blocks_run(self):
        for bad in ['scripts/refresh_data.py','src/monthly.js']:
            with self.subTest(file=bad),tempfile.TemporaryDirectory() as directory:
                root=Path(directory)
                for name in FILES+['config/refresh-contract.json']:
                    p=root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
                (root/bad).write_text('older version')
                with self.assertRaisesRegex(ValueError,'source drift'):check_sources(root)
