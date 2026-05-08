---
description: Scan for retractions, corrections, and expressions of concern for a set of papers or topic.
args: <topic-or-pmid-list>
section: Research Workflows
topLevelCli: true
---
Run a retraction sweep for: $@

This is an execution request. Execute the workflow.

## Required Artifacts

Slug: lowercase, hyphenated.

- `outputs/<slug>-retractions.md`

## Workflow

1. **Identify papers**
   - If PMIDs/DOIs provided, use those directly
   - Otherwise search PubMed for the topic and collect top 20-50 papers

2. **Check each paper**
   - PubMed retraction notices
   - Retraction Watch database
   - Publisher retraction/correction pages
   - PubPeer discussions
   - Expressions of concern

3. **Classify findings**
   - RETRACTED — full retraction
   - CORRECTION — minor correction, conclusions unchanged
   - EXPRESSION OF CONCERN — under investigation
   - CLEAN — no issues found

## Output

```markdown
# Retraction Sweep: [topic]

## Summary
Total papers checked: N
Retracted: N | Corrected: N | EOC: N | Clean: N

## Retracted Papers
| PMID | Title | Journal | Year | Reason | Date |

## Corrected Papers
| PMID | Title | Nature of Correction | Impact on Conclusions |

## Expressions of Concern
| PMID | Title | Issue | Status |

## Clean Papers (sample)
| PMID | Title |

## Recommendations
Which papers should be excluded from any evidence synthesis.
```

## Deliver
Save to `outputs/<slug>-retractions.md`.
