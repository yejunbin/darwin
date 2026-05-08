---
description: Conduct a PRISMA-compliant systematic review or meta-analysis on a biomedical topic.
args: <topic>
section: Research Workflows
topLevelCli: true
---
Run a systematic review for: $@

This is an execution request, not a request to explain or implement the workflow instructions.
Execute the workflow. Do not answer by describing the protocol, do not explain these instructions, and do not restate the protocol.

## Required Artifacts

Derive a short slug from the topic: lowercase, hyphenated, no filler words, at most 5 words.

Every run must leave these files on disk:
- `manuscripts/.plans/<slug>-sr.md`
- `manuscripts/<slug>-sr.md`
- `manuscripts/<slug>-sr.provenance.md`

## Step 1: Protocol & Plan

Create `manuscripts/.plans/<slug>-sr.md` immediately. Include:
- PICO/PECO framework (Population, Intervention/Exposure, Comparator, Outcome)
- Search strategy (databases, MeSH terms, date range)
- Inclusion/exclusion criteria
- Risk of bias tool (Cochrane ROB-2, ROBINS-I, Newcastle-Ottawa)
- Data extraction plan
- Meta-analysis method (if applicable: fixed vs random effects, heterogeneity measures)
- PRISMA checklist commitment

## Step 2: Search

Search PubMed, Cochrane Library, Embase, and ClinicalTrials.gov.
- Use MeSH terms and structured queries
- Record exact search strings and database filters
- Export results to a structured format

## Step 3: Screening

- Title/abstract screening (2 independent reviewers ideal; note if single-reviewer)
- Full-text screening with exclusion reasons
- PRISMA flow diagram (use Mermaid)

## Step 4: Data Extraction

Extract from each included study:
- Study design, sample size, population characteristics
- Intervention/exposure details
- Outcome measures and effect sizes (OR, RR, HR, MD, SMD with CIs)
- Risk of bias assessment
- Funding source

## Step 5: Synthesis

- Narrative synthesis for all included studies
- Meta-analysis when ≥3 studies report comparable outcomes
- Forest plots (use pi-charts or describe in markdown tables)
- Heterogeneity: I², tau², p-value for Q test
- Sensitivity analyses: leave-one-out, subgroup analyses
- Publication bias: funnel plot, Egger's test (if ≥10 studies)
- GRADE assessment for certainty of evidence

## Step 6: Write

Structure:
```markdown
# Systematic Review: [topic]

## Abstract (250 words)
## Introduction
## Methods
  - Protocol registration
  - Search strategy
  - Selection criteria
  - Data extraction
  - Risk of bias
  - Synthesis methods
## Results
  - PRISMA flow
  - Study characteristics table
  - Risk of bias summary
  - Synthesis results
  - Meta-analysis (if applicable)
  - Heterogeneity and sensitivity
  - Publication bias
## Discussion
  - Summary of findings
  - Strengths and limitations
  - Comparison with existing reviews
  - Implications for practice/research
## Conclusion
## References
```

## Step 7: Deliver

Save final review to `manuscripts/<slug>-sr.md` and provenance to `manuscripts/<slug>-sr.provenance.md`.
