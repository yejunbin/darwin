import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Settings.css";

interface ProviderConfig {
  baseUrl?: string;
  api?: string;
  authHeader?: boolean;
  models?: Array<{ id: string }>;
  apiKey?: string;
}

interface AuthEntry {
  type: string;
  key: string;
}

interface DoctorCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"models" | "doctor" | "general">("models");
  const [modelsConfig, setModelsConfig] = useState<Record<string, ProviderConfig>>({});
  const [authConfig, setAuthConfig] = useState<Record<string, AuthEntry>>({});
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [doctorResults, setDoctorResults] = useState<DoctorCheck[]>([]);
  const [isRunningDoctor, setIsRunningDoctor] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const models = (await invoke("read_models_config")) as { providers?: Record<string, ProviderConfig> };
      setModelsConfig(models.providers || {});
    } catch (e) {
      console.error("Failed to load models config:", e);
    }
    try {
      const auth = (await invoke("read_auth_config")) as Record<string, AuthEntry>;
      setAuthConfig(auth || {});
    } catch (e) {
      console.error("Failed to load auth config:", e);
    }
    try {
      const s = (await invoke("read_settings")) as Record<string, unknown>;
      setSettings(s || {});
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const saveModelsConfig = async () => {
    try {
      await invoke("write_models_config", {
        config: { providers: modelsConfig },
      });
      await invoke("write_auth_config", { config: authConfig });
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
      setSaveStatus(`保存失败: ${String(e)}`);
    }
  };

  const saveSettings = async () => {
    try {
      await invoke("write_settings", { settings });
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
      setSaveStatus(`保存失败: ${String(e)}`);
    }
  };

  const runDoctor = async () => {
    setIsRunningDoctor(true);
    try {
      const results = (await invoke("run_darwin_doctor")) as DoctorCheck[];
      setDoctorResults(results);
    } catch (e) {
      setDoctorResults([
        { name: "Doctor", status: "fail", message: `运行失败: ${String(e)}` },
      ]);
    }
    setIsRunningDoctor(false);
  };

  const updateProvider = (provider: string, field: keyof ProviderConfig, value: string | boolean) => {
    setModelsConfig((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const updateApiKey = (provider: string, key: string) => {
    setAuthConfig((prev) => ({
      ...prev,
      [provider]: { type: "api_key", key },
    }));
  };

  const providerFields = [
    {
      id: "deepseek",
      name: "DeepSeek",
      defaultUrl: "https://api.deepseek.com",
      defaultModels: ["deepseek-v4-pro", "deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"],
    },
    {
      id: "openai",
      name: "OpenAI",
      defaultUrl: "https://api.openai.com",
      defaultModels: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      defaultUrl: "https://api.anthropic.com",
      defaultModels: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5"],
    },
    {
      id: "local",
      name: "本地模型 (LM Studio / Ollama / vLLM)",
      defaultUrl: "http://localhost:1234/v1",
      defaultModels: ["local-model"],
    },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>设置</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button
            className={activeTab === "models" ? "active" : ""}
            onClick={() => setActiveTab("models")}
          >
            模型提供商
          </button>
          <button
            className={activeTab === "doctor" ? "active" : ""}
            onClick={() => setActiveTab("doctor")}
          >
            诊断检查
          </button>
          <button
            className={activeTab === "general" ? "active" : ""}
            onClick={() => setActiveTab("general")}
          >
            通用设置
          </button>
        </div>

        <div className="settings-content">
          {activeTab === "models" && (
            <div className="settings-section">
              <h3>模型提供商配置</h3>
              <p className="settings-desc">
                配置 API 密钥和端点。API Key 仅存储在本地 ~/.darwin/agent/auth.json 中。
              </p>

              {providerFields.map((provider) => {
                const config = modelsConfig[provider.id] || {};
                const auth = authConfig[provider.id] || { key: "" };
                const isEnabled = !!config.baseUrl;

                return (
                  <div key={provider.id} className={`provider-card ${isEnabled ? "enabled" : ""}`}>
                    <div className="provider-header">
                      <label className="provider-toggle">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateProvider(provider.id, "baseUrl", provider.defaultUrl);
                              updateProvider(provider.id, "api", "openai-completions");
                              updateProvider(provider.id, "authHeader", true);
                              updateProvider(provider.id, "models", provider.defaultModels.map((id) => ({ id })));
                            } else {
                              setModelsConfig((prev) => {
                                const next = { ...prev };
                                delete next[provider.id];
                                return next;
                              });
                            }
                          }}
                        />
                        <span className="provider-name">{provider.name}</span>
                      </label>
                    </div>

                    {isEnabled && (
                      <div className="provider-fields">
                        <div className="field-row">
                          <label>Base URL</label>
                          <input
                            type="text"
                            value={config.baseUrl || ""}
                            onChange={(e) => updateProvider(provider.id, "baseUrl", e.target.value)}
                            placeholder={provider.defaultUrl}
                          />
                        </div>
                        <div className="field-row">
                          <label>API Key</label>
                          <input
                            type="password"
                            value={auth.key || ""}
                            onChange={(e) => updateApiKey(provider.id, e.target.value)}
                            placeholder="sk-..."
                          />
                        </div>
                        <div className="field-row">
                          <label>模型列表</label>
                          <div className="model-tags">
                            {(config.models || []).map((m) => (
                              <span key={m.id} className="model-tag">{m.id}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="settings-actions">
                <button className="btn-primary" onClick={saveModelsConfig}>
                  保存模型配置
                </button>
                {saveStatus && <span className="save-status">{saveStatus}</span>}
              </div>
            </div>
          )}

          {activeTab === "doctor" && (
            <div className="settings-section">
              <h3>环境诊断</h3>
              <p className="settings-desc">
                检查 Darwin 运行所需的依赖和环境配置。
              </p>

              <button
                className="btn-primary"
                onClick={runDoctor}
                disabled={isRunningDoctor}
              >
                {isRunningDoctor ? "检查中..." : "运行诊断"}
              </button>

              {doctorResults.length > 0 && (
                <div className="doctor-results">
                  {doctorResults.map((check) => (
                    <div key={check.name} className={`doctor-check doctor-${check.status}`}>
                      <span className="doctor-icon">
                        {check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌"}
                      </span>
                      <div className="doctor-info">
                        <span className="doctor-name">{check.name}</span>
                        <span className="doctor-message">{check.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "general" && (
            <div className="settings-section">
              <h3>通用设置</h3>
              <p className="settings-desc">
                修改 ~/.darwin/agent/settings.json 中的全局配置。
              </p>

              <div className="field-row">
                <label>默认模型</label>
                <input
                  type="text"
                  value={(settings.defaultModel as string) || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, defaultModel: e.target.value }))
                  }
                  placeholder="deepseek-v4-pro"
                />
              </div>

              <div className="field-row">
                <label>默认提供商</label>
                <input
                  type="text"
                  value={(settings.defaultProvider as string) || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, defaultProvider: e.target.value }))
                  }
                  placeholder="deepseek"
                />
              </div>

              <div className="field-row">
                <label>思考级别</label>
                <select
                  value={(settings.defaultThinkingLevel as string) || "medium"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, defaultThinkingLevel: e.target.value }))
                  }
                >
                  <option value="low">低 (Low)</option>
                  <option value="medium">中 (Medium)</option>
                  <option value="high">高 (High)</option>
                </select>
              </div>

              <div className="settings-actions">
                <button className="btn-primary" onClick={saveSettings}>
                  保存设置
                </button>
                {saveStatus && <span className="save-status">{saveStatus}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
