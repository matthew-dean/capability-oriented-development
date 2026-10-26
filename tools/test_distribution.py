"""Exercise the actual release packager and reject disclosure/overwrite regressions."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from package_guidance import build_bundle

SOURCE = Path(__file__).resolve().parents[1]


class DistributionTests(unittest.TestCase):
    def test_reproducible_payload_and_integrity(self):
        with tempfile.TemporaryDirectory() as temp:
            first = build_bundle(SOURCE, Path(temp) / 'first.zip')
            second = build_bundle(SOURCE, Path(temp) / 'second.zip')
            self.assertEqual(first.read_bytes(), second.read_bytes())
            with zipfile.ZipFile(first) as archive:
                manifest = json.loads(archive.read('distribution.json'))
                self.assertEqual(manifest['license'], json.loads(archive.read('package.json'))['license'])
                self.assertEqual(archive.read('LICENSE'), (SOURCE / 'LICENSE').read_bytes())
                for name, digest in manifest['files'].items():
                    self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(), digest)
                self.assertEqual(manifest['version'], json.loads(archive.read('plugin.json'))['version'])
                self.assertIn('skills/cod-adopt/SKILL.md', manifest['files'])
                self.assertEqual(json.loads(archive.read('.codex-plugin/plugin.json'))['version'], manifest['version'])
                self.assertIn('examples/native-stack/npm-shrinkwrap.json', manifest['files'])
                self.assertIn('examples/native-stack/capability.review.json', manifest['files'])
                self.assertIn('examples/native-stack/checks/contract.mjs', manifest['files'])
                self.assertIn('docs/evidence.md', manifest['files'])
                self.assertIn('docs/distributed-adoption.md', manifest['files'])
                self.assertIn('examples/system/system.json', manifest['files'])
                self.assertFalse(any('study-evidence' in name or name.endswith('.patch') for name in manifest['files']))

    def test_public_boundary_and_marketplace_roots(self):
        with tempfile.TemporaryDirectory() as temp:
            with zipfile.ZipFile(build_bundle(SOURCE, Path(temp) / 'preview.zip')) as archive:
                for name in archive.namelist():
                    self.assertFalse(set(Path(name).parts) & {'internal', 'benchmark', '.git', 'node_modules'})
                codex = json.loads(archive.read('.agents/plugins/marketplace.json'))
                claude = json.loads(archive.read('.claude-plugin/marketplace.json'))
                self.assertEqual(codex['plugins'][0]['source']['path'], './')
                self.assertEqual(claude['plugins'][0]['source'], './')
                self.assertNotIn('docs/foundation.md', archive.namelist())

    def test_source_contains_product_tests_without_private_inputs(self):
        with tempfile.TemporaryDirectory() as temp:
            with zipfile.ZipFile(build_bundle(SOURCE, Path(temp) / 'source.zip', 'source')) as archive:
                names = archive.namelist()
                self.assertIn('src/index.ts', names)
                self.assertIn('examples/selection/selection.capability.json', names)
                self.assertIn('examples/toolbar/toolbar.capability.json', names)
                self.assertIn('tests/core.test.ts', names)
                self.assertIn('tools/test_distribution.py', names)
                self.assertNotIn('tests/provenance.test.ts', names)
                for name in names:
                    if name.startswith('tests/'):
                        self.assertNotIn(b'../benchmark/', archive.read(name))
                        self.assertNotIn(b'internal/archive', archive.read(name))

    def test_research_and_reset_outputs_cannot_enter_guidance_bundle(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with zipfile.ZipFile(build_bundle(SOURCE, root / 'base.zip')) as archive:
                archive.extractall(root / 'copy')
            for name in ['examples/native-stack/research/transcript.json',
                         'examples/native-stack/test-results/result.json',
                         'examples/native-stack/submission.patch']:
                path = root / 'copy' / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('private experiment sentinel')
            with zipfile.ZipFile(build_bundle(root / 'copy', root / 'clean.zip')) as archive:
                self.assertFalse(any(b'private experiment sentinel' in archive.read(name)
                                     for name in archive.namelist()))

    def test_symlink_cannot_export_external_content(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with zipfile.ZipFile(build_bundle(SOURCE, root / 'base.zip')) as archive:
                archive.extractall(root / 'copy')
            (root / 'private.txt').write_text('private sentinel')
            (root / 'copy/skills/cod-adopt/references/escape.txt').symlink_to(root / 'private.txt')
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                build_bundle(root / 'copy', root / 'rejected.zip')
            self.assertFalse((root / 'rejected.zip').exists())

    def test_existing_destination_is_untouched(self):
        with tempfile.TemporaryDirectory() as temp:
            destination = Path(temp) / 'keep.zip'
            destination.write_bytes(b'keep')
            with self.assertRaises(ValueError):
                build_bundle(SOURCE, destination)
            self.assertEqual(destination.read_bytes(), b'keep')

    def test_rejects_output_inside_source_and_bad_kind(self):
        with self.assertRaises(ValueError):
            build_bundle(SOURCE, SOURCE / 'never-create.zip')
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):
                build_bundle(SOURCE, Path(temp) / 'no.zip', 'other')


if __name__ == '__main__':
    unittest.main()
