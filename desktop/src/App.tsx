import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { check } from "@tauri-apps/plugin-updater";
import "./App.css";
import Settings from "./components/Settings";
import OutputBrowser from "./components/OutputBrowser";
import WorkflowForm from "./components/WorkflowForm";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
}

interface RpcEvent {
  event_type: string;
  payload: unknown;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("未连接");
  const [showSettings, setShowSettings] = useState(false);
  const [showOutputBrowser, setShowOutputBrowser] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ name: string; path: string; modified: number; size: number }>>([]);
  const [sidebarMode, setSidebarMode] = useState<"workflows" | "sessions">("workflows");
  const [sessionSearch, setSessionSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jsonBufferRef = useRef<string>("");

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const appendSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "system",
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const resetLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      appendSystemMessage("⏱️ 请求超时：Darwin 未能在 60 秒内响应。请检查模型配置和网络连接。");
    }, 60000);
  }, [clearLoadingTimeout, appendSystemMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const update = await check();
        if (update) {
          appendSystemMessage(
            `发现新版本 ${update.version}，点击设置中的「检查更新」下载。`
          );
        }
      } catch {
        // updater check failed silently in dev
      }
    };
    checkUpdate();
  }, [appendSystemMessage]);

  const loadSessions = async () => {
    try {
      const result = (await invoke("list_sessions")) as Array<{
        name: string;
        path: string;
        modified: number;
        size: number;
      }>;
      setSessions(result);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  };

  const loadSession = async (path: string) => {
    try {
      const content = (await invoke("read_file", { filePath: path })) as string;
      const lines = content.trim().split("\n");
      const loaded: Message[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          // Pi session format: messages are wrapped in { type: "message", message: { role, content } }
          if (entry.type !== "message") continue;
          const msg = entry.message as Record<string, unknown> | undefined;
          const role = msg?.role as string;
          if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") continue;

          let text = "";
          const rawContent = msg?.content;
          if (typeof rawContent === "string") {
            text = rawContent;
          } else if (Array.isArray(rawContent)) {
            text = rawContent
              .map((part: unknown) => {
                if (typeof part === "string") return part;
                if (part && typeof part === "object") {
                  const p = part as Record<string, unknown>;
                  if (p.type === "text" && typeof p.text === "string") return p.text;
                }
                return "";
              })
              .filter(Boolean)
              .join("\n");
          }

          loaded.push({
            id: generateId(),
            role,
            content: text,
            timestamp: new Date(entry.timestamp || Date.now()),
          });
        } catch {
          // skip malformed lines
        }
      }
      if (loaded.length > 0) {
        setMessages(loaded);
      }
    } catch (e) {
      appendSystemMessage(`加载会话失败: ${String(e)}`);
    }
  };

  useEffect(() => {
    const unlisten = listen<RpcEvent>("rpc-event", (event) => {
      const { event_type, payload } = event.payload;

      if (event_type === "stdout") {
        const line = typeof payload === "string" ? payload : JSON.stringify(payload);
        const trimmed = line.trim();

        if (!trimmed) {
          // Empty line: try to flush the buffer
          if (jsonBufferRef.current) {
            try {
              const json = JSON.parse(jsonBufferRef.current);
              handleRpcMessage(json);
            } catch {
              // Buffered content is not valid JSON — silently drop it
              console.warn("[darwin stdout] buffered non-JSON:", jsonBufferRef.current);
            }
            jsonBufferRef.current = "";
          }
          return;
        }

        // Try parsing this line on its own first
        try {
          const json = JSON.parse(trimmed);
          handleRpcMessage(json);
          return;
        } catch {
          // Not a complete JSON object on its own
        }

        // Try concatenating with any buffered partial JSON
        const combined = jsonBufferRef.current ? jsonBufferRef.current + trimmed : trimmed;
        try {
          const json = JSON.parse(combined);
          handleRpcMessage(json);
          jsonBufferRef.current = "";
          return;
        } catch {
          // Still incomplete or invalid
        }

        // If it looks like the start of JSON, or we're already buffering, keep buffering
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || jsonBufferRef.current) {
          jsonBufferRef.current = combined;
        } else {
          // Plain non-JSON stdout — silently drop it (same as CLI interactive mode)
          console.warn("[darwin stdout] non-JSON:", line);
        }

        // Reset timeout on any stdout activity to avoid firing during long operations
        if (isLoading) resetLoadingTimeout();
      } else if (event_type === "stderr") {
        const line = typeof payload === "string" ? payload : JSON.stringify(payload);
        // Log stderr to console instead of chat to keep UI clean like CLI mode
        console.warn("[darwin stderr]", line);
        // Reset timeout on stderr activity too (e.g., npm install progress)
        if (isLoading) resetLoadingTimeout();
      }
    });

    const unlistenError = listen<string>("rpc-error", (event) => {
      appendSystemMessage(`[error] ${event.payload}`);
    });

    const unlistenDisconnect = listen<void>("rpc-disconnected", () => {
      setIsConnected(false);
      setConnectionStatus("已断开");
      appendSystemMessage("RPC 连接已断开");
    });

    return () => {
      unlisten.then((f) => f());
      unlistenError.then((f) => f());
      unlistenDisconnect.then((f) => f());
    };
  }, []);

  useEffect(() => {
    connect();
  }, []);

  const handleRpcMessage = useCallback(
    (json: Record<string, unknown>) => {
      const msgType = json.type as string | undefined;

      // Pi emits content as a string or as an array of content parts.
      // Match CLI interactive mode: only show text content, never thinking.
      const extractContentText = (content: unknown): string => {
        if (typeof content === "string") return content;
        if (Array.isArray(content)) {
          return content
            .map((part: unknown) => {
              if (typeof part === "string") return part;
              if (part && typeof part === "object") {
                const p = part as Record<string, unknown>;
                if (p.type === "text" && typeof p.text === "string") return p.text;
                // thinking blocks are intentionally dropped — same as CLI interactive mode
              }
              return "";
            })
            .filter(Boolean)
            .join("\n");
        }
        return "";
      };

      if (msgType === "turn_start") {
        setIsLoading(true);
        resetLoadingTimeout();
        return;
      }

      if (msgType === "turn_end") {
        const msg = json.message as Record<string, unknown> | undefined;
        const role = (msg?.role as string) || "assistant";
        const content = extractContentText(msg?.content);
        if (content) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                content,
              };
              return updated;
            }
            return [
              ...prev,
              {
                id: generateId(),
                role: role as "user" | "assistant" | "system" | "tool",
                content,
                timestamp: new Date(),
              },
            ];
          });
        }
        setIsLoading(false);
        clearLoadingTimeout();
        return;
      }

      if (msgType === "message_start" || msgType === "message_update") {
        const msg = json.message as Record<string, unknown> | undefined;
        const content = extractContentText(msg?.content);
        const role = (msg?.role as string) || "assistant";

        // Ignore user-role message_start to avoid duplicating the user's own message
        // (the user message is already added by sendMessage/sendMessageDirect)
        if (role === "user") return;

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === role && msgType === "message_update") {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + content,
            };
            return updated;
          }
          if (msgType === "message_start") {
            return [
              ...prev,
              {
                id: generateId(),
                role: role as "user" | "assistant" | "system" | "tool",
                content,
                timestamp: new Date(),
              },
            ];
          }
          return prev;
        });
        return;
      }

      if (msgType === "message_end") {
        setIsLoading(false);
        clearLoadingTimeout();
        return;
      }

      if (msgType === "response") {
        const success = json.success as boolean;
        const cmd = json.command as string;
        const error = json.error as string | undefined;
        if (!success) {
          setIsLoading(false);
          clearLoadingTimeout();
          appendSystemMessage(`❌ 请求失败 (${cmd}): ${error || "未知错误"}`);
        }
        return;
      }

      // Silently ignore internal Pi events to keep chat clean (like CLI interactive mode)
      if (
        msgType === "tool_execution_start" ||
        msgType === "agent_start" ||
        msgType === "agent_end" ||
        msgType === "extension_ui_request" ||
        msgType === "thinking" ||
        msgType === "thinking_start" ||
        msgType === "thinking_end" ||
        msgType === "toolcall_start" ||
        msgType === "toolcall_end"
      ) {
        return;
      }

      // Silently drop unknown events instead of flooding chat with raw JSON
    },
    [appendSystemMessage, clearLoadingTimeout, resetLoadingTimeout]
  );

  const connect = async () => {
    try {
      setConnectionStatus("正在连接...");
      await invoke<string>("spawn_darwin_rpc");
      setIsConnected(true);
      setConnectionStatus("已连接");
    } catch (err) {
      setConnectionStatus("连接失败");
      appendSystemMessage(`连接失败: ${String(err)}`);
    }
  };

  const disconnect = async () => {
    try {
      await invoke("stop_darwin_rpc");
      setIsConnected(false);
      setConnectionStatus("已断开");
      clearLoadingTimeout();
      setIsLoading(false);
    } catch (err) {
      appendSystemMessage(`断开失败: ${String(err)}`);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !isConnected) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    resetLoadingTimeout();

    try {
      const payload = JSON.stringify({
        type: "prompt",
        message: userMsg.content,
      });
      await invoke("send_rpc_message", { message: payload });
    } catch (err) {
      setIsLoading(false);
      clearLoadingTimeout();
      appendSystemMessage(`发送失败: ${String(err)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const workflows = [
    "/deepresearch",
    "/systematic-review",
    "/lit",
    "/target-dossier",
    "/trial-tracker",
    "/protocol",
    "/retraction-sweep",
    "/biomarker-roc",
    "/dosage-calc",
    "/ic50-fit",
    "/review",
    "/audit",
    "/compare",
    "/draft",
    "/watch",
  ];

  const openWorkflowForm = (cmd: string) => {
    setActiveWorkflow(cmd);
  };

  const submitWorkflow = (fullCommand: string) => {
    setActiveWorkflow(null);
    setInput(fullCommand);
    // Send immediately after a brief delay to allow state update
    setTimeout(() => {
      sendMessageDirect(fullCommand);
    }, 0);
  };

  const sendMessageDirect = async (message: string) => {
    if (!message.trim() || !isConnected) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    resetLoadingTimeout();

    try {
      const payload = JSON.stringify({
        type: "prompt",
        message: userMsg.content,
      });
      await invoke("send_rpc_message", { message: payload });
    } catch (err) {
      setIsLoading(false);
      clearLoadingTimeout();
      appendSystemMessage(`发送失败: ${String(err)}`);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🧬</span>
          <span className="logo-text">Darwin</span>
        </div>
        <div className="header-actions">
          <button className="btn-settings" onClick={() => setShowOutputBrowser(true)}>
            📂 成果
          </button>
          <button className="btn-settings" onClick={() => setShowSettings(true)}>
            ⚙️ 设置
          </button>
          <div className="status-bar">
            <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`}></span>
            <span className="status-text">{connectionStatus}</span>
            {isConnected ? (
              <button className="btn-disconnect" onClick={disconnect}>断开</button>
            ) : (
              <button className="btn-connect" onClick={connect}>连接</button>
            )}
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={sidebarMode === "workflows" ? "active" : ""}
              onClick={() => setSidebarMode("workflows")}
            >
              工作流
            </button>
            <button
              className={sidebarMode === "sessions" ? "active" : ""}
              onClick={() => setSidebarMode("sessions")}
            >
              会话 ({sessions.length})
            </button>
          </div>

          {sidebarMode === "workflows" ? (
            <div className="sidebar-section">
              <div className="workflow-list">
                {workflows.map((cmd) => (
                  <button
                    key={cmd}
                    className="workflow-btn"
                    onClick={() => openWorkflowForm(cmd)}
                    disabled={!isConnected}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sidebar-section">
              <div className="session-search">
                <input
                  type="text"
                  placeholder="搜索会话..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                />
              </div>
              <div className="session-list">
                {sessions.length === 0 && (
                  <p className="empty-sessions">暂无历史会话</p>
                )}
                {sessions
                  .filter((s) =>
                    s.name.toLowerCase().includes(sessionSearch.toLowerCase())
                  )
                  .map((session) => (
                    <div
                      key={session.name}
                      className="session-item"
                      onClick={() => loadSession(session.path)}
                      title="点击加载会话"
                    >
                      <div className="session-name">{session.name.replace(".jsonl", "")}</div>
                      <div className="session-meta">
                        {new Date(session.modified * 1000).toLocaleDateString()}
                        {" · "}
                        {(session.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ))}
                {sessions.filter((s) =>
                  s.name.toLowerCase().includes(sessionSearch.toLowerCase())
                ).length === 0 && sessions.length > 0 && (
                  <p className="empty-sessions">未找到匹配的会话</p>
                )}
              </div>
            </div>
          )}
        </aside>

        <main className="chat-area">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🧬</div>
                <h2>Darwin 生物医学研究助手</h2>
                <p>点击"连接"启动 Darwin RPC，然后开始您的研究。</p>
                <p>支持系统综述、文献检索、临床试验追踪、协议生成等工作流。</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`message message-${msg.role}`}>
                <div className="message-header">
                  <span className="message-role">
                    {msg.role === "user"
                      ? "👤 用户"
                      : msg.role === "assistant"
                      ? "🤖 Darwin"
                      : msg.role === "tool"
                      ? "🔧 工具"
                      : "📋 系统"}
                  </span>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">
                  <pre>{msg.content}</pre>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message message-loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isConnected
                  ? "输入消息或选择左侧工作流... (Shift+Enter 换行)"
                  : "请先点击连接按钮..."
              }
              disabled={!isConnected || isLoading}
              rows={2}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!isConnected || !input.trim() || isLoading}
            >
              {isLoading ? "处理中..." : "发送"}
            </button>
          </div>
        </main>
      </div>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showOutputBrowser && <OutputBrowser onClose={() => setShowOutputBrowser(false)} />}
      {activeWorkflow && (
        <WorkflowForm
          command={activeWorkflow}
          onSubmit={submitWorkflow}
          onCancel={() => setActiveWorkflow(null)}
        />
      )}
    </div>
  );
}

export default App;
