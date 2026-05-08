---
name: retraction-check
description: Check papers for retractions, corrections, and expressions of concern. Use before citing any source in evidence synthesis or systematic reviews.
---

# Retraction Check

Verify the integrity of cited papers before including them in evidence synthesis.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "<PMID> retraction"` | Search for retraction notices |
| `web_search "<title> retraction notice"` | Search by title |
| `web_search "site:retractionwatch.com <author>"` | Check Retraction Watch |
| `web_search "site:pubpeer.com <PMID>"` | Check PubPeer discussions |

## Workflow

1. List all papers to be cited
2. For each, search PubMed for retraction notices
3. Check Retraction Watch database
4. Check publisher pages for corrections
5. Check PubPeer for post-publication commentary
6. Classify: CLEAN / CORRECTED / EOC / RETRACTED
7. Remove or flag RETRACTED papers

## Output

```markdown
# Retraction Check: [topic]

## Retracted (EXCLUDE)
| PMID | Title | Reason | Date |

## Corrected (NOTE)
| PMID | Title | Correction | Impact |

## Expressions of Concern (FLAG)
| PMID | Title | Issue | Status |

## Clean (INCLUDE)
| PMID | Title |
```
