import React from 'react';
import { Brain, Settings, MessageSquare, Bot, Activity, Send } from 'lucide-react';
import clsx from 'clsx';
import { AIProvider, ChatMessage } from '../services/geminiService';

interface AiAssistantProps {
  aiProvider: AIProvider;
  chatMessages: ChatMessage[];
  userInput: string;
  setUserInput: (val: string) => void;
  loadingAi: boolean;
  handleSendMessage: () => void;
  handleExplainStep: () => void;
  setShowAiSettings: (val: boolean) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  hasProblem: boolean;
}

const AiAssistant: React.FC<AiAssistantProps> = ({
  aiProvider,
  chatMessages,
  userInput,
  setUserInput,
  loadingAi,
  handleSendMessage,
  handleExplainStep,
  setShowAiSettings,
  chatEndRef,
  hasProblem
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-slate-200 flex-1 flex flex-col overflow-hidden min-h-[400px]">
      {/* AI Header */}
      <div className="bg-slate-900 p-3 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400"/>
          <div>
            <h3 className="font-bold text-xs">AI 智能助教</h3>
            <div className="text-[9px] text-slate-400 font-mono">
              {aiProvider === 'gemini' ? 'Gemini 2.5 Flash' : 'DeepSeek V3'}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowAiSettings(true)} 
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="AI 设置"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400"/>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
        {chatMessages.length === 0 && (
          <div className="text-center py-6 opacity-50">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-[10px] text-slate-500 leading-relaxed px-4">
              请先在右上角 <Settings className="w-2.5 h-2.5 inline"/> 配置 API Key。
              <br/>
              你可以询问“解释当前步骤”或输入任何运筹学相关问题。
            </p>
          </div>
        )}
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={clsx("flex gap-2 max-w-[92%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold shadow-sm", msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200")}>
              {msg.role === 'user' ? 'U' : <Bot className="w-3 h-3"/>}
            </div>
            <div className={clsx("p-2.5 rounded-xl text-xs leading-relaxed shadow-sm", msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loadingAi && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0"><Activity className="w-2.5 h-2.5 text-indigo-500 animate-spin"/></div>
            <div className="bg-white p-2.5 rounded-xl rounded-tl-none border border-slate-200 text-xs text-slate-400">正在思考...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
        <div className="flex gap-2 mb-2">
          <button 
            onClick={handleExplainStep} 
            disabled={loadingAi || !hasProblem} 
            className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
          >
            解释当前步骤
          </button>
        </div>
        <div className="relative">
          <input 
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="输入您的问题..."
            disabled={loadingAi}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button 
            onClick={() => handleSendMessage()}
            disabled={!userInput.trim() || loadingAi}
            className="absolute right-1 top-1 p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
