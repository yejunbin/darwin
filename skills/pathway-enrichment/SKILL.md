---
name: pathway-enrichment
description: Guide gene list enrichment analysis using over-representation and GSEA approaches.
---

# Pathway Enrichment

Perform pathway enrichment analysis on gene lists.

## Approaches

### Over-Representation Analysis (ORA)
- Input: DEG list with thresholds (e.g., padj < 0.05, |log2FC| > 1)
- Tools: clusterProfiler (R), enrichr, DAVID, g:Profiler
- Databases: GO, KEGG, Reactome, MSigDB, WikiPathways

### Gene Set Enrichment Analysis (GSEA)
- Input: Ranked gene list (all genes, ranked by statistic)
- Tools: GSEA software, clusterProfiler::GSEA, fgsea
- Permutations: ≥1000

## Parameters to Document
- Background gene set (universe)
- P-value adjustment method (BH, Bonferroni)
- Minimum/maximum gene set size
- Version of pathway database

## Output

```markdown
# Pathway Enrichment: [contrast]

## Methods
- Tool: ...
- Database: ...
- Background: ...
- Adjusted p-value threshold: ...

## Top Enriched Pathways
| Pathway | Database | Gene Ratio | P-value | Adj P-value | Genes |

## Visualization
- Dot plot
- Bar plot
- Enrichment map (if network analysis performed)
```

Save to `outputs/pathway-enrichment-<slug>.md`.
