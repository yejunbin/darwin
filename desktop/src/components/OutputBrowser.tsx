import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./OutputBrowser.css";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
}

interface OutputCategory {
  category: string;
  path: string;
  files: FileEntry[];
}

export default function OutputBrowser({ onClose }: { onClose: () => void }) {
  const [outputs, setOutputs] = useState<OutputCategory[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadOutputs();
  }, []);

  const loadOutputs = async () => {
    try {
      const result = (await invoke("list_outputs")) as OutputCategory[];
      setOutputs(result);
      if (result.length > 0) {
        setActiveCategory(result[0].category);
      }
    } catch (e) {
      console.error("Failed to load outputs:", e);
    }
  };

  const readSelectedFile = async (path: string) => {
    setLoading(true);
    setSelectedFile(path);
    try {
      const content = (await invoke("read_file", { filePath: path })) as string;
      setFileContent(content);
    } catch (e) {
      setFileContent(`Error reading file: ${String(e)}`);
    }
    setLoading(false);
  };

  const exportToPdf = async (filePath: string, content: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("请允许弹出窗口以导出 PDF");
      return;
    }
    const fileName = filePath.split("/").pop() || "document";
    const htmlContent = renderMarkdown(content)
      .replace(/<br\/>/g, "<br/>")
      .replace(/<h1>/g, '<h1 style="color:#1a1a2e;font-size:22px;margin-top:20px;">')
      .replace(/<h2>/g, '<h2 style="color:#1a1a2e;font-size:18px;margin-top:16px;">')
      .replace(/<h3>/g, '<h3 style="color:#1a1a2e;font-size:15px;margin-top:14px;">')
      .replace(/<code>/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-family:monospace;">')
      .replace(/<strong>/g, '<strong style="color:#000;">');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.7; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
          .citation-badge { background: #e0e7ff; color: #1e3a8a; padding: 1px 5px; border-radius: 4px; font-size: 12px; font-weight: 500; }
          .evidence-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 0 2px; }
          .evidence-rct { background: #dcfce7; color: #166534; }
          .evidence-meta { background: #dbeafe; color: #1e40af; }
          .evidence-cohort { background: #fef3c7; color: #92400e; }
          .evidence-low { background: #fee2e2; color: #991b1b; }
          .evidence-preprint { background: #f3e8ff; color: #6b21a8; }
          .evidence-preclinical { background: #f3f4f6; color: #374151; }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryLabel: Record<string, string> = {
    outputs: "研究报告",
    manuscripts: "手稿",
    protocols: "实验方案",
    pipelines: "分析流程",
  };

  const activeFiles =
    outputs.find((o) => o.category === activeCategory)?.files || [];

  const filteredFiles = searchQuery.trim()
    ? activeFiles.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : activeFiles;

  const isMarkdown = (name: string) =>
    name.endsWith(".md") || name.endsWith(".markdown");

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");

    // Citation highlighting: [1], [2], [Author et al., 2023], etc.
    html = html.replace(
      /\[(\d+(?:[–-]\d+)?)\]/g,
      '<span class="citation-badge">[$1]</span>'
    );
    html = html.replace(
      /\(([A-Z][a-z]+(?:\s+et\s+al\.?)?,\s*\d{4}[a-z]?)\)/g,
      '(<span class="citation-badge">$1</span>)'
    );

    // Evidence-level tags
    const evidenceMap: Record<string, string> = {
      "RCT": "evidence-rct",
      "randomized controlled trial": "evidence-rct",
      "meta-analysis": "evidence-meta",
      "systematic review": "evidence-meta",
      "cohort study": "evidence-cohort",
      "case-control": "evidence-cohort",
      "case series": "evidence-low",
      "preprint": "evidence-preprint",
      "in vitro": "evidence-preclinical",
      "in vivo": "evidence-preclinical",
      "animal study": "evidence-preclinical",
    };

    for (const [label, cls] of Object.entries(evidenceMap)) {
      const re = new RegExp(`\\b(${label})\\b`, "gi");
      html = html.replace(re, `<span class="evidence-tag ${cls}">$1</span>`);
    }

    return html;
  };

  return (
    <div className="output-overlay" onClick={onClose}>
      <div className="output-panel" onClick={(e) => e.stopPropagation()}>
        <div className="output-header">
          <h2>研究成果浏览</h2>
          <div className="output-header-actions">
            {selectedFile && isMarkdown(selectedFile) && (
              <button
                className="output-export-btn"
                onClick={() => exportToPdf(selectedFile, fileContent)}
                title="导出 PDF"
              >
                📄 导出 PDF
              </button>
            )}
            <button className="output-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="output-body">
          <div className="output-sidebar">
            <div className="output-categories">
              {outputs.map((cat) => (
                <button
                  key={cat.category}
                  className={activeCategory === cat.category ? "active" : ""}
                  onClick={() => setActiveCategory(cat.category)}
                >
                  {categoryLabel[cat.category] || cat.category}
                  <span className="file-count">({cat.files.length})</span>
                </button>
              ))}
            </div>

            <div className="output-search">
              <input
                type="text"
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="output-file-list">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className={`output-file-item ${
                    selectedFile === file.path ? "selected" : ""
                  }`}
                  onClick={() => readSelectedFile(file.path)}
                >
                  <div className="file-icon">
                    {file.is_dir ? "📁" : isMarkdown(file.name) ? "📝" : "📄"}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      {formatDate(file.modified)} · {formatSize(file.size)}
                    </div>
                  </div>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <p className="empty-files">
                  {searchQuery.trim() ? "未找到匹配的文件" : "该分类下暂无文件"}
                </p>
              )}
            </div>
          </div>

          <div className="output-preview">
            {loading && (
              <div className="preview-loading">加载中...</div>
            )}
            {!loading && selectedFile && isMarkdown(selectedFile) && (
              <div
                className="markdown-preview"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(fileContent),
                }}
              />
            )}
            {!loading && selectedFile && !isMarkdown(selectedFile) && (
              <pre className="text-preview">{fileContent}</pre>
            )}
            {!selectedFile && !loading && (
              <div className="preview-empty">
                <div className="preview-empty-icon">📂</div>
                <p>选择左侧文件查看内容</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
