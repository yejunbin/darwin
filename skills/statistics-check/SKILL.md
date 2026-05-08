---
name: statistics-check
description: Validate statistical methods, check for p-hacking signs, and verify reporting adequacy in biomedical papers.
---

# Statistics Check

Audit statistical methods and reporting in biomedical studies.

## Checklist

### Study Design
- [ ] Sample size justified with power calculation
- [ ] Randomization method described
- [ ] Blinding status reported
- [ ] Primary endpoint pre-specified

### Statistical Methods
- [ ] Appropriate test for data type (parametric vs non-parametric)
- [ ] Multiple testing correction applied (FDR/Bonferroni)
- [ ] Effect sizes reported with confidence intervals
- [ ] Missing data handling described

### Red Flags
- [ ] P-value rounding (p < 0.05 without exact value)
- [ ] Selective endpoint reporting
- [ ] Subgroup analyses without pre-specification
- [ ] Baseline table p-values (in RCTs)
- [ ] Figure legends without sample sizes
- [ ] Error bars undefined (SD vs SEM vs CI)

### Reproducibility
- [ ] Raw data available
- [ ] Analysis code available
- [ ] Statistical software and version reported

## Output

Save audit to `outputs/stats-check-<slug>.md` with findings and severity ratings.
