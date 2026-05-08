# 基于 Feynman 设计构建生物医学研究 CLI（Darwin）

下面是一个完整的设计方案，姑且命名为 **`Darwin`**（或 `BioFeynman`、`Mendel`），用于在 Feynman 的架构骨架上替换核心数据源、子代理与工作流，以适配生物医学研究的特殊性。

---

## 一、设计哲学映射

Feynman 的核心抽象到生物领域的映射:

| Feynman | Darwin（生物版） | 生物领域差异 |
|---------|-----------------|------------|
| `alpha` CLI（alphaXiv） | `bio` CLI（统一生物数据网关） | 多源异构（PubMed/bioRxiv/PDB/UniProt） |
| `researcher` 子代理 | `bio-researcher` + `clinical-researcher` | 临床证据等级、湿实验 vs 干实验 |
| `verifier` 子代理 | `evidence-verifier` | PMID/DOI/NCT 真实性、撤稿状态 |
| `reviewer` | `bio-reviewer` | 统计方法、样本量、对照组、生信 pipeline |
| `/replicate` | `/reanalyze` + `/insilico` | 干实验复现而非湿实验 |
| `/audit` | `/audit` + `/retraction-check` | 撤稿数据库、伦理审批、注册一致性 |
| `papers/` 输出 | `manuscripts/` + `protocols/` + `pipelines/` | 输出物种类更多 |

---

## 二、数据源层（Data Layer）

### 2.1 核心数据源矩阵

> **M1 首发** 标记 ★ 的 5 个源。其余源按里程碑分阶段接入。

```
┌─────────────────────────────────────────────────────────────┐
│                   Unified Bio Data Gateway                  │
│                       (`bio` CLI)                           │
└─────────────────────────────────────────────────────────────┘
         │
         ├── 文献层
         │     ├── ★ PubMed (NCBI E-utilities API)       同行评审摘要
         │     ├── ★ PubMed Central (PMC OAI / E-utilities)  开放全文
         │     ├── ★ bioRxiv (API v2)                    生物预印本
         │     ├── ★ medRxiv (API v2)                    医学预印本
         │     ├── Europe PMC                            欧洲镜像 + 引文图谱
         │     └── Retraction Watch DB                   撤稿筛查（M2 必带）
         │
         ├── 临床层
         │     ├── ★ ClinicalTrials.gov API v2           临床试验注册
         │     ├── EU Clinical Trials Register (CTIS)    欧盟注册
         │     ├── WHO ICTRP                             全球元注册
         │     └── FDA Drugs@FDA / EMA EPAR              药品审批
         │
         ├── 实体层（生物本体）
         │     ├── NCBI Gene / HGNC                      基因
         │     ├── UniProt                               蛋白质
         │     ├── PDB / AlphaFold DB                    结构
         │     ├── ChEMBL / PubChem / DrugBank           化合物
         │     ├── MeSH / MONDO / HPO                    疾病/表型
         │     ├── KEGG / Reactome / WikiPathways        通路
         │     └── GO (Gene Ontology)                    功能注释
         │
         ├── 数据集层
         │     ├── GEO / ArrayExpress                    基因表达
         │     ├── SRA / ENA                             原始测序
         │     ├── TCGA / GTEx / UK Biobank              人群数据
         │     └── Bioconductor ExperimentHub            R 数据集
         │
         └── 知识库层
               ├── OpenTargets                           靶点-疾病关联
               ├── DisGeNET                              基因-疾病
               ├── STRING                                蛋白互作
               └── DepMap                                癌症依赖
```

**M1 首发数据源接入要点（5 源）**：

| 源 | 协议 | 是否需要 key | 速率 | 关键字段 |
|----|------|------------|-----|---------|
| **PubMed** | NCBI E-utilities (XML/JSON) | 推荐 | 3→10 req/s（带 key） | PMID、title、abstract、MeSH、affiliations |
| **PubMed Central** | E-utilities `efetch` + OAI-PMH | 推荐 | 同上 | PMCID、全文 XML（JATS）、figures、refs |
| **bioRxiv** | REST API `/details/biorxiv/...` | 否 | 礼貌爬取 | DOI、版本号、posted date、PDF URL |
| **medRxiv** | REST API `/details/medrxiv/...` | 否 | 同 bioRxiv | 同上，外加 health-related 标签 |
| **ClinicalTrials.gov** | REST API v2（JSON） | 否 | 充裕 | NCT ID、status、phase、endpoints、results |

