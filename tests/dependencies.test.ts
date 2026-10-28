import { expect, it } from 'vitest';
import { dependencyVersion, dependencyRevision } from '../src/dependencies.js';

it('reads literal native versions and JSON pointers without evaluating build expressions', () => {
  expect(dependencyVersion({ file: 'package.json', format: 'json', pointer: '/dependencies/@org~1policy' }, () => '{"dependencies":{"@org/policy":"1.2.3"}}')).toBe('1.2.3');
  expect(dependencyVersion({ file: 'app.csproj', format: 'nuget', package: 'Policy' }, () => "<Project><PackageReference Include='Policy'><Version>1.2.3</Version></PackageReference></Project>")).toBe('1.2.3');
  expect(() => dependencyVersion({ file: 'app.csproj', format: 'nuget', package: 'Policy' }, () => '<ItemGroup Condition="false"><PackageReference Include="Policy" Version="1.2.3"/></ItemGroup>')).toThrow('Conditional');
  expect(() => dependencyVersion({ file: 'app.csproj', format: 'nuget', package: 'Policy' }, () => '<PackageReference Include="Policy" Version="$(PolicyVersion)"/>')).toThrow('literal');
});
it('derives a commit only from matching restored package provenance', () => {
  const dependency = { id: 'policy', repository: 'https://example.test/org/policy', contract: 'capabilities/policy/capability.json', version: { file: 'app.csproj', format: 'nuget' as const, package: 'Shared.Policy' }, revision: { format: 'nuget' as const } };
  const sha = 'a'.repeat(40);
  const metadata = `<package><metadata><id>Shared.Policy</id><version>1.2.3</version><repository type="git" url="https://example.test/org/policy.git" commit="${sha}" /></metadata></package>`;
  expect(dependencyRevision(dependency, '1.2.3', () => metadata)).toBe(sha);
  expect(() => dependencyRevision(dependency, '2.0.0', () => metadata)).toThrow('version');
  expect(() => dependencyRevision({ ...dependency, repository: 'https://example.test/other' }, '1.2.3', () => metadata)).toThrow('repository');
});
