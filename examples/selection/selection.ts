export type Selection = ReadonlySet<string>;
export function select(current: Selection, ids: readonly string[]): Selection {
  return new Set([...current, ...ids]);
}
export function clear(): Selection { return new Set(); }
