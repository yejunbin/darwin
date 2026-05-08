---
name: geo-reanalysis
description: Guide reanalysis of GEO datasets with standard bioinformatics pipelines.
---

# GEO Reanalysis

Reanalyze public GEO datasets for validation or hypothesis testing.

## Workflow

1. **Identify Dataset**
   - Search GEO for relevant series (GSE)
   - Check sample metadata and experimental design
   - Verify platform and annotation

2. **Download**
   - GEOquery (R) or GEOparse (Python)
   - Raw data (CEL, FASTQ) or processed matrices

3. **QC**
   - Sample clustering
   - Batch effect assessment
   - Outlier detection

4. **Analysis**
   - Differential expression (limma, DESeq2, edgeR)
   - Pathway enrichment
   - Survival analysis (if clinical data available)

5. **Validation**
   - Compare with original publication
   - Cross-validate with independent cohort

## Output

Save reanalysis log to `reanalyses/geo-<slug>.md` with:
- Dataset ID and description
- QC results
- Analysis parameters
- Key findings
- Comparison with original study
