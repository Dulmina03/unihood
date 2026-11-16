# UniHood Codex Starter Package

1. Place **`UniHood_MASTER_PROJECT_SPECIFICATION.md`**, **`AGENTS.md`**, and `docs/design/references/` in the root of your existing `~/Projects/unihood` checkout. The included specification is version 3.0.
2. **Do not reinitialize Git or recreate branches.** You have already reported creating `dev` and `chore/uni-001-workspace-bootstrap` locally.
3. Open Codex in the repository root and say: `Read AGENTS.md and UniHood_MASTER_PROJECT_SPECIFICATION.md, then implement the next incomplete UNI issue. Follow human-only Git checkpoints.`
4. Codex should complete **UNI-001** on the existing branch, validate it, and stop at the human-only Git checkpoint. You do the add/commit/push/PR into `dev` yourself.
5. Registration and owner verification remain intentionally deferred until Phase 7.

**Important:** A coding agent cannot bypass approval prompts, human Git handoffs, or execute indefinitely without interaction. The spec is detailed enough to reduce repetitive prompts, not guarantee zero follow-up interaction.
