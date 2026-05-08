---
name: gene-lookup
description: Look up gene information from HGNC, OMIM, ClinVar, and UniProt. Use for target validation, variant interpretation, and disease-gene associations.
---

# Gene Lookup

Query standard gene databases for nomenclature, function, variants, and disease associations.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "site:genenames.org <gene-symbol>"` | HGNC approved name and aliases |
| `web_search "site:omim.org <gene-symbol>"` | OMIM gene-disease associations |
| `web_search "site:ncbi.nlm.nih.gov/clinvar <gene-symbol>"` | ClinVar variants |
| `web_search "site:uniprot.org <gene-symbol>"` | UniProt protein information |
| `web_search "site:gtexportal.org <gene-symbol>"` | GTEx expression data |

## Output

For each gene, compile:
- HGNC symbol, full name, aliases
- Chromosomal location
- OMIM phenotype associations
- ClinVar pathogenic variants (count, top variants)
- UniProt ID, protein family, domains
- Expression profile (tissue-specific)
- Known drugs targeting this gene product

Save to `outputs/gene-lookup-<slug>.md`.
