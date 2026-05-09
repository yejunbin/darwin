import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const unlisten = listen<RpcEvent>("rpc-event", (event) => {
      const { event_type, payload } = event.payload;

      if (event_type === "stdout") {
        const line = typeof payload === "string" ? payload : JSON.stringify(payload);
        try {
          const json = JSON.parse(line);
          handleRpcMessage(json);
        } catch {
          appendSystemMessage(line);
        }
      } else if (event_type === "stderr") {
        const line = typeof payload === "string" ? payload : JSON.stringify(payload);
        appendSystemMessage(`[stderr] ${line}`);
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

  const handleRpcMessage = useCallback((json: Record<string, unknown>) => {
    const msgType = json.type as string | undefined;

    if (msgType === "message_start" || msgType === "message_update") {
      const content = (json.content as string) || "";
      const role = (json.role as string) || "assistant";

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.content.endsWith("\n\n")) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + content,
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
    } else if (msgType === "message_end") {
      setIsLoading(false);
    } else if (msgType === "tool_execution_start") {
      const toolName = (json.tool as string) || "unknown";
      appendSystemMessage(`🔧 正在执行工具: ${toolName}`);
    } else if (msgType === "agent_start") {
      const agentName = (json.agent as string) || "unknown";
      appendSystemMessage(`🤖 代理启动: ${agentName}`);
    } else if (msgType === "agent_end") {
      const agentName = (json.agent as string) || "unknown";
      appendSystemMessage(`✅ 代理完成: ${agentName}`);
    } else {
      const raw = JSON.stringify(json, null, 2);
      appendSystemMessage(raw);
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

  const connect = async () => {
    try {
      setConnectionStatus("正在连接...");
      const result = await invoke<string>("spawn_darwin_rpc");
      setIsConnected(true);
      setConnectionStatus("已连接");
      appendSystemMessage(result);
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

    try {
      const payload = JSON.stringify({
        type: "prompt",
        message: userMsg.content,
      });
      await invoke("send_rpc_message", { message: payload });
    } catch (err) {
      setIsLoading(false);
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

  const insertWorkflow = (cmd: string) => {
    setInput(cmd + " ");
    inputRef.current?.focus();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🧬</span>
          <span className="logo-text">Darwin</span>
        </div>
        <div className="status-bar">
          <span className={`status-dot ${isConnected ? "connected" : "disconnected"}`}></span>
          <span className="status-text">{connectionStatus}</span>
          {isConnected ? (
            <button className="btn-disconnect" onClick={disconnect}>断开</button>
          ) : (
            <button className="btn-connect" onClick={connect}>连接</button>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>研究工作流</h3>
            <div className="workflow-list">
              {workflows.map((cmd) => (
                <button
                  key={cmd}
                  className="workflow-btn"
                  onClick={() => insertWorkflow(cmd)}
                  disabled={!isConnected}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
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
    </div>
  );
}

export default App;
