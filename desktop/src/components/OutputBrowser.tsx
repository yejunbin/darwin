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

  const isMarkdown = (name: string) =>
    name.endsWith(".md") || name.endsWith(".markdown");

  const renderMarkdown = (text: string) => {
    // Simple markdown rendering without external deps
    return text
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="output-overlay" onClick={onClose}>
      <div className="output-panel" onClick={(e) => e.stopPropagation()}>
        <div className="output-header">
          <h2>研究成果浏览</h2>
          <button className="output-close" onClick={onClose}>
            ✕
          </button>
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

            <div className="output-file-list">
              {activeFiles.map((file) => (
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
              {activeFiles.length === 0 && (
                <p className="empty-files">该分类下暂无文件</p>
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
