import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('exporter',Path(__file__).parents[1]/'scripts/export_data.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class ExportTests(unittest.TestCase):
 def test_duration_parsing(self):
  self.assertEqual(mod.duration_seconds('02:21:57'),8517)
  self.assertEqual(mod.duration_seconds('25:00:00'),90000)
  self.assertEqual(mod.duration_seconds('00:00:00'),0)
  for value in [None,'','unknown','01:75:00',42]:
   self.assertIsNone(mod.duration_seconds(value))

 def test_normalization_text_and_failed_export_preserves_snapshot(self):
  with tempfile.TemporaryDirectory() as root:
   root=Path(root);archive=root/'archive';(archive/'en').mkdir(parents=True);out=root/'export'
   obj={'video':{'slug':'sc/1','date':'2026-01-01','title':'Test','duration':'02:21:57'},'transcript':{'language':'en','data':[{'paragraphs':[{'sentences':[{'text':'Original words.','topics':[{'key':'t','label':' Topic '},{'key':'t','label':'topic'}]}]}],'speaker':{'name':' A  Person ','affiliation':'FRA','affiliation_full':'France'},'start':12.5}]}}
   (archive/'en/1.json').write_text(json.dumps(obj));(archive/'meetings.jsonl').write_text('{}\n{}\n')
   manifest=mod.export(archive,out);idx=json.loads((out/manifest['index']).read_text());self.assertEqual(idx['meetings'][0]['durationSeconds'],8517);self.assertEqual(manifest['topics'],1);self.assertEqual(idx['speakers'][0]['name'],'A Person');self.assertEqual(json.loads((out/idx['meetings'][0]['file']).read_text()),['Original words.'])
   before=(out/'manifest.json').read_bytes();(archive/'en/1.json').write_text('broken')
   with self.assertRaises(ValueError):mod.export(archive,out)
   self.assertEqual((out/'manifest.json').read_bytes(),before)
if __name__=='__main__':unittest.main()
