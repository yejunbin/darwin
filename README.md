<p align="center">
  <a href="https://github.com/yejunbin/darwin">
    <img src="assets/hero.png" alt="Darwin CLI" width="800" />
  </a>
</p>
<p align="center">The open source AI biomedical research agent.</p>
<p align="center"><a href="./README_zh.md">[中文]</a></p>

---

### About Darwin

Darwin is a biomedical generative agent forked from and heavily modified on top of [feynman](https://github.com/getcompanion-ai/feynman). While feynman is a general-purpose AI research agent, Darwin specializes in **systematic literature synthesis, clinical evidence grading, and reproducible in-silico protocols** for the life sciences.

Key capabilities:
- **Evidence-driven research** — systematic reviews and meta-analyses following PRISMA guidelines
- **Clinical evidence grading** — hierarchy enforcement (RCTs > cohort > preprints) with inline retraction checks
- **Reproducible protocols** — wet-lab and computational pipelines with MIQE/CONSORT/ARRIVE checklists
- **Bioinformatics integration** — BLAST, pathway enrichment, GEO reanalysis, AlphaFold structure evaluation
- **Standard nomenclature** — HGNC gene symbols, RRIDs, UniProt IDs, ChEMBL IDs throughout

Built on the [Pi](https://github.com/badlogic/pi-mono) agent runtime with biomedical expertise delivered as Pi skills — Markdown instruction files synced on startup.

---

### Installation

**From source (development):**

```bash
git clone https://github.com/getcompanion-ai/darwin.git
cd darwin
npm install
npm run build
```

Then link the binary so `darwin` is available in your PATH. `npm link` sometimes fails in new terminals (nvm not loaded), so the recommended approach is a manual symlink:

```bash
mkdir -p ~/.local/bin
ln -s $(pwd)/bin/darwin.js ~/.local/bin/darwin
# Ensure ~/.local/bin is in PATH
export PATH="$HOME/.local/bin:$PATH"
```

To make PATH persistent across new terminals, add it to your shell config:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

Or for zsh:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

Alternatively, if your nvm setup works across terminals, `npm link` also works:

```bash
npm link
```

To run without any linking, use `node ./bin/darwin.js`.

**Requirements:**
- Node.js >= 20 (tested up to v25)
- npm or yarn

**Configure a model provider:**

```bash
darwin setup
```

Choose from supported providers including DeepSeek, OpenAI, Anthropic, or local models via LM Studio / Ollama / vLLM.

---

### What you type -> what happens

```
$ darwin "systematic review of GLP-1 agonists in heart failure"
-> Searches PubMed, clinical trials, produces a PRISMA-compliant review

$ darwin systematic-review "CRISPR base editing for sickle cell disease"
-> Multi-agent systematic review with evidence grading

$ darwin target-dossier "KRAS G12C"
-> Comprehensive target dossier with druggability assessment

$ darwin trial-tracker "donanemab Alzheimer's"
-> Clinical trial landscape with regulatory milestones

$ darwin retraction-sweep "amyloid hypothesis"
-> Scans for retractions and corrections in the field

$ darwin protocol "RNA-seq differential expression"
-> MIQE-compliant reproducible protocol
```

---

### Workflows

Ask naturally or use slash commands as shortcuts.

| Command | What it does |
| --- | --- |
| `/deepresearch <topic>` | Source-heavy multi-agent investigation with evidence hierarchy |
| `/systematic-review <topic>` | PRISMA-compliant systematic review or meta-analysis |
| `/lit <topic>` | Literature review from PubMed, bioRxiv, and primary sources |
| `/target-dossier <gene/protein>` | Comprehensive target validation and druggability assessment |
| `/trial-tracker <drug/indication>` | Clinical trial landscape and regulatory milestones |
| `/retraction-sweep <topic>` | Scan for retractions, corrections, and expressions of concern |
| `/protocol <name>` | Draft reproducible wet-lab or in-silico protocols |
| `/biomarker-roc <marker+disease>` | Biomarker performance evaluation with ROC analysis |
| `/dosage-calc <drug+patient>` | Drug dosage calculation with organ adjustment |
| `/ic50-fit <compound+data>` | Dose-response curve fitting with confidence intervals |
| `/review <artifact>` | Biomedical peer review with reporting checklist |
| `/audit <item>` | Evidence integrity audit |
| `/compare <topic>` | Source comparison matrix |
| `/draft <topic>` | Manuscript-style draft from research findings |
| `/watch <topic>` | Recurring literature monitoring |
| `/outputs` | Browse all biomedical artifacts |

---

### Agents

Six bundled biomedical agents, dispatched automatically.

- **bio-researcher** -- gather primary evidence across PubMed, clinical trials, bioRxiv, and regulatory filings
- **clinical-researcher** -- gather and appraise clinical evidence from RCTs, systematic reviews, and guidelines
- **bioinformatician** -- design and execute reproducible bioinformatics pipelines and in-silico analyses
- **bio-reviewer** -- simulated biomedical peer review with domain-specific checklists (CONSORT, ARRIVE, MIQE, PRISMA)
- **bio-writer** -- structured manuscripts, protocols, and evidence summaries
- **evidence-verifier** -- inline citations, source verification, retraction checks, and evidence hierarchy enforcement

---

### Skills & Tools

- **PubMed Search** -- structured queries with MeSH terms for peer-reviewed literature
- **bioRxiv / medRxiv Monitor** -- track preprints before peer review
- **Clinical Trial Check** -- ClinicalTrials.gov and EU CTR search
- **Retraction Check** -- verify paper integrity before citation
- **Gene Lookup** -- HGNC, OMIM, ClinVar, UniProt queries
- **Pathway Enrichment** -- ORA and GSEA guidance
- **AlphaFold Fetch** -- retrieve and evaluate predicted structures
- **Statistics Check** -- audit statistical methods and p-hacking signs
- **BLAST** -- sequence alignment and ortholog search
- **GEO Reanalysis** -- reanalyze public datasets for validation
- **Biomarker ROC** -- diagnostic/prognostic performance evaluation
- **Dosage Calc** -- renal/hepatic adjustments with standard references
- **IC50 Fit** -- 4-parameter logistic regression with confidence intervals
- **Web Search** -- Exa, Perplexity, or Gemini API for current topics
- **Session Search** -- indexed recall across prior research sessions
- **Preview** -- browser and PDF export of generated artifacts

---

### How it works

Built on [Pi](https://github.com/badlogic/pi-mono) for the agent runtime, with biomedical capabilities delivered as [Pi skills](https://github.com/badlogic/pi-skills) -- Markdown instruction files synced to `~/.darwin/agent/skills/` on startup.

Every output is source-grounded and respects the evidence hierarchy:
- Peer-reviewed systematic reviews and RCTs > cohort studies > preprints
- Retraction checks before citation
- In-silico results explicitly labeled, never presented as wet-lab confirmed
- Standard nomenclature: HGNC gene symbols, RRIDs, UniProt IDs, ChEMBL IDs

