---
description: Track and summarize clinical trials for a drug, indication, or mechanism.
args: <drug-or-indication>
section: Research Workflows
topLevelCli: true
---
Track clinical trials for: $@

This is an execution request. Execute the workflow.

## Required Artifacts

Slug: lowercase, hyphenated.

- `outputs/<slug>-trials.md`
- `outputs/<slug>-trials.provenance.md`

## Search Strategy

1. Search ClinicalTrials.gov and EU CTR
2. Search PubMed for published trial results
3. Check FDA/EMA approval status
4. Check conference abstracts (ASCO, ESMO, AACR, ADA, AHA)

## Output Structure

```markdown
# Clinical Trial Tracker: [topic]

## Summary
Total trials found, by phase and status.

## Approved Therapies
| Drug | Indication | Approval Date | Regulator |

## Active Trials
| NCT ID | Phase | Status | Intervention | Population | Primary Endpoint | Location |

## Completed Trials with Results
| NCT ID | Phase | N | Intervention | Primary Endpoint | Result | Reference |

## Failed/Terminated Trials
| NCT ID | Phase | Reason | Lessons |

## Pipeline Landscape
Phase 3 → Phase 2 → Phase 1 funnel

## Regulatory Milestones
FDA/EMA submissions, PDUFA dates

## Key Insights
- Competitive positioning
- Unmet needs
- Next expected readouts
```

## Deliver
Save to `outputs/<slug>-trials.md` with provenance. Include trial registration dates and last update dates.
