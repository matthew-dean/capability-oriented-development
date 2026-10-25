export interface Operation { name: string; file: string; export: string }
export interface Capability {
  schemaVersion: 1; id: string; intent: string; owner: string;
  status: 'proposed' | 'experimental' | 'stable' | 'deprecated' | 'retired';
  operations: Operation[]; requires: string[]; extensions: string[];
  examples: string[]; tests: string[]; invariants: string[];
  evolution?: { guidance: string[] };
}
export interface Diagnostic { code: string; severity: 'error' | 'warning'; file: string; message: string }
export interface ResolvedOperation extends Operation { source: string; declaration: string | null; line: number | null; signature: string | null }
export interface CapabilityNode extends Omit<Capability, 'operations'> { manifest: string; operations: ResolvedOperation[] }
export interface SourceExport { file: string; export: string; signature: string; owners: string[] }
export interface CapabilityIndex {
  indexVersion: 1; compilerVersion: string; ok: boolean; diagnostics: Diagnostic[];
  capabilities: CapabilityNode[]; exports: SourceExport[]; files: Record<string, string>;
  revision: { commit: string | null; dirty: boolean | null }; digest: string;
}
export interface DiscoveryQuery { intent: string; domain?: string | undefined; affectedFiles?: string[] | undefined; limit?: number | undefined }
