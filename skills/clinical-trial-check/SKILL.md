---
name: clinical-trial-check
description: Search and summarize clinical trials from ClinicalTrials.gov and EU CTR. Use for drug development, competitive intelligence, and evidence synthesis.
---

# Clinical Trial Check

Search clinical trial registries for trial status, results, and regulatory milestones.

## Commands

| Command | Description |
|---------|-------------|
| `web_search "site:clinicaltrials.gov <intervention> <indication>"` | Search ClinicalTrials.gov |
| `web_search "site:clinicaltrialsregister.eu <intervention>"` | Search EU Clinical Trials Register |
| `web_search "FDA approval <drug> <indication>"` | Check FDA approval status |
| `web_search "EMA EPAR <drug>"` | Check EMA approval status |

## Trial Extraction

For each relevant trial, record:
- NCT ID, phase, status
- Intervention, comparator
- Primary and secondary endpoints
- Enrollment, inclusion/exclusion criteria
- Results (if posted)
- Locations and sponsors

## Output

Save to `outputs/trial-check-<slug>.md` with structured trial tables.