### 2.2 网关 CLI 设计（`bio` CLI）

仿照 Feynman 的 `alpha` CLI，统一封装多源访问。建议作为独立 npm 包发布（如 `@darwin-ai/bio-hub`）：

```bash
bio search "EGFR resistance NSCLC" --source pubmed,biorxiv --years 2020-2026 --limit 50
bio fetch PMID:34567890 --format full-text
bio fetch DOI:10.1101/2024.05.07.123456 --source biorxiv
bio entity gene:EGFR --include orthologs,interactions
bio trial NCT04379466 --include results,protocol
bio retraction-check PMID:12345678
bio dataset GEO:GSE123456 --download metadata
```

**关键能力**：
- **认证管理**：NCBI API key（提速 3x）、UMLS 账户、UK Biobank token
- **持久化缓存**：PubMed 的 abstract 永不变化，bioRxiv preprint 会更新版本
- **速率限制**：NCBI 默认 3 req/s，带 key 10 req/s
- **撤稿同步**：每周从 Retraction Watch 同步标注

---

## 三、子代理（Subagents）设计

### 3.1 在 Feynman 4 个代理基础上扩展为 6 个

```
.darwin/agents/
├── bio-researcher.md         # 文献+实体+数据集证据收集
├── clinical-researcher.md    # 专攻临床试验、流行病学、循证医学
├── bioinformatician.md       # 数据集分析、生信流程、in silico 复现
├── bio-reviewer.md           # 同行评审视角，关注统计、样本、可重复性
├── evidence-verifier.md      # PMID/DOI/NCT/基因符号/蛋白 ID 真实性核验
└── bio-writer.md             # 学术写作（IMRaD 结构、引文格式 AMA/Vancouver）
```

### 3.2 关键代理职责差异化

**`clinical-researcher`** —— 这是生物领域不可省略的：

```markdown
You are the clinical-researcher subagent.

Operating rules:
- For any therapy/intervention claim, MUST cross-check:
  1. ClinicalTrials.gov registration (NCT ID required)
  2. Whether the trial completed and posted results
  3. Compare protocol-registered endpoints vs published endpoints
     (flag outcome switching)
  4. Check FDA/EMA approval status if it's an approved drug
- For epidemiological claims, distinguish:
  RCT > prospective cohort > case-control > cross-sectional > case report
  Apply GRADE evidence grading explicitly.
- Sample size & power: extract from methods, flag if missing.
- PRISMA flow for systematic reviews; CONSORT for RCTs.
- Conflicts of interest: extract funding source and author COI declarations.
```

**`evidence-verifier`** —— 生物领域有特殊核验项：

```markdown
Verification checklist:
- Every PMID resolves and matches cited title.
- DOIs resolve via Crossref.
- NCT IDs exist on ClinicalTrials.gov.
- Gene symbols use HGNC-approved nomenclature (not deprecated aliases).
- Protein references include UniProt accession.
- Cell line claims checked against Cellosaurus (RRID required for
  validated lines; flag misidentified lines per ICLAC).
- Antibodies cited with RRID (Antibody Registry).
- ⚠️ Run retraction check on all primary sources. If retracted,
  flag with retraction date and reason; do NOT propagate the claim.
```

---

## 四、工作流（Prompts/Workflows）

> 工作流按目标用户分三组：**共用** / **学术研究者侧重** / **制药工业侧重**。
> CLI `darwin --help` 通过 `--audience academic|pharma|all` 切换显示视图。

### 4.1 保留并改造 Feynman 工作流（共用）

```
prompts/                              # ◉ 共用（学术 & 制药都用）
├── deepresearch.md     # 保留，数据源切换
├── lit.md              # 改造为系统综述风格（PRISMA flow）
├── compare.md          # 改造为 head-to-head 对比（论文/试验/药物）
├── draft.md            # IMRaD + AMA/Vancouver 引文
├── review.md           # 同行评审，加 STROBE/CONSORT/ARRIVE 检查
├── audit.md            # 论文 vs 注册协议 vs 数据
├── watch.md            # 监视新预印本/新临床试验更新
└── log.md              # 实验记录
```

