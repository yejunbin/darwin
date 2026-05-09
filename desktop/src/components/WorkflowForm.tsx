import { useState } from "react";
import "./WorkflowForm.css";

interface WorkflowFormProps {
  command: string;
  onSubmit: (fullCommand: string) => void;
  onCancel: () => void;
}

const WORKFLOW_FIELDS: Record<
  string,
  { label: string; placeholder: string; description: string }
> = {
  "/deepresearch": {
    label: "研究主题",
    placeholder: "例如：CRISPR base editing in sickle cell disease",
    description: "输入一个需要深度调查的主题，Darwin 将调动多个代理并行检索。",
  },
  "/systematic-review": {
    label: "综述主题",
    placeholder: "例如：GLP-1 agonists in heart failure",
    description: "输入一个生物医学主题，生成 PRISMA 合规的系统综述。",
  },
  "/lit": {
    label: "文献检索主题",
    placeholder: "例如：PD-1 inhibitors in non-small cell lung cancer",
    description: "输入主题进行文献综述，覆盖 PubMed、bioRxiv 和原始文献。",
  },
  "/target-dossier": {
    label: "基因 / 蛋白名称",
    placeholder: "例如：KRAS G12C 或 TP53",
    description: "输入基因符号或蛋白名称，生成综合靶点档案。",
  },
  "/trial-tracker": {
    label: "药物 / 适应症",
    placeholder: "例如：donanemab Alzheimer's",
    description: "输入药物名和/或适应症，追踪临床试验全景。",
  },
  "/protocol": {
    label: "实验方案名称",
    placeholder: "例如：RNA-seq differential expression",
    description: "输入实验名称，生成 MIQE/CONSORT/ARRIVE 合规的可重复方案。",
  },
  "/retraction-sweep": {
    label: "扫描主题",
    placeholder: "例如：amyloid hypothesis",
    description: "输入主题，扫描该领域的撤稿和勘误。",
  },
  "/biomarker-roc": {
    label: "标志物 + 疾病",
    placeholder: "例如：CEA colorectal cancer",
    description: "输入生物标志物和疾病名称，进行 ROC 分析。",
  },
  "/dosage-calc": {
    label: "药物 + 患者信息",
    placeholder: "例如：vancomycin 70yo male creatinine 1.5",
    description: "输入药物和患者基本信息，计算个体化剂量。",
  },
  "/ic50-fit": {
    label: "化合物 + 数据描述",
    placeholder: "例如：compound-X dose-response data",
    description: "输入化合物信息，进行四参数逻辑回归拟合。",
  },
  "/review": {
    label: "评审对象",
    placeholder: "例如：手稿文件路径或研究摘要",
    description: "输入需要评审的成果，进行生物医学同行评审。",
  },
  "/audit": {
    label: "审计项目",
    placeholder: "例如：论文标题或 DOI",
    description: "输入项目，进行证据完整性审计。",
  },
  "/compare": {
    label: "对比主题",
    placeholder: "例如：mRNA vs viral vector vaccines",
    description: "输入主题，生成多来源对比矩阵。",
  },
  "/draft": {
    label: "草稿主题",
    placeholder: "例如：Results section for CRISPR screen",
    description: "输入主题或研究发现，生成手稿式草稿。",
  },
  "/watch": {
    label: "监控主题",
    placeholder: "例如：CAR-T therapy solid tumors",
    description: "输入主题，设置定期文献监控。",
  },
};

export default function WorkflowForm({
  command,
  onSubmit,
  onCancel,
}: WorkflowFormProps) {
  const [value, setValue] = useState("");
  const config = WORKFLOW_FIELDS[command] || {
    label: "参数",
    placeholder: "输入参数...",
    description: "",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(`${command} "${value.trim()}"`);
    }
  };

  return (
    <div className="workflow-form-overlay" onClick={onCancel}>
      <div className="workflow-form-panel" onClick={(e) => e.stopPropagation()}>
        <div className="workflow-form-header">
          <h3>
            {command}
          </h3>
          <button className="workflow-form-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="workflow-form-body">
            {config.description && (
              <p className="workflow-form-desc">{config.description}</p>
            )}
            <div className="workflow-form-field">
              <label>{config.label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={config.placeholder}
                autoFocus
              />
            </div>
          </div>

          <div className="workflow-form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!value.trim()}
            >
              执行
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
