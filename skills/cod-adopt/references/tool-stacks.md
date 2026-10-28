# Adoption references

In the installed plugin or source distribution, read the [local tool configurations](../../../docs/existing-tools.md) and [local adoption recipes](../../../docs/tool-recipes.md) first. They include direct tool links and require no private-repository access. If only this skill folder was copied into an application, use the hosted links below; use the full plugin bundle for offline guidance.

Use the [qualifying stacks guide](https://github.com/matthew-dean/cod-kit/blob/main/docs/existing-tools.md) to map existing tools to COD requirements, then the [adoption recipes](https://github.com/matthew-dean/cod-kit/blob/main/docs/tool-recipes.md) for the selected boundary. Both guides also ship under `docs/` in the plugin/source checkout. The hosted guides are public.

Prefer installed native tools. The demonstrated JS stack uses dependency-cruiser plus Node tests; documented alternatives include Pact/OpenAPI for service interactions, Buf for Protobuf compatibility, ArchUnit for Java dependency rules, WIT for component interfaces and Backstage for discovery. Each needs responsibility-specific behavior, ownership and evolution evidence, qualified against copies/decoys, plus ongoing reconciliation. The full guides provide direct tool links and explain coverage gaps.