### 4.2 学术研究者侧重的工作流

```
prompts/                              # ◉ 学术派（PI、博士生、博士后）
├── systematic-review.md   # PRISMA 2020 标准系统综述
├── meta-analysis.md       # 在线性化 effect size 后做 meta（forest plot）
├── reanalyze.md           # 从 GEO/SRA 拉数据重新分析
├── insilico.md            # 在 silico 复现（pathway enrichment / docking / QSAR）
├── retraction-sweep.md    # 对参考文献做撤稿筛查
├── pathway-analysis.md    # 通路富集分析（GSEA / ORA）
└── grant-scout.md         # 基金风向：NIH RePORTER / NSFC / ERC 关键词追踪
```

### 4.3 制药工业侧重的工作流

```
prompts/                              # ◉ 制药派（BD、CI、临床、注册）
├── target-dossier.md      # 靶点档案：基因→蛋白→通路→疾病→已知药物
├── drug-dossier.md        # 药物档案：MoA→trials→safety→竞品→市场
├── trial-tracker.md       # 临床试验进度与结果追踪
├── trial-landscape.md     # 适应症全景：所有 active trials 按机制聚类
├── competitive-intel.md   # 竞品情报：同靶点/同适应症 pipeline 对比
├── biomarker-eval.md      # 生物标志物评估（敏感性/特异性/AUC/校准）
├── regulatory-watch.md    # FDA/EMA/NMPA 公告与审评摘要
└── safety-signal.md       # FAERS / EudraVigilance 不良事件信号挖掘
```

### 4.4 工作流示例（`/target-dossier`，制药派核心流）

```markdown
---
name: target-dossier
description: Build a comprehensive dossier on a therapeutic target gene/protein
section: Bio Workflows (Pharma)
topLevelCli: true
audience: pharma
---

Build a target dossier for {{TARGET}}.

Phase 1 — Identity resolution (bio-researcher):
- Resolve to HGNC symbol + UniProt + Ensembl + NCBI Gene IDs
- Get orthologs (mouse/rat/zebrafish) for translational relevance

Phase 2 — Biology (bioinformatician):
- Tissue expression (GTEx, HPA)
- Subcellular localization
- Pathway membership (KEGG, Reactome)
- Protein interactions (STRING)

Phase 3 — Disease association (clinical-researcher):
- OpenTargets disease associations with score breakdown
- DisGeNET genetic evidence
- GWAS catalog hits
- Mendelian disease (OMIM)

Phase 4 — Druggability (bio-researcher):
- Existing drugs (DrugBank, ChEMBL)
- Active clinical trials (ClinicalTrials.gov filter by intervention)
- Patent landscape (optional)

Phase 5 — Liability assessment (bio-reviewer):
- Essential gene? (DepMap)
- Knockout phenotype (IMPC)
- Tissue restriction (off-target risk)
- Known safety signals from existing modulators

Phase 6 — Verification (evidence-verifier):
- Every PMID/NCT/DOI resolves
- Gene symbol is current HGNC (not deprecated)
- Cross-check at least 3 primary sources for any therapeutic claim

Output: manuscripts/<target-slug>-dossier.md + provenance sidecar
```

### 4.5 工作流示例（`/systematic-review`，学术派核心流）

```markdown
---
name: systematic-review
description: PRISMA 2020 compliant systematic review with full audit trail
section: Bio Workflows (Academic)
topLevelCli: true
audience: academic
---

Systematic review on: {{QUESTION}}

Phase 1 — Protocol (bio-researcher):
- Frame as PICO/PECO question
- Define inclusion/exclusion criteria upfront
- Pre-register the protocol locally (mimics PROSPERO style)

Phase 2 — Search (bio-researcher):
- Run searches across PubMed + PMC + bioRxiv + medRxiv + Europe PMC
- Capture exact query strings + dates + result counts (PRISMA flow)
- Deduplicate by DOI/PMID, then by title similarity

Phase 3 — Screening (bio-reviewer):
- Title/abstract screen against criteria
- Full-text screen with reasons for exclusion
- Export PRISMA flow diagram data

Phase 4 — Data extraction (bio-researcher):
- Standardized extraction sheet (per PICO arm)
- Risk of bias: Cochrane RoB 2 (RCT) / ROBINS-I (non-randomized) /
  QUADAS-2 (diagnostic) / SYRCLE (animal)

Phase 5 — Retraction sweep (evidence-verifier):
- Cross-check every included paper against Retraction Watch DB
- If any retraction post-screening: redo synthesis without it

Phase 6 — Synthesis (bio-writer):
- Narrative or quantitative synthesis (forest plot if homogeneous)
- GRADE certainty rating per outcome
- Heterogeneity (I², τ²) reported when meta-analyzed

Output:
  manuscripts/<slug>-review.md
  outputs/<slug>-prisma-flow.md
  outputs/<slug>-extraction.csv
  + provenance sidecar
```

