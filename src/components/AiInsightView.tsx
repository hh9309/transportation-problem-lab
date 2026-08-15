import React, { useState, useEffect } from 'react';
import { Origin, Destination, CostMatrix, AllocationMatrix } from '../types';
import { calculateTotalCost, checkBalance } from '../utils/transportationAlgorithms';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  TrendingDown,
  ShieldAlert,
  Cpu,
  Lightbulb,
  Settings,
  Eye,
  EyeOff,
  Check,
  Send,
  MessageSquare,
  Bot,
  User,
  Trash2,
  Key,
  HelpCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AiInsightViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  allocation: AllocationMatrix;
}

export type LLMModelType = 'gemini-3.6-flash' | 'deepseek-v4-pro';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export const AiInsightView: React.FC<AiInsightViewProps> = ({
  origins,
  destinations,
  costMatrix,
  allocation,
}) => {
  // State for LLM Settings
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('llm_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<LLMModelType>(
    () => (localStorage.getItem('llm_selected_model') as LLMModelType) || 'gemini-3.6-flash'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>(apiKey);
  const [tempModel, setTempModel] = useState<LLMModelType>(selectedModel);

  // Diagnosis State
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Chat Conversation State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('llm_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'init-msg',
        sender: 'assistant',
        content:
          '您好！我是您的 AI 运筹学与供应链优化助手。我已经加载了您当前的运价与运量分配矩阵。您可以随时向我提问关于运输问题、MODI位势法、闭回路调整或供应链降本策略的问题。',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: '系统内置',
      },
    ];
  });
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);

  const { isBalanced, totalSupply, totalDemand } = checkBalance(origins, destinations);
  const totalCost = calculateTotalCost(allocation, costMatrix);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem('llm_chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Open settings handler
  const handleOpenSettings = () => {
    setTempApiKey(apiKey);
    setTempModel(selectedModel);
    setIsSettingsOpen(true);
  };

  // Confirm settings
  const handleSaveSettings = () => {
    setApiKey(tempApiKey.trim());
    setSelectedModel(tempModel);
    localStorage.setItem('llm_api_key', tempApiKey.trim());
    localStorage.setItem('llm_selected_model', tempModel);
    setIsSettingsOpen(false);
    setAiError(null);
  };

  // Build Context Prompt from current matrix
  const buildContextPrompt = () => {
    const matrixInfo = {
      origins: origins.map((o) => `${o.name}(供应:${o.supply})`).join(', '),
      destinations: destinations.map((d) => `${d.name}(需求:${d.demand})`).join(', '),
      costMatrix,
      allocation,
      totalCost,
      isBalanced,
      totalSupply,
      totalDemand,
    };

    return `你是专业运筹学与供应链网络优化专家。当前用户实验室中的运输网络数据如下：
- 产地列表: ${matrixInfo.origins}
- 销地列表: ${matrixInfo.destinations}
- 单位运价矩阵 C_ij: ${JSON.stringify(costMatrix)}
- 当前调运方案矩阵 X_ij: ${JSON.stringify(allocation)}
- 运调总成本: ¥${totalCost}
- 产销平衡状态: ${isBalanced ? '产销平衡' : `不平衡 (总供应 ${totalSupply}, 总需求 ${totalDemand})`}`;
  };

  // Direct Browser Client-Side Call to LLM API
  const callLLM = async (userPrompt: string): Promise<string> => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      throw new Error('所有大模型调用必须输入 API-Key 后才能调用！请在设置弹窗中输入您的 API Key。');
    }

    const context = buildContextPrompt();

    if (selectedModel === 'gemini-3.6-flash') {
      // Call Google Gemini REST API directly in browser
      const systemInstruction = '你是一位专业的运筹学教授与物流供应链优化专家，回答必须严谨、清晰、具洞察力。';
      const prompt = `${context}\n\n【用户问题/指令】:\n${userPrompt}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Gemini API 调用失败 (HTTP ${res.status})，请检查 API Key 是否有效。`
        );
      }

      const data = await res.json();
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResult) {
        throw new Error('Gemini API 未返回有效内容。');
      }
      return textResult;
    } else {
      // Call DeepSeek REST API directly in browser (OpenAI Compatible)
      const url = 'https://api.deepseek.com/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                '你是一位精通运筹学、表上作业法与物流网络优化的专家助手。回答请条理清晰，深入浅出。',
            },
            {
              role: 'user',
              content: `${context}\n\n【用户问题/指令】:\n${userPrompt}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `DeepSeek API 调用失败 (HTTP ${res.status})，请检查 API Key 是否正确。`
        );
      }

      const data = await res.json();
      const textResult = data.choices?.[0]?.message?.content;
      if (!textResult) {
        throw new Error('DeepSeek API 未返回有效文本。');
      }
      return textResult;
    }
  };

  // Trigger Full AI Diagnosis
  const handleRunAIDiagnosis = async () => {
    if (!apiKey) {
      setAiError('所有大模型调用必须输入 API-Key 后才能调用！请点击右上角齿轮设置输入 API Key。');
      setIsSettingsOpen(true);
      return;
    }

    setIsLoadingAI(true);
    setAiError(null);

    const diagnosisPrompt = `请对当前运输矩阵执行深度运筹诊断：
1. 【成本与方案评估】：分析当前调运方案 X_ij (总成本 ¥${totalCost}) 是否已达全局最优，或存在哪些改进方向。
2. 【瓶颈干线与敏感度】：识别哪几条干线的单位运价对总成本最敏感，若遭遇运输封锁该如何调整。
3. 【产销平衡与阴影开销】：基于当前产销状态，说明设立虚拟节点对边际效益的影响。
4. 【行动优化建议】：给出 3 条具体可行的物流网络调整策略。`;

    try {
      const resultText = await callLLM(diagnosisPrompt);
      setAiDiagnosis(resultText);
    } catch (err: any) {
      setAiError(err.message || '诊断生成失败，请确认 API Key 并重试。');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Handle Q&A Chat Submit
  const handleSendQuestion = async (customText?: string) => {
    const query = (customText || inputQuestion).trim();
    if (!query) return;

    if (!apiKey) {
      setAiError('所有大模型调用必须输入 API-Key 后才能调用！请点击右上角齿轮设置输入 API Key。');
      setIsSettingsOpen(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsAsking(true);

    try {
      const answerText = await callLLM(query);
      const aiMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        content: `❌ 调用失败: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">7. AI 供应链与运力洞察 (AI Insights)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                基于前沿大模型算法深度剖析当前运输网络瓶颈、降本空间与影子价格 (Shadow Price)。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Model & Key Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{apiKey ? `${selectedModel}` : '未设置 API Key'}</span>
              {apiKey ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 ml-1" />
              )}
            </div>

            {/* Gear Settings Button */}
            <button
              onClick={handleOpenSettings}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
              title="设置大模型与 API Key"
            >
              <Settings className="w-4 h-4 text-indigo-300" />
            </button>

            {/* Run Diagnosis Button */}
            <button
              onClick={handleRunAIDiagnosis}
              disabled={isLoadingAI}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition shrink-0"
            >
              {isLoadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 诊断分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span>一键触发 AI 运力诊断</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time metrics overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 font-mono text-xs">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">运调总运费</span>
            <span className="text-base font-bold text-emerald-400">¥{totalCost}</span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">产销平衡性</span>
            <span className="text-base font-bold text-indigo-400">
              {isBalanced ? '完美平衡' : `不平衡 (差额 ${Math.abs(totalSupply - totalDemand)})`}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">产地供给能力</span>
            <span className="text-base font-bold text-slate-200">{totalSupply} 单位</span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">销地需求总量</span>
            <span className="text-base font-bold text-slate-200">{totalDemand} 单位</span>
          </div>
        </div>
      </div>

      {/* Quick Presets Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
            <TrendingDown className="w-4 h-4 text-indigo-600" />
            <span>降本空间挖掘</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            AI 通过检验数与位势对非基变量进行影子开销核算，识别运价下降敏感区间。
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>瓶颈干线预警</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            自动捕捉承载负荷过高的运输干线，对运价波动敏感度较高的线路发布风险提示。
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
            <Lightbulb className="w-4 h-4 text-emerald-600" />
            <span>供应链弹性建议</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            若产销不平衡，计算虚拟仓设立对物流成本及安全库存缓冲的边际效益。
          </p>
        </div>
      </div>

      {/* AI Diagnostic Report Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Cpu className="w-4 h-4 text-indigo-600" />
          AI 诊断报告输出 (Diagnostic Report)
        </h3>

        {aiError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{aiError}</span>
            </div>
            <button
              onClick={handleOpenSettings}
              className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold shrink-0 hover:bg-red-500"
            >
              配置 API Key
            </button>
          </div>
        )}

        {aiDiagnosis ? (
          <div className="bg-slate-950 text-slate-100 p-6 rounded-2xl border border-slate-800 text-xs leading-relaxed font-sans whitespace-pre-wrap shadow-inner">
            {aiDiagnosis}
          </div>
        ) : !isLoadingAI ? (
          <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500">
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold text-slate-700">暂未生成 AI 运力诊断报告</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              输入 API Key 后点击右上角“一键触发 AI 运力诊断”按钮，大模型将深度分析您的物流矩阵并出具报告。
            </p>
          </div>
        ) : null}
      </div>

      {/* Interactive Q&A Conversation Box (大模型回答问题对话框) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              大模型问答对话框 (Interactive Q&amp;A Workspace)
            </h3>
          </div>
          <button
            onClick={() => {
              setChatMessages([]);
              localStorage.removeItem('llm_chat_history');
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-red-600 text-xs transition"
            title="清空对话记录"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空记录</span>
          </button>
        </div>

        {/* Quick Question Preset Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> 快捷提问:
          </span>
          {[
            '分析当前运力分配中的主要成本瓶颈',
            '比较伏格尔法(Vogel)与最小元素法的求解效益',
            '若某条运输干线突发封锁，应如何调整矩阵？',
            '解释MODI位势法中检验数的物理含义与位势原理',
          ].map((q, idx) => (
            <button
              key={`preset-q-${idx}`}
              onClick={() => handleSendQuestion(q)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200 transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Conversation Feed */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[420px] overflow-y-auto space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              对话框为空，请输入问题与 AI 运筹模型展开交互。
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs whitespace-pre-wrap font-sans'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 opacity-80 text-[10px] font-mono">
                    <span>{msg.sender === 'user' ? '您' : `AI 助手 (${msg.modelUsed || selectedModel})`}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div>{msg.content}</div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isAsking && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>大模型思考与推导中 ({selectedModel})...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendQuestion();
              }
            }}
            placeholder="输入您对运输算法、运价矩阵或供应链优化的疑问..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />

          <button
            onClick={() => handleSendQuestion()}
            disabled={isAsking || !inputQuestion.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送</span>
          </button>
        </div>
      </div>

      {/* LLM API Key & Model Config Modal (大模型设置弹窗) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  大模型 API Key 及模型配置
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Manual API Key Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  1. 手工输入 API-Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeyInput ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="例如: AIzaSy... 或 sk-..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs pr-10 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  支持 Google Gemini API Key 或 DeepSeek API Key。项目部署在 GitHub Pages 等客户端，API Key 仅存于您本地浏览器。
                </p>
              </div>

              {/* 2. Model Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  2. 选择大模型 (Choose Model)
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  <div
                    onClick={() => setTempModel('gemini-3.6-flash')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      tempModel === 'gemini-3.6-flash'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>gemini-3.6-flash</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Google 深度生成模型，超高速运筹解析与长文本推理
                      </div>
                    </div>
                    {tempModel === 'gemini-3.6-flash' && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>

                  <div
                    onClick={() => setTempModel('deepseek-v4-pro')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      tempModel === 'deepseek-v4-pro'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        <span>deepseek-v4-pro</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        DeepSeek 高阶运筹数学推理架构，极佳中文逻辑解答
                      </div>
                    </div>
                    {tempModel === 'deepseek-v4-pro' && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>注意：</strong>所有大模型调用必须输入有效的 API-Key 后才能触发，且每次推理在浏览器端直接发起跨域安全请求，极速响应。
              </div>
            </div>

            {/* 3. Confirm Model Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>确认并保存大模型配置</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
