---
description: Fit dose-response curves, calculate IC50/EC50/EC90 with confidence intervals, and generate publication-ready plots.
args: <compound-and-data-description>
section: Research Workflows
topLevelCli: true
---
Fit dose-response for: $@

This is an execution request. Execute the workflow.

## Required Artifacts

Slug: lowercase, hyphenated.

- `outputs/<slug>-dose-response.md`
- `outputs/<slug>-dose-response.py` or `.R` (analysis script)
- `outputs/<slug>-dose-response.png` (plot)

## Workflow

1. **Data Preparation**
   - Parse concentration and response data
   - Handle replicates and technical repeats
   - Normalize to positive/negative controls
   - Flag outliers

2. **Curve Fitting**
   Use a 4-parameter logistic (4PL) model:
   ```
   response = bottom + (top - bottom) / (1 + 10^((logIC50 - logConc) * hillSlope))
   ```
   - Fit with nonlinear least squares
   - Report IC50/EC50 with 95% CI
   - Report hill slope with SE
   - Report top and bottom plateaus

3. **Validation**
   - R² or pseudo-R²
   - Residual analysis
   - Visual inspection of fit
   - Compare with literature values if available

4. **Visualization**
   - Semi-log dose-response plot
   - Error bars (SD or SEM)
   - Fitted curve with confidence band
   - IC50 marker with CI
   - Control lines

## Output Structure

```markdown
# Dose-Response Analysis: [compound] vs [target/cell line]

## Data Summary
| Concentration (M) | Mean Response | SD | N |

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

## Comparison with Literature
| Source | Reported IC50 | Our IC50 | Notes |

## Script
`outputs/<slug>-dose-response.py`

## Plot
`outputs/<slug>-dose-response.png`

## Methods
- Software: Python (scipy) or R (drc package)
- Algorithm: nonlinear least squares (Levenberg-Marquardt)
- Normalization: ...
- Controls: ...

## Limitations
## References
```

## Deliver
Save analysis to `outputs/<slug>-dose-response.md`, script, and plot.
