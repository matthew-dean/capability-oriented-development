import { readFileSync } from 'node:fs';
import { Ajv } from 'ajv';
import type { Capability } from './types.js';
export const capabilitySchema: object = JSON.parse(readFileSync(new URL('../schemas/capability.schema.json', import.meta.url), 'utf8'));
const validator = new Ajv({ allErrors: true, strict: true }).compile<Capability>(capabilitySchema);
export function parseCapability(input: unknown): { capability: Capability | null; errors: string[] } {
  if (!validator(input)) return { capability: null, errors: (validator.errors ?? []).map(e => `${e.instancePath || '/'} ${e.message}`) };
  return { capability: { ...input, requires: input.requires ?? [], extensions: input.extensions ?? [], examples: input.examples ?? [], tests: input.tests ?? [], invariants: input.invariants ?? [] }, errors: [] };
}
