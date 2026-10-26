#!/usr/bin/env python3
"""Build reproducible, allowlisted COD guidance or source distributions."""
import argparse
import hashlib
import json
from pathlib import Path
import stat
import zipfile

PUBLIC_DOCS = (
    'start-here.md', 'contracts.md', 'contract-profiles.md', 'scip-mapping.md',
    'README.md', 'specification.md', 'architecture.md', 'quickstart.md',
    'workflows.md', 'runtime-contracts.md', 'presentation-checks.md',
    'existing-tools.md', 'tool-recipes.md', 'agent-setup.md',
    'agent-demonstration.md', 'preview.md', 'evidence.md', 'distributed-adoption.md', 'system-map.md', 'change-bindings.md', 'variant-qualification.md', 'propagation.md',
)
PUBLIC_TESTS = (
    'system-map.test.ts', 'discovery.test.ts', 'core.test.ts', 'planning.test.ts', 'mcp.test.ts', 'enforcement.test.ts', 'change-bindings.test.ts', 'variant-qualification.test.ts', 'propagation.test.ts',
    'contracts.test.ts', 'scip.test.ts', 'runtime-contracts.test.ts', 'workflow.test.ts', 'package.test.ts',
)
BLOCKED_PARTS = {'node_modules', 'dist', '__pycache__', '.git', 'internal', 'benchmark', 'research', 'study-evidence', 'test-results', 'coverage', 'bin', 'obj'}


def build_bundle(source, destination, kind='guidance'):
    source = Path(source).resolve()
    destination = Path(destination).resolve()
    if kind not in {'guidance', 'source'}:
        raise ValueError('Unknown distribution kind')
    if destination.suffix != '.zip' or destination.is_relative_to(source):
        raise ValueError('Use a .zip destination outside the source checkout')
    if destination.exists():
        raise ValueError('Destination already exists; choose a new filename')
    metadata = json.loads((source / 'package.json').read_text())
    version = metadata['version']
    files = {}

    def add(relative):
        path = source / relative
        if path.is_symlink() or not path.resolve().is_relative_to(source):
            raise ValueError('Symlink or escaped source: ' + str(relative))
        if Path(relative).suffix == '.patch' or any(part in BLOCKED_PARTS for part in Path(relative).parts):
            return
        if not path.is_file():
            raise ValueError('Required distribution file is missing: ' + str(relative))
        files[str(relative)] = path.read_bytes()

    def tree(relative):
        for path in sorted((source / relative).rglob('*')):
            rel = path.relative_to(source)
            if any(part in BLOCKED_PARTS for part in rel.parts):
                continue
            if path.is_symlink():
                raise ValueError('Symlink in distribution tree: ' + str(rel))
            if path.is_file():
                add(rel.as_posix())

    for name in ['package.json', 'LICENSE', 'CHANGELOG.md']:
        add(name)
    for directory in ['skills', 'schemas', 'examples/system', 'examples/workflow', 'examples/native-stack', 'examples/csharp-library', 'examples/vue-design-system', 'examples/agent-adoption']:
        tree(directory)
    for name in PUBLIC_DOCS:
        add('docs/' + name)
    for name in ['plugin.json', '.claude-plugin/plugin.json']:
        manifest = json.loads((source / name).read_text())
        manifest['version'] = version
        files[name] = (json.dumps(manifest, indent=2) + '\n').encode()
    portable = json.loads(files['plugin.json'])
    files['.codex-plugin/plugin.json'] = (json.dumps({
        'name': 'cod', 'version': version, 'description': portable['description'],
        'skills': './skills/',
    }, indent=2) + '\n').encode()
    files['.agents/plugins/marketplace.json'] = (json.dumps({
        'name': 'cod-preview', 'interface': {'displayName': 'COD preview'},
        'plugins': [{'name': 'cod', 'source': {'source': 'local', 'path': './'},
                     'policy': {'installation': 'AVAILABLE', 'authentication': 'ON_INSTALL'},
                     'category': 'Developer Tools'}],
    }, indent=2) + '\n').encode()
    files['.claude-plugin/marketplace.json'] = (json.dumps({
        'name': 'cod-preview', 'description': 'COD skills and qualified native workflows', 'owner': {'name': 'matthew-dean'},
        'plugins': [{'name': 'cod', 'source': './', 'version': version}],
    }, indent=2) + '\n').encode()
    if kind == 'source':
        for directory in ['src', 'tools', 'examples/selection', 'examples/toolbar']:
            tree(directory)
        for name in PUBLIC_TESTS:
            add('tests/' + name)
        for name in ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'tsconfig.build.json', 'vitest.config.ts', 'oxlint.json', '.gitignore', 'examples/tsconfig.json']:
            add(name)
        files['AGENTS.md'] = b'# COD repository contract\n\nFollow docs/specification.md and skills/cod-workflow/SKILL.md. Use existing native tools where they fit. Preserve contract semantics and consumer coverage; run corepack pnpm verify:pr before delivery. Do not claim unexecuted checks passed. Do not add Prettier or Tailwind.\n'
        files['CLAUDE.md'] = b'@AGENTS.md\n'
        add('README.md')
    else:
        files['README.md'] = b'# COD guidance preview\n\nStart with [preview setup](docs/preview.md), [agent setup](docs/agent-setup.md) and [tool recipes](docs/tool-recipes.md). This contains skills, guides and example source. Build or install the COD toolkit to run the unified verification commands.\n'
    # Bind each shipped payload to a digest. This is integrity metadata, not a signature.
    files['distribution.json'] = (json.dumps({
        'version': version, 'kind': kind, 'license': metadata['license'],
        'files': {name: hashlib.sha256(content).hexdigest() for name, content in sorted(files.items())},
    }, indent=2) + '\n').encode()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            archive.writestr(info, content)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path, help='New .zip filename outside the source checkout')
    parser.add_argument('--kind', choices=['guidance', 'source'], default='guidance')
    args = parser.parse_args()
    try:
        print(build_bundle(Path(__file__).resolve().parents[1], args.destination, args.kind))
    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
