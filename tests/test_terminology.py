import sys, shutil, tempfile, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from check_refresh_sources import check_terminology
ROOT=Path(__file__).resolve().parents[1]

class TerminologyTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);(self.root/'src').mkdir()
        for name in ['app.js','index.html','help.html']:
            shutil.copyfile(ROOT/'src'/name,self.root/'src'/name)
    def test_current_label_and_legacy_identifier_allowed(self):
        check_terminology(self.root)
        self.assertIn('comparison.loneScouts',(self.root/'src/app.js').read_text())
    def test_old_term_blocked_on_existing_or_new_page(self):
        for file,term in [('app.js','Lone Scouts'),('help.html','lone scout'),('future.html','LONE SCOUTS')]:
            with self.subTest(file=file):
                path=self.root/'src'/file
                before=path.read_text() if path.exists() else None
                path.write_text((before or '')+' '+term)
                with self.assertRaisesRegex(ValueError,'Terminology regression'):check_terminology(self.root)
                if before is None:path.unlink()
                else:path.write_text(before)
    def test_missing_canonical_label_blocks(self):
        p=self.root/'src/app.js';p.write_text(p.read_text().replace('Scouts without a unit','Unassigned'))
        with self.assertRaisesRegex(ValueError,'label was lost'):check_terminology(self.root)
