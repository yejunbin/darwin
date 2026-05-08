---
description: Calculate drug dosages, adjust for renal/hepatic impairment, and check against standard references.
args: <drug-and-patient-parameters>
section: Research Workflows
topLevelCli: true
---
Calculate dosage for: $@

This is an execution request. Execute the workflow.

⚠️ **WARNING: This is a literature synthesis tool for researchers and clinicians. It does not replace clinical judgment or pharmacist consultation. Never use outputs to direct patient care without verification.**

## Required Artifacts

Slug: lowercase, hyphenated.

- `outputs/<slug>-dosage.md`

## Inputs to Extract from Query

- Drug name (generic and brand)
- Indication
- Patient parameters: age, weight, height, sex
- Renal function: creatinine, eGFR, CrCl (Cockcroft-Gault)
- Hepatic function: Child-Pugh class or specific LFTs
- Concurrent medications (for drug-drug interactions)
- Pregnancy/lactation status

## Workflow

1. **Search standard references**
   - FDA label (Drugs@FDA)
   - EMA EPAR
   - Lexicomp / UpToDate (web search for dosing tables)
   - Manufacturer prescribing information

2. **Calculate**
   - Standard dose (mg/kg or fixed dose)
   - Body surface area (DuBois formula) if BSA-based
   - Adjusted dose for renal impairment
   - Adjusted dose for hepatic impairment
   - Drug-drug interaction alerts

3. **Document**
   - Reference source for each calculation
   - Formula used for renal adjustment
   - Level of evidence for adjustment recommendation

## Output Structure

```markdown
# Dosage Calculation: [drug] for [indication]

## Patient Parameters
| Parameter | Value |

## Standard Dosing
| Regimen | Dose | Route | Frequency | Duration | Source |

## Adjusted Dosing
| Scenario | Adjustment | Rationale | Evidence Level |
|----------|------------|-----------|----------------|
| Renal (eGFR X) | ... | ... | ... |
| Hepatic (Child-Pugh X) | ... | ... | ... |
| Drug interaction (X + Y) | ... | ... | ... |

## Formulas Used
- BSA: DuBois
- CrCl: Cockcroft-Gault
- Other: ...

## Warnings and Contraindications
## References
```

## Deliver
Save to `outputs/<slug>-dosage.md`.