---

## 五、Skills 系统

### 5.1 新增生物特有 Skills

```
skills/
├── pubmed-search/          # PubMed 高级检索（MeSH terms、filters）
├── biorxiv-monitor/        # 预印本订阅与版本追踪
├── clinical-trial-check/   # 试验注册一致性核验
├── retraction-check/       # 撤稿筛查
├── gene-lookup/            # 基因/蛋白标识符解析
├── pathway-enrichment/     # GSEA/ORA 富集分析
├── seq-blast/              # 序列 BLAST 检索
├── geo-reanalysis/         # GEO 数据集自动重分析（DESeq2/limma）
├── alphafold-fetch/        # AlphaFold 结构预测获取
├── docking-prep/           # 分子对接（AutoDock Vina/DiffDock）
├── ehr-cohort/             # OMOP/FHIR 队列查询（如有数据访问权）
├── biomarker-roc/          # 诊断性能评估
├── dosage-calc/            # PK/PD 计算
├── ic50-fit/               # 剂量-反应曲线拟合
└── statistics-check/       # 统计方法适当性审查
```

### 5.2 Skill 示例：`statistics-check`

这是 `bio-reviewer` 频繁调用的 Skill：

```markdown
# statistics-check

When to use: reviewing a manuscript or preprint that reports quantitative
results. Run this BEFORE accepting any p-value or effect size at face value.

Checklist:
1. Sample size justification present? Power calculation reported?
2. Test choice appropriate for data type and distribution?
   - Continuous + normal → t-test/ANOVA
   - Continuous + non-normal → Mann-Whitney/Kruskal-Wallis
   - Categorical → chi-square/Fisher's exact
   - Time-to-event → Kaplan-Meier + log-rank, Cox regression
3. Multiple testing correction applied where >1 hypothesis tested?
   (Bonferroni, BH-FDR for high-dimensional)
4. Survival analysis: censoring handled? Proportional hazards verified?
5. Regression: assumptions checked? Residuals reported?
6. Effect size reported alongside p-values?
7. Confidence intervals on all primary outcomes?
8. Pre-specified vs post-hoc analyses clearly distinguished?
9. Outlier handling pre-specified or post-hoc?
10. n = biological replicates or technical replicates? Confused often.

Red flags:
- Bar chart with 3 dots and an asterisk (very low n, often n=3)
- p < 0.05 reported without effect size
- "Trending toward significance" (p ≈ 0.06)
- Forest plot without heterogeneity stats (I², τ²)
- HARKing indicators (hypotheses framed to match observed direction)
```

---

## 六、目录结构

