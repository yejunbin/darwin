# Darwin：当 AI 遇见生物医学研究 —— 一个开源生物医学生成式代理的深度解析

> **导读**：在 AI 席卷各行各业的今天，生物医学研究这个高度专业化的领域也迎来了自己的智能助手。Darwin 是一个开源的生物医学生成式代理，它不仅能帮你检索文献、设计实验，还能完成系统综述、证据分级、甚至写出符合期刊规范的手稿。本文将带你深入了解 Darwin 的每一个功能模块，看看 AI 如何真正融入科研工作流。

---

## 一、Darwin 是什么？

Darwin 是基于 [feynman](https://github.com/getcompanion-ai/feynman) 深度改造而来的**生物医学专用 AI 研究代理**。如果说 ChatGPT 是一个"什么都懂一点"的通才，那 Darwin 就是一个在生物医学领域深耕多年的专家 —— 它懂 PubMed 的检索语法，知道 PRISMA 的系统综述规范，能识别 HGNC 基因命名，甚至能在你引用一篇论文前自动检查它是否已被撤稿。

Darwin 的核心定位有三点：
- **系统文献综述**：不是简单堆砌摘要，而是遵循 PRISMA 指南的结构化分析
- **临床证据分级**：自动识别 RCT、队列研究、预印本，建立证据金字塔
- **可重复方案生成**：输出附带检查清单（MIQE/CONSORT/ARRIVE）的实验方案

---

## 二、十六个工作流：从文献检索到手稿撰写

Darwin 的交互方式非常直觉 —— 你可以像和同事聊天一样自然提问，也可以使用斜杠命令快速触发特定工作流。以下是全部 16 个工作流的详细说明：

### `/deepresearch <主题>` — 深度多代理调查
这是最"重"的研究模式。Darwin 会调动多个代理并行工作：一个负责 PubMed 检索，一个负责临床试验数据库，一个负责预印本监控，最后由一个证据整合代理将结果汇总成一份带引用来源的深度报告。适合对一个陌生领域进行快速但全面的摸底。

### `/systematic-review <主题>` — PRISMA 合规系统综述
这是 Darwin 的招牌功能。输入一个研究问题后，它会：
1. 制定检索策略（含 MeSH 词）
2. 在多个数据库执行结构化检索
3. 按 PRISMA 流程图筛选文献（识别、筛选、纳入、排除）
4. 提取关键数据点
5. 生成质量评估表格
6. 输出结构化综述文本

### `/lit <主题>` — 文献综述
比 `/deepresearch` 更轻量，专注于文献梳理而非深度分析。覆盖 PubMed、bioRxiv、medRxiv 等来源，自动生成带时间线的研究进展图。

### `/target-dossier <基因/蛋白>` — 靶点档案
输入一个基因符号（如 `KRAS G12C`）或蛋白名称，Darwin 会生成一份综合靶点档案：
- 基础信息：基因功能、通路、表达谱
- 成药性评估：小分子口袋、抗体表位、已上市/在研药物
- 专利与文献 landscape
- 相关临床试验状态

### `/trial-tracker <药物/适应症>` — 临床试验追踪
实时监控 ClinicalTrials.gov 和 EU CTR，生成临床试验全景图：
- 按阶段分布（I/II/III/IV 期）
- 关键终点与入排标准对比
- 监管里程碑（IND、NDA、PDUFA 日期）
- 竞品药物平行对比

### `/retraction-sweep <主题>` — 撤稿与勘误扫描
在引用前执行尽职调查。PubMed Retraction Watch、Retraction Database 等多源交叉验证，标记 Expressions of Concern 和 Publisher Corrections。

### `/protocol <名称>` — 实验方案起草
输出符合国际标准的可重复实验方案：
- 湿实验：附带 MIQE（qPCR）、ARRIVE（动物实验）、CONSORT（临床试验）检查清单
- 计算机模拟：附带代码版本、依赖环境、随机种子

### `/biomarker-roc <标志物+疾病>` — 生物标志物 ROC 分析
设计并评估诊断/预后标志物：
- 计算敏感度、特异度、AUC
- 生成 ROC 曲线与置信区间
- 提供验证队列建议

### `/dosage-calc <药物+患者>` — 用药剂量计算
基于标准参考文献（如 Lexicomp、Sanford Guide）计算个体化剂量：
- 肾功能调整（Cockcroft-Gault、MDRD）
- 肝功能调整（Child-Pugh 分级）
- 药物相互作用警示

### `/ic50-fit <化合物+数据>` — 剂量-反应曲线拟合
四参数逻辑回归（4PL）拟合，输出：
- IC50 / EC50 及 95% 置信区间
- Hill 斜率
- 拟合优度评估

### `/review <成果>` — 生物医学同行评审
模拟领域专家评审，按期刊要求输出：
- 主要发现总结
- 方法学评价（统计方法、样本量、对照设置）
- 报告规范检查（CONSORT、ARRIVE、MIQE、PRISMA）
- 具体修改建议

### `/audit <项目>` — 证据完整性审计
比 `/review` 更严苛的"挑刺"模式，专门寻找：
- 数据与结论不一致
- 引用链断裂（引用文献不支持原文陈述）
- 可重复性风险点
- 潜在的利益冲突

### `/compare <主题>` — 来源对比矩阵
对同一主题的多篇文献进行结构化对比，输出矩阵表格：样本量、方法、结论、局限性。

### `/draft <主题>` — 手稿式草稿
将研究发现转化为符合期刊风格的草稿文本，含标题、摘要、引言、方法、结果、讨论结构。

### `/watch <主题>` — 定期文献监控
设置监控主题后，Darwin 会定期检查新发表文献，生成周报/月报推送。

### `/outputs` — 成果浏览器
交互式浏览所有生成过的报告、方案、图表，支持导出为 PDF 或 Markdown。

---

## 三、六大代理：各有所长的研究团队

Darwin 的代理系统模拟了一个真实的研究团队，不同代理负责不同环节：

### bio-researcher（基础研究代理）
- **专长**：PubMed 高级检索、MeSH 词优化、预印本监控
- **工具**：PubMed API、bioRxiv/medRxiv RSS、Google Scholar
- **输出**：带引用的文献摘要、研究 gap 分析

### clinical-researcher（临床研究代理）
- **专长**：RCT 质量评估（Cochrane Risk of Bias）、指南解读
- **工具**：ClinicalTrials.gov、Cochrane Library、NICE/ASH 指南
- **输出**：证据等级表、临床建议分级（GRADE）

### bioinformatician（生物信息学代理）
- **专长**：NGS 流程设计、差异表达分析、通路富集
- **工具**：GEO 查询、BLAST、AlphaFold API、Ensembl
- **输出**：分析流程代码（Python/R）、结果解读、可视化建议

### bio-reviewer（评审代理）
- **专长**：报告规范检查、统计方法审计
- **工具**：CONSORT/ARRIVE/MIQE/PRISMA 检查清单
- **输出**：结构化评审意见，含严重程度分级

### bio-writer（写作代理）
- **专长**：学术英语润色、期刊格式调整
- **工具**：目标期刊 author guidelines
- **输出**：符合投稿要求的手稿段落

### evidence-verifier（证据验证代理）
- **专长**：事实核查、引用溯源、撤稿检测
- **工具**：Crossref、Retraction Watch、PubPeer
- **输出**：验证报告，标记可疑引用

---

## 四、技能与工具生态

Darwin 的能力不仅来自大模型本身，更来自其丰富的技能（Skills）系统 —— 这些是 Markdown 格式的指令文件，启动时自动同步到 `~/.darwin/agent/skills/`。

### 文献检索类
- **PubMed Search**：支持布尔逻辑、MeSH 树、日期范围、期刊筛选的高级检索
- **bioRxiv / medRxiv Monitor**：追踪预印本，设置关键词自动提醒
- **Clinical Trial Check**：ClinicalTrials.gov 和 EU CTR 双库检索

### 数据验证类
- **Retraction Check**：引用前自动扫描撤稿状态
- **Statistics Check**：审计 p-hacking 迹象（如 p 值分布异常、选择性报告）
- **Gene Lookup**：HGNC 官方符号验证，防止基因别名混淆

### 生物信息学类
- **BLAST**：序列比对，自动选择最优数据库（nt、nr、swissprot）
- **Pathway Enrichment**：ORA（过表达分析）和 GSEA 指导，支持 KEGG、Reactome、GO
- **AlphaFold Fetch**：获取预测结构，评估 pLDDT 分数和预测可靠性
- **GEO Reanalysis**：查询 GEO 数据集，生成重分析代码模板

### 临床计算类
- **Biomarker ROC**：诊断性能评估，含 Delong 检验
- **Dosage Calc**：肾/肝调整剂量计算，引用标准参考文献
- **IC50 Fit**：四参数逻辑回归，自动异常值检测

### 通用工具类
- **Web Search**：Exa、Perplexity、Gemini API 多源搜索
- **Session Search**：跨会话的语义检索，"上周查的那个基因叫什么？"
- **Preview**：一键导出浏览器可读格式或 PDF

---

## 五、技术架构：基于 Pi 的代理运行时

Darwin 不是从零构建的 —— 它站在 [Pi](https://github.com/badlogic/pi-mono) 这个开源代理运行时的肩膀上。Pi 提供了一个完整的 TUI（终端用户界面）框架，Darwin 在此基础上叠加了生物医学领域的专业知识。

### 架构分层
```
┌─────────────────────────────────────────┐
│  TUI 层（Pi）— 终端交互界面               │
├─────────────────────────────────────────┤
│  代理编排层 — 六代理调度与协作              │
├─────────────────────────────────────────┤
│  技能层（Pi Skills）— Markdown 指令文件   │
├─────────────────────────────────────────┤
│  工具层 — PubMed/BLAST/AlphaFold 等 API  │
├─────────────────────────────────────────┤
│  模型层 — DeepSeek/OpenAI/Anthropic/本地  │
└─────────────────────────────────────────┘
```

### 模型支持
Darwin 支持多种模型提供商：
- **DeepSeek**（推荐）：deepseek-v4-pro / deepseek-v4-flash，长上下文适合复杂分析
- **OpenAI**：GPT-4o / o3 系列
- **Anthropic**：Claude 3.5/4 Sonnet
- **本地模型**：LM Studio、Ollama、vLLM，通过 OpenAI 兼容接口接入

### 命名法与标准化
Darwin 在所有输出中强制执行生物医学标准命名：
- **基因**：HGNC 官方符号（如 `TP53` 而非 `p53`）
- **试剂**：RRID（Research Resource Identifiers）
- **蛋白**：UniProt ID
- **化合物**：ChEMBL ID

---

## 六、快速上手

### 安装
```bash
git clone https://github.com/yejunbin/darwin.git
cd darwin
npm install
npm run build

# 创建符号链接
mkdir -p ~/.local/bin
ln -s $(pwd)/bin/darwin.js ~/.local/bin/darwin
export PATH="$HOME/.local/bin:$PATH"
```

### 配置模型
```bash
darwin setup
```
选择你的模型提供商，输入 API Key 即可。

### 第一条命令
```bash
darwin systematic-review "PD-1 inhibitors in non-small cell lung cancer"
```
然后看着 Darwin 自动完成从检索到成稿的全过程。

---

## 七、为什么 Darwin 不一样？

市面上不乏 AI 文献助手，但 Darwin 有几个独特的坚持：

1. **证据层级优先**：不会把预印本和 RCT 混为一谈，每句话都标注证据等级
2. **撤稿先行**：引用前必查撤稿状态，避免踩坑
3. **可重复性内建**：生成的方案附带检查清单，计算机模拟结果明确标注"in-silico"
4. **开源可控**：代码、技能、代理定义全部开源，你可以修改 SYSTEM.md 调整行为，也可以写自己的技能

---

## 结语

Darwin 不是来替代研究者的 —— 它是来替代那些重复、枯燥但又不能出错的科研杂活。把文献检索、格式检查、撤稿扫描交给 Darwin，把真正需要创造力的思考留给自己。

开源地址：https://github.com/yejunbin/darwin

---

*Darwin —— 让 AI 成为实验室里最靠谱的科研助理。*
