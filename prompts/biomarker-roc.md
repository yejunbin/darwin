---
description: Design and evaluate a biomarker with ROC analysis, sensitivity, specificity, and validation plan.
args: <biomarker-and-disease>
section: Research Workflows
topLevelCli: true
---
Evaluate biomarker potential for: $@

This is an execution request. Execute the workflow.

## Required Artifacts

Slug: lowercase, hyphenated.

- `outputs/<slug>-biomarker.md`
- `outputs/<slug>-biomarker.provenance.md`

## Workflow

1. **Literature Search**
   - Search PubMed for the biomarker in the context of the disease
   - Identify discovery studies, validation studies, and meta-analyses
   - Check for retracted or corrected papers

2. **Evidence Extraction**
   For each relevant study, extract:
   - Cohort size and demographics
   - Sample type (serum, plasma, tissue, urine, etc.)
   - Assay method (ELISA, mass spec, imaging, etc.)
   - AUC with 95% CI
   - Sensitivity and specificity at optimal cutoff
   - PPV and NPV (if reported)
   - Comparison with existing gold standard

3. **Synthesis**
   - Tabulate all studies with key metrics
   - Note heterogeneity in assay methods and populations
   - Assess whether results are reproducible across cohorts
   - Evaluate clinical utility (does it change management?)

## Output Structure

```markdown
# Biomarker Evaluation: [biomarker] in [disease]

## Summary
- Proposed use: diagnostic / prognostic / predictive / companion diagnostic
- Current evidence level
- Clinical utility assessment

## Evidence Table
| Study | N | Cohort | Sample | Assay | AUC (95% CI) | Sen | Spe | Cutoff | Validation |

## Meta-Analysis (if ≥3 studies)
- Pooled AUC
- Heterogeneity (I²)
- Sensitivity analysis

## Comparison with Standard of Care
- Incremental value over existing markers
- Net reclassification index (if available)

## Validation Gaps
- [ ] Independent validation cohort
- [ ] Pre-specified cutoff
- [ ] Prospective trial
- [ ] Analytical validation (precision, stability, interference)
- [ ] Clinical validation in intended-use population

## Regulatory Status
- FDA-approved companion diagnostic?
- CLIA-validated laboratory-developed test?

## Recommendations
## References
```

## Deliver
Save to `outputs/<slug>-biomarker.md` with provenance.