```
darwin/
├── src/
│   ├── cli.ts                  # 仿 feynman/src/cli.ts，命令分发
│   ├── index.ts                # 入口
│   ├── pi/                     # 复用 Pi 运行时封装
│   ├── bio/                    # 新增：生物数据网关客户端
│   │   ├── pubmed.ts           # NCBI E-utilities 封装
│   │   ├── biorxiv.ts          # bioRxiv API
│   │   ├── clinicaltrials.ts   # ClinicalTrials.gov API v2
│   │   ├── uniprot.ts
│   │   ├── opentargets.ts
│   │   ├── retraction.ts       # Retraction Watch DB
│   │   ├── entities.ts         # HGNC/MeSH/MONDO 解析
│   │   ├── cache.ts            # 持久化缓存
│   │   └── rate-limit.ts       # 速率限制中间件
│   ├── ontology/               # 新增：本体管理
│   │   ├── hgnc.ts
│   │   ├── mesh.ts
│   │   ├── mondo.ts
│   │   └── normalize.ts        # 实体归一化
│   ├── compute/                # 新增：生信计算适配器
│   │   ├── nextflow.ts         # 调用 Nextflow pipeline
│   │   ├── snakemake.ts
│   │   ├── docker-bio.ts       # Bioconductor 镜像
│   │   └── nf-core.ts          # nf-core 标准 pipeline
│   ├── model/                  # 复用 Feynman 模型层
│   ├── setup/
│   ├── ui/
│   └── system/
├── prompts/                    # 13 个生物专属工作流（见 §4）
├── skills/                     # 15+ 生物 Skills（见 §5）
├── .darwin/
│   ├── SYSTEM.md               # 生物领域系统提示
│   ├── agents/                 # 6 个子代理（见 §3）
│   └── settings.json
├── extensions/
│   └── bio-tools/              # Pi 扩展：BLAST, sequence ops, etc.
├── manuscripts/                # 论文草稿输出
├── protocols/                  # 实验/分析方案
├── pipelines/                  # 可执行生信流程
├── reanalyses/                 # 数据集重分析结果
├── notes/
└── outputs/
```

---

## 七、SYSTEM.md 关键差异

在 Feynman 的 `SYSTEM.md` 基础上叠加：

```markdown
You are Darwin, a research-first AI agent for biomedical sciences.

Domain rules (in addition to general research rules):
- Distinguish primary literature (PubMed/bioRxiv) from review articles.
  Reviews are entry points, NOT terminal sources.
- Preprints (bioRxiv/medRxiv) are NOT peer-reviewed. Always note this.
- Check publication date AND latest version date for preprints.
- For clinical claims, peer-reviewed > preprint > poster > press release.
- ALWAYS run retraction check on cited sources before final delivery.
- Use HGNC symbols (current, not deprecated). Resolve aliases.
- Use RRIDs for antibodies, cell lines, model organisms, software.
- For sequence claims, use NCBI accession + version number.
- Distinguish in vitro / in vivo (which species) / clinical evidence.
  Don't extrapolate mouse → human silently.
- For dose claims, specify route, frequency, and species.
- Effect size + 95% CI is preferred over p-value alone.
- For statistics, default to challenging the analysis: was the test
  appropriate? Was multiple testing corrected? Was n biological or technical?

Forbidden behaviors:
- DO NOT diagnose or recommend treatment to users.
- DO NOT suggest specific drug doses for self-administration.
- DO NOT generate genomic primers/probes claimed to be experimentally validated.
- DO NOT generate synthetic experimental data and present as real.
- DO NOT cite without resolving the PMID/DOI/NCT first.

Output conventions:
- manuscripts/  for paper drafts
- protocols/    for experimental/analytical SOPs
- pipelines/    for executable bioinformatics workflows
- reanalyses/   for data re-analysis outputs (with code + figures)
- outputs/      for reviews, dossiers, briefs
- Every quantitative figure must come with the script that generated it.
```

---

## 八、关键技术决策

### 8.1 数据源认证策略

| 数据源 | 是否需要 key | 速率 | 备注 |
|--------|-------------|------|------|
| PubMed (E-utilities) | 推荐 | 3/s → 10/s | NCBI API key 免费申请 |
| bioRxiv | 否 | 无明示 | 友善爬取 |
| ClinicalTrials.gov v2 | 否 | 无明示 | REST JSON |
| UniProt | 否 | 无明示 | RESTful |
| OpenTargets | 否（GraphQL） | 无明示 | Platform API |
| UMLS | 是 | — | 用于 MeSH/SNOMED 解析 |
| UK Biobank | 是（合规审批） | — | 通常本地缓存 |

### 8.2 撤稿筛查作为强制管道

每个工作流的 `verifier` 阶段必须包含一个 `retraction_sweep` 步骤。这是生物领域和 Feynman 学术研究最大的差异之一 —— 高引用论文被撤稿的概率远高于其他领域。

### 8.3 in silico vs 湿实验复现

