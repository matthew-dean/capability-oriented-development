# Extend identifier selection

`selection.ts` owns the uniqueness rule used by list and table interactions. Inspect `select`, `clear` and the toolbar consumer before adding an operation. Use existing operations when they fit; keep screen-specific labels and loading state in the consumer.

Add an option here only for a demonstrated selection requirement. Preserve uniqueness and the existing default behavior. Update the source API, examples and native tests together; exercise affected consumers when behavior changes. Do not add a generic state framework or a second selection policy to serve one screen.

This guide describes review obligations. The native tests assert behavior; indexing and reconciliation identify changed evidence and affected declared dependents. Neither automatically approves a new abstraction.
