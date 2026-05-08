---
name: seq-blast
description: Guide sequence alignment and BLAST searches for nucleotide and protein sequences.
---

# Sequence BLAST

Search sequences against public databases.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "NCBI BLAST <sequence>"` | Web BLAST search |
| `web_search "UniProt BLAST <sequence>"` | UniProt BLAST |
| `web_search "Ensembl BLAST <sequence>"` | Ensembl BLAST |

## Interpretation

For each significant hit, record:
- Accession, description, organism
- E-value, bit score, identity, coverage
- Query coverage and subject coverage
- Gaps and mismatches

## Use Cases
- Identify unknown sequences
- Find orthologs across species
- Check for contamination
- Validate primer specificity

## Output

Save top hits to `outputs/blast-<slug>.md`.