Feynman 的 `/replicate` 假设可以本地/云上跑代码。生物领域要分两条路径：
- **Dry-lab（干实验）**：可以做。`/reanalyze` 拉 GEO 原始数据 → 用 nf-core 标准流程重跑 DESeq2/limma → 对比文章结论。
- **Wet-lab（湿实验）**：不可能机器复现。改为 `/insilico` —— 用计算手段做替代验证（pathway 一致性、序列保守性、结构-活性关系）。

### 8.4 模型层与 DeepSeek 接入

Darwin 沿用 Feynman 的多 provider 模型层（`src/model/`），并新增 **DeepSeek** 作为一等公民 provider。

**接入方式**：DeepSeek API 兼容 OpenAI Chat Completions 协议，通过 `openai-completions` 适配器接入：

```ts
// src/model/providers/deepseek.ts
export const DEEPSEEK_PROVIDER = {
  id: "deepseek",
  baseUrl: "https://api.deepseek.com/v1",
  authMode: "api-key",            // 用户在 setup 时输入 DEEPSEEK_API_KEY
  envKey: "DEEPSEEK_API_KEY",
  models: [
    { id: "deepseek-chat",      name: "DeepSeek-V3",       context: 64_000,
      strengths: ["fast", "cheap", "general-purpose"] },
    { id: "deepseek-reasoner",  name: "DeepSeek-R1",       context: 64_000,
      strengths: ["thinking", "long-form", "verification"], thinking: true },
    { id: "deepseek-coder",     name: "DeepSeek-Coder-V3", context: 32_000,
      strengths: ["code", "pipeline-authoring"] },
  ],
} as const;
```

**模型选择策略（按工作流类型推荐默认值）**：

| 工作流类型 | 推荐默认模型 | 理由 |
|-----------|------------|------|
| `/lit`、`/deepresearch`、`/systematic-review` | DeepSeek-R1 / Claude Opus 4 | 长链推理、多源综合 |
| `/target-dossier`、`/drug-dossier` | DeepSeek-V3 / Claude Sonnet 4.6 | 大量结构化检索，速度敏感 |
| `/audit`、`/retraction-sweep`、`evidence-verifier` | DeepSeek-R1 | 高保真核验，思考过程可审计 |
| `/reanalyze`、`/insilico`（生信代码） | DeepSeek-Coder / Claude | 代码生成质量 |
| `/watch`、`/log` 等轻量循环 | DeepSeek-V3 | 价格-性能平衡 |

**`feynman model` 命令对应替换为 `darwin model`**：

```bash
darwin model login deepseek          # 输入 DEEPSEEK_API_KEY
darwin model set deepseek/deepseek-reasoner   # 切到 R1
darwin model tier auto                # service tier，DeepSeek 暂不支持，回退 default
darwin model list                     # 列出 DeepSeek + Anthropic + OpenAI + 本地
```

**思考链 (R1) 的工作流绑定**：在 prompt 模板的 frontmatter 增加 `prefer_thinking: true`，runtime 自动在该工作流启动时把 `thinking_level: high` 传给 DeepSeek-R1（或回退到模型自有 reasoning 模式）。

**国内合规与可达性**：DeepSeek 对中国大陆用户友好（CDN 在国内可达，无需 VPN）；可作为学术机构与中国制药企业首选。海外用户继续可用 Anthropic / OpenAI。setup 引导根据语言环境（locale）调整推荐顺序。

---

## 九、开发路线图

按依赖关系排序，建议 4 个里程碑：

| 阶段 | 范围 | 时间估计 |
|------|------|----------|
| **M1 – Bio Hub MVP** | `bio` CLI + PubMed + bioRxiv + ClinicalTrials 核心检索；缓存与速率限制 | 2-3 周 |
| **M2 – Agent Adaptation** | Fork Feynman → 替换 SYSTEM.md → 新增 `clinical-researcher` 与 `evidence-verifier`；`/lit`、`/review`、`/audit` 跑通 | 2 周 |
| **M3 – Bio Workflows** | `/systematic-review`、`/target-dossier`、`/trial-tracker`、`/retraction-sweep` 上线 | 3-4 周 |
| **M4 – Compute Layer** | `/reanalyze` + GEO 自动化 + nf-core 适配；`/insilico` 通路富集 | 3-4 周 |

