---
name: dosage-calc
description: Calculate drug dosages with renal and hepatic adjustments. Use standard references only. Not for direct patient care.
---

# Dosage Calculation

⚠️ **For research and clinical reference only. Do not use for direct patient care without verification.**

## References
- FDA label (Drugs@FDA)
- EMA EPAR
- Lexicomp / UpToDate
- Manufacturer prescribing information

## Adjustments

| Organ Function | Adjustment Method |
|----------------|-------------------|
| Renal (CrCl <30) | Dose reduction or interval extension |
| Renal (CrCl 30-50) | Moderate adjustment |
| Hepatic (Child-Pugh B) | Usually 50% reduction |
| Hepatic (Child-Pugh C) | Avoid or significant reduction |

## Formulas
- BSA: DuBois formula
- CrCl: Cockcroft-Gault
- eGFR: CKD-EPI

## Output

Save calculation to `outputs/dosage-<slug>.md` with all formulas and references cited.
