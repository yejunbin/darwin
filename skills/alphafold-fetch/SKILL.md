---
name: alphafold-fetch
description: Fetch and analyze AlphaFold-predicted protein structures from the AlphaFold DB or EBI.
---

# AlphaFold Fetch

Retrieve and evaluate AlphaFold structures for target proteins.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "site:alphafold.ebi.ac.uk <uniprot-id>"` | AlphaFold DB entry |
| `web_search "AlphaFold <protein-name> structure"` | Search for structure |

## Evaluation Criteria

- **pLDDT score**: 
  - >90: very high confidence (backbone correct)
  - 70-90: confident (correct fold)
  - 50-70: low confidence (may have wrong fold)
  - <50: very low confidence (unstructured/disordered)
- **PAE matrix**: Check domain-domain confidence
- **Disordered regions**: pLDDT < 50
- **Ligand binding pockets**: Compare with experimental structures if available

## Output

```markdown
# AlphaFold Structure: [protein]

## UniProt ID: ...
## pLDDT Distribution
| Domain/Region | Residues | Mean pLDDT | Confidence |

## Structural Features
- Domains
- Disordered regions
- Known binding sites
- Comparison with PDB structures

## Recommendations
- Suitability for docking
- Suitability for MD simulation
- Regions requiring experimental validation
```

Save to `outputs/alphafold-<slug>.md`.