---

## 十、已确认的设计决策

| 决策项 | 结论 | 影响 |
|--------|------|------|
| **项目形态** | 独立项目，但 fork 自 Feynman | 独立 npm 包名、独立版本号与 CHANGELOG；保留与 upstream 的同步通道 |
| **目标用户** | 学术研究者 + 制药工业（双轨） | 工作流分两组（学术派 / 制药派 / 共用），CLI help 按角色折叠 |
| **首发数据源** | PubMed + PubMed Central + bioRxiv + medRxiv + ClinicalTrials.gov | M1 必须全部跑通；其余源（OpenTargets/UniProt/GEO）M3+ 接入 |
| **模型支持** | 在 Feynman 模型层基础上新增 **DeepSeek**（DeepSeek-V3 / DeepSeek-R1 / DeepSeek-Coder） | 新增 provider；推理强度高的工作流（系统综述、验证）可指定 R1 思考链 |
| **合规边界**（待最终确认） | 默认不处理病人级数据；EHR 队列查询作为可选 Skill 隔离 | HIPAA/GDPR 在涉及病人数据时再开专属隔离层 |

---

## 十一、独立项目治理（Fork-but-Independent）

### 11.1 仓库与包名策略

| 资产 | 命名 | 说明 |
|------|------|------|
| GitHub 仓库 | `darwin-ai/darwin`（拟） | 独立组织或 user namespace，与 Feynman 不共享 |
| npm 包 | `@darwin-bio/cli` | 独立 scope；CLI bin 名 `darwin` |
| 配置目录 | `~/.darwin/` | 类比 `~/.feynman/`；自带 `agents/`, `themes/`, `settings.json`, `auth.json` |
| 本地资源 | `.darwin/` | 仓库内的 SYSTEM.md / agents / settings 模板 |
| 安装域名 | `darwin.bio`（拟） | `curl -fsSL https://darwin.bio/install \| bash` |

### 11.2 与 Feynman 上游的同步策略

**共享层（追随 upstream，定期 cherry-pick 或 rebase）**：
- `src/pi/`（Pi 运行时封装，bug 修复与新特性最有价值）
- `src/model/`（模型层基础设施，DeepSeek provider 在此扩展）
- `src/system/`、`src/ui/`、`src/setup/` 框架代码
- `scripts/`（构建/打包/安装基础设施）

**完全独立层（不再追随 upstream）**：
- `.darwin/SYSTEM.md`（生物专属系统提示）
- `.darwin/agents/`（6 个生物子代理）
- `prompts/`（生物工作流，与 Feynman 学术工作流并不重合）
- `skills/`（生物 Skills）
- `extensions/bio-tools/`
- `manuscripts/`、`protocols/`、`pipelines/`、`reanalyses/` 输出目录约定
- 文档站点 `website/`（独立内容）
- 安装脚本与品牌资源（hero 图、theme）

**同步操作建议**：
1. 在 git 中保留 `upstream` remote 指向 `getcompanion-ai/feynman`。
2. 每月一次 `git fetch upstream`，从 `src/pi/`、`src/model/`、`src/system/` 路径筛选 commit，cherry-pick 到 Darwin 的 `sync/upstream-YYYYMM` 分支。
3. 重大 Pi 版本升级触发一次完整集成测试（M1 工作流烟测）。
4. 任何 Darwin 自有改动若可对 Feynman 通用化，反向 PR 回 upstream。

### 11.3 独立的版本与发布

- 独立的 `package.json` `version`（建议从 `0.1.0` 起步，不沿用 Feynman 0.2.x）
- 独立的 `CHANGELOG.md`（user-facing，类似 Feynman 的 `RELEASES.md` 风格）
- 独立的 GitHub Release / npm tag 流程
- 在 README 显眼处声明：*"Darwin is an independent project derived from [Feynman](https://feynman.is). It shares Pi runtime infrastructure but is governed and released separately."*

### 11.4 LICENSE 与署名

- 沿用 MIT（与 Feynman 一致），保留原 Feynman copyright header 在共享代码文件中。
- 新增 `NOTICE.md` 记录 fork 起点 commit hash 与时间。
- 新文件使用 Darwin 自己的 copyright header。
