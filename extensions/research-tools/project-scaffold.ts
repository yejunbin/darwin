export function buildProjectAgentsTemplate(): string {
	return `# Darwin Project Guide

This file is read automatically at startup. It is the durable project memory for Darwin.

## Project Overview
- State the research question, target artifact, target journal/venue, and key datasets or cohorts here.

## Biomedical Context
- Disease / indication:
- Target gene / protein / pathway:
- Mechanism of action:
- Closest prior work:
- Required controls:
- Primary endpoints / biomarkers:
- Datasets / cohorts:
- Regulatory context (if applicable):

## Ground Rules
- Do not modify raw data in \`Data/Raw/\` or equivalent raw-data folders.
- Read first, act second: inspect project structure and existing notes before making changes.
- Prefer durable artifacts in \`notes/\`, \`outputs/\`, \`manuscripts/\`, \`protocols/\`, \`pipelines/\`, and \`reanalyses/\`.
- Keep strong claims source-grounded. Include direct URLs and PMIDs in final writeups.
- Use HGNC-approved gene symbols, RRIDs for reagents, and standard nomenclature.
- Label in-silico predictions explicitly. Never present them as wet-lab confirmed.

## Current Status
- Replace this section with the latest project status, known issues, and next steps.

## Task Ledger
- Track concrete tasks with IDs, owner, status, and output path.
- Mark tasks as \`todo\`, \`in_progress\`, \`done\`, \`blocked\`, or \`superseded\`.
- Do not silently merge or skip tasks; record the decision here.

## Verification Gates
- List the checks that must pass before delivery.
- For each critical claim, p-value, or figure, record how it will be verified and where the raw artifact lives.
- Do not use words like \`verified\`, \`confirmed\`, or \`reproduced\` unless the underlying check actually ran.

## Honesty Contract
- Separate direct observations from inferences.
- If something is uncertain, say so explicitly.
- If a result looks cleaner than expected, assume it needs another check before it goes into the final artifact.
- Flag preprints explicitly. Note peer-review status for all cited papers.

## Session Logging
- Use \`/log\` at the end of meaningful sessions to write a durable session note into \`notes/session-logs/\`.

## Review Readiness
- Known reviewer concerns:
- Missing experiments / validations:
- Missing writing or framing work:
- Reporting guideline compliance (PRISMA / ARRIVE / MIQE / REMARK / CONSORT):
`;
}

export function buildSessionLogsReadme(): string {
	return `# Session Logs

Use \`/log\` to write one durable note per meaningful Darwin session.

Recommended contents:
- what was done
- strongest findings
- artifacts written
- evidence tier of key sources
- retraction checks performed
- unresolved questions
- next steps
`;
}
