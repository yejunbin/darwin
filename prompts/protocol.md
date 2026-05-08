---
description: Draft a reproducible wet-lab or in-silico protocol with MIQE/ARRIVE/REMARK compliance.
args: <protocol-name>
section: Research Workflows
topLevelCli: true
---
Draft a protocol for: $@

This is an execution request. Execute the workflow.

## Required Artifacts

Slug: lowercase, hyphenated.

- `protocols/<slug>.md`
- `protocols/<slug>.provenance.md`

## Output Structure

```markdown
# Protocol: [Name]

## Objective
Clear statement of what this protocol achieves.

## Scope
- In-silico / wet-lab / hybrid
- Species / cell line / tissue
- Expected throughput

## Materials
### Reagents
| Reagent | Catalog # | Supplier | RRID | Lot # |
### Equipment
| Equipment | Model | Manufacturer |
### Software
| Software | Version | Parameters |

## Methods
Step-by-step procedure with:
- Timing for each step
- Temperatures, speeds, concentrations
- Quality control checkpoints
- Decision branches (if applicable)

## Quality Control
- [ ] Positive control
- [ ] Negative control
- [ ] Calibration/standard curve
- [ ] Replication plan (biological vs technical)

## Data Analysis
- Statistical methods
- Software and parameters
- Expected effect sizes
- Power calculation (if applicable)

## Safety Notes
- PPE requirements
- Hazardous reagent handling
- Waste disposal

## Expected Outcomes
- Primary readout
- Acceptance criteria
- Failure modes and troubleshooting

## Version History
| Version | Date | Author | Changes |

## References
```

## Compliance Checklists

If molecular biology (qPCR, RNA-seq):
- [ ] MIQE guidelines followed
- [ ] Housekeeping genes validated
- [ ] Efficiency reported

If animal studies:
- [ ] ARRIVE guidelines followed
- [ ] IACUC approval noted
- [ ] Randomization and blinding described

If clinical biomarker:
- [ ] REMARK guidelines followed
- [ ] Pre-specified cutoff
- [ ] Independent validation cohort

## Deliver
Save to `protocols/<slug>.md` with provenance.
