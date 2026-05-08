---
name: biomarker-roc
description: Evaluate biomarker performance with ROC analysis, AUC, sensitivity, and specificity.
---

# Biomarker ROC Analysis

Evaluate biomarker diagnostic or prognostic performance.

## Metrics

- **AUC**: Area under ROC curve
- **Sensitivity**: True positive rate
- **Specificity**: True negative rate
- **PPV**: Positive predictive value
- **NPV**: Negative predictive value
- **Optimal cutoff**: Youden index or clinical threshold

## Workflow

1. Extract study data (contingency table or raw values)
2. Calculate sensitivity/specificity at various cutoffs
3. Compute AUC with 95% CI (DeLong method)
4. Compare with existing biomarkers
5. Assess clinical utility (does it change management?)

## Output

```markdown
# Biomarker ROC: [biomarker] in [disease]

## Study Data
| Study | N | Cases | Controls | AUC (95% CI) | Cutoff | Sen | Spe |

## Meta-Analysis (if ≥3 studies)
- Pooled AUC
- Heterogeneity

## Clinical Utility
- Incremental value over standard markers
- Cost-effectiveness (if data available)

## Validation Gaps
```

Save to `outputs/biomarker-roc-<slug>.md`.
