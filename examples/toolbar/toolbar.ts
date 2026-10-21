export function toolbarActions(selected: ReadonlySet<string>): string[] {
  return selected.size ? ['edit', 'delete'] : [];
}
