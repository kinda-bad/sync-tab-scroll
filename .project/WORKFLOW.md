# sync-tab-scroll — Workflow Guide

This project uses [artifact-driven-dev](https://github.com/[owner]/artifact-driven-dev).

## Artifacts

| Artifact | Purpose |
|---|---|
| constitution.md | Principles guarding against the architectural drift that motivated this rebuild |
| infrastructure.md | Real-time sync architecture, tab rendering pipeline, storage |
| datamodel.md | Canonical session/participant/song/playback schema |
| ui.md | Landing/lobby/playback views and their states |

## Skills

| Command | What it does |
|---|---|
| `/ardd-refine <artifact>` | Update a named artifact — apply new decisions, resolve open questions, add content |
| `/ardd-add-artifact <name>` | Create a new artifact for a concern that doesn't fit an existing one |
| `/ardd-analyze` | Cross-artifact consistency check — find conflicts, gaps, and unresolved decisions |
| `/ardd-research <topic>` | Investigate a specific topic and write a research doc to `.project/plans/` |
| `/ardd-plan` | Generate an implementation plan from all stable artifacts, into `.project/plans/` |
| `/ardd-tasks` | Generate an ordered task list from a plan you select |
| `/ardd-render [artifact]` | Generate Mermaid diagrams into `README.md`. Bare form runs all supported artifacts. |
| `/ardd-implement` | Execute tasks from a tasks file you select in `.project/tasks/` |
| `/ardd-converge` | Reconcile codebase with a tasks file you select, after an interrupted `/ardd-implement` run |
| `/ardd-codify` | Reverse-engineer artifacts from an existing codebase |
| `/ardd-featurize` | Extract a feature register from the codebase (run after codify) |
| `/ardd-critique [artifact]` | Challenge decisions — simplicity, failure modes, robustness, semantics |
| `/ardd-feature <description>` | Add a feature — coordinated multi-artifact update in one pass |

See `STATUS.md` for current artifact statuses, open questions, and recommended next step.
