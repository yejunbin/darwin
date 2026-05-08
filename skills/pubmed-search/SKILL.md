---
name: pubmed-search
description: Search PubMed with MeSH terms, structured queries, and filters. Use for peer-reviewed biomedical literature, clinical trials, systematic reviews, and meta-analyses.
---

# PubMed Search

Use PubMed via web search or NCBI E-utilities for structured biomedical literature search.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "site:ncbi.nlm.nih.gov/pubmed <query>"` | Search PubMed via web search |
| `web_search "PubMed <topic> systematic review"` | Find systematic reviews |
| `web_search "PubMed <topic> meta-analysis"` | Find meta-analyses |
| `web_search "ClinicalTrials.gov <drug>"` | Find clinical trials |

## Query Construction

Use structured PubMed-style queries:
- `("diabetes mellitus"[MeSH Terms]) AND ("metformin"[Title/Abstract])`
- `("COVID-19"[Title/Abstract]) AND ("randomized controlled trial"[Publication Type])`
- `(