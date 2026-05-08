---
name: ic50-fit
description: Fit dose-response curves and calculate IC50/EC50 with confidence intervals using 4-parameter logistic regression.
---

# IC50 / EC50 Fitting

Fit dose-response curves with nonlinear regression.

## Model

4-parameter logistic (4PL):
```
response = bottom + (top - bottom) / (1 + 10^((logIC50 - logConc) * hillSlope))
```

## Software
- Python: scipy.optimize.curve_fit
- R: drc package (drm function)
- GraphPad Prism (reference standard)

## Validation
- R² or pseudo-R²
- Residual analysis
- Visual inspection
- Comparison with literature values

## Output

```markdown
# Dose-Response: [compound]

## Fitted Parameters
| Parameter | Estimate | 95% CI | SE |
|-----------|----------|--------|-----|
| IC50/EC50 | ... | ... | ... |
| Hill Slope | ... | ... | ... |
| Top | ... | ... | ... |
| Bottom | ... | ... | ... |

## Model Quality
- R²: ...
- Residuals: ...

## Script
[Attach analysis script]

## Plot
[Attach dose-response plot]
```

Save to `outputs/ic50-<slug>.md` with script and plot.
