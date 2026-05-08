---
description: Compile a comprehensive target dossier for a gene, protein, or pathway of interest.
args: <target-name>
section: Research Workflows
topLevelCli: true
---
Compile a target dossier for: $@

This is an execution request. Execute the workflow.

## Required Artifacts

Slug: lowercase target name, hyphenated.

- `outputs/<slug>-dossier.md`
- `outputs/<slug>-dossier.provenance.md`

## Sections

1. **Target Identity**
   - HGNC-approved gene symbol (italicized)
   - Full name and aliases
   - UniProt ID, Ensembl ID, NCBI Gene ID
   - Chromosomal location
   - Protein family/domain architecture

2. **Biological Function**
   - Known biological role
   - Tissue expression profile (GTEx, Human Protein Atlas)
   - Subcellular localization
   - Interacting partners (STRING, BioGRID)

3. **Disease Associations**
   - Mendelian disorders (OMIM)
   - GWAS associations (GWAS Catalog)
   - Cancer driver status (COSMIC, TCGA)
   - Known mutations and their effects (ClinVar)

4. **Druggability Assessment**
   - Small-molecule tractability (ChEMBL, DrugBank)
   - Known inhibitors/activators with IC50/EC50
   - Crystal structures (PDB)
   - AlphaFold structure confidence
   - Pocket druggability (pocket druggability scores)

5. **Clinical Landscape**
   - Approved drugs targeting this target
   - Clinical trials (ClinicalTrials.gov, search by target)
   - Pipeline compounds by phase
   - Competitive landscape

6. **Biomarker Potential**
   - Diagnostic, prognostic, or predictive biomarker evidence
   - Known companion diagnostics

7. **Open Questions & Gaps**

## Deliver
Save to `outputs/<slug>-dossier.md` with provenance.
