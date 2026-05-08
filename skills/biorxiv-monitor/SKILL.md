---
name: biorxiv-monitor
description: Monitor bioRxiv and medRxiv preprints for a topic, author, or keyword. Use for staying current with emerging biomedical research before peer review.
---

# bioRxiv / medRxiv Monitor

Use web search and the `alpha` CLI to track preprints in biology and medicine.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "site:biorxiv.org <keyword>"` | Search bioRxiv preprints |
| `web_search "site:medrxiv.org <keyword>"` | Search medRxiv preprints |
| `alpha search "<topic>" --mode semantic` | Search via alpha for related papers |

## Monitoring Strategy

1. Define search terms (genes, drugs, mechanisms, diseases)
2. Search bioRxiv and medRxiv weekly
3. Flag high-interest preprints for follow-up
4. Check for subsequent peer-reviewed publication
5. Track retraction or correction status

## Output

Save monitoring log to `outputs/biorxiv-monitor-<slug>.md`:
```markdown
# bioRxiv Monitor: [topic]

## Date: YYYY-MM-DD
| Preprint | Title | Authors | Category | Interest | Follow-up |

## Flagged for Follow-up
| Preprint | Why | Action |

## Now Published
| Preprint DOI | Journal | PMID |
```
