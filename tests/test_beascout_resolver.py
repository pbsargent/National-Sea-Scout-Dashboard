import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from resolve_beascout_links import resolve
from apply_beascout_links import apply

URL = 'https://beascout.scouting.org/units/12345678-1234-1234-1234-123456789abc'
class Response:
    status = 200
    url = URL
    def __init__(self, body): self.body = body
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self): return self.body.encode()

class BeascoutTests(unittest.TestCase):
    def test_exact_identity_required(self):
        record = {'unitId':'42','shipNumber':'Ship 7','council':'Test Council 123','zip':'12345'}
        body = '<title>Ship 0007 Example — Test City, TX 12345</title>legacyUnitId:42,name:"Ship 0007";<script>{"parentOrganization":{"name":"Test Council 123"}}</script>'
        with patch('urllib.request.urlopen', return_value=Response(body)):
            self.assertEqual(resolve(record)['status'], 'verified')
        for wrong in [body.replace('legacyUnitId:42', 'legacyUnitId:43'), body.replace('Ship 0007','Ship 0008'), body.replace('Council 123','Council 456')]:
            with patch('urllib.request.urlopen', return_value=Response(wrong)):
                self.assertEqual(resolve(record)['status'], 'unresolved')
        with patch('urllib.request.urlopen', return_value=Response(body.replace('12345', '99999'))):
            result = resolve(record)
            self.assertEqual(result['status'], 'verified')
            self.assertIn('locationNote', result)

    def test_unresolved_keeps_existing_and_rejects_unsafe(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); (root/'data').mkdir()
            p=root/'data/dashboard-data.json'
            p.write_text(json.dumps({'summary':{'youth':8},'ships':[{'unitId':'1','beascoutUrl':URL},{'unitId':'2'}]}))
            linked, total=apply({'1':{'status':'unresolved'},'2':{'status':'verified','url':'javascript:alert(1)'}},root)
            self.assertEqual((linked,total),(1,2))
            data=json.loads(p.read_text())
            self.assertEqual(data['summary'],{'youth':8})
            self.assertEqual(data['ships'][0]['beascoutUrl'],URL)
            self.assertEqual(data['ships'][1]['beascoutUrl'],'')

if __name__ == '__main__': unittest.main()
