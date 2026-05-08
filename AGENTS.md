# Agents

`AGENTS.md` is the repo-level contract for agents working in this repository.

Pi subagent behavior does **not** live here. The source of truth for bundled Pi subagents is `.darwin/agents/*.md`, which the runtime syncs into the Pi agent directory. If you need to change how `bio-researcher`, `clinical-researcher`, `bioinformatician`, `bio-reviewer`, `evidence-verifier`, or `bio-writer` behave, edit the corresponding file in `.darwin/agents/` instead of duplicating those prompts here.

## Pi subagents

Darwin ships six bundled biomedical subagents:

- `bio-researcher` — gather primary biomedical evidence
- `clinical-researcher` — gather and appraise clinical evidence
- `bioinformatician` — design and execute bioinformatics pipelines
- `bio-reviewer` — simulate biomedical peer review
- `evidence-verifier` — post-process drafts with citations and retraction checks
- `bio-writer` — turn research notes into structured biomedical artifacts

They are defined in `.darwin/agents/` and invoked via the Pi `subagent` tool.

## What belongs here

Keep this file focused on cross-agent repo conventions:

- output locations and file naming expectations
- workspace-level continuity expectations for long-running work
- provenance and verification requirements
- handoff rules between the lead agent and subagents

Do **not** restate per-agent prompt text here unless there is a repo-wide constraint that applies to all agents.

## Output conventions

- Research outputs go in `outputs/`.
- Manuscripts and systematic reviews go in `manuscripts/`.
- Protocols go in `protocols/`.
- Bioinformatics pipelines go in `pipelines/`.
- Reanalysis logs go in `reanalyses/`.
- Session logs go in `notes/`.
- The workspace-level lab notebook lives at `CHANGELOG.md`.
- Plan artifacts for long-running workflows go in `outputs/.plans/`.
- Intermediate research artifacts are written to disk by subagents and read by the lead agent. They are not returned inline unless the user explicitly asks for them.
- Long-running workflows should treat the plan artifact as an externalized working memory, not a static outline. Keep task status and verification state there as the run evolves.
- Long-running or resumable workflows should also treat `CHANGELOG.md` as the chronological lab notebook: what changed, what failed, what was verified, and what should happen next.
- Do not create or update `CHANGELOG.md` for trivial one-shot tasks.
