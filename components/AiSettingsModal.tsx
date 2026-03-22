import React from 'react';
import { Settings, X, Key, Brain, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { AIProvider } from '../services/geminiService';

interface AiSettingsModalProps {
  show: boolean;
  onClose: () => void;
  aiProvider: AIProvider;
  setAiProvider: (val: AIProvider) => void;
  apiKeys: { gemini: string; deepseek: string };
  setApiKeys: React.Dispatch<React.SetStateAction<{ gemini: string; deepseek: string }>>;
}

const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  show,
  onClose,
  aiProvider,
  setAiProvider,
  apiKeys,
  setApiKeys
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[450px] transform transition-all scale-100 border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600"/> AI 模型配置
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="space-y-6">
          {/* API Keys Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Key className="w-3 h-3"/> 1. 输入 API Key (必填)
            </h4>
            
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Gemini API Key</label>
              <input 
                type="password" 
                value={apiKeys.gemini}
                onChange={(e) => setApiKeys(prev => ({...prev, gemini: e.target.value}))}
                placeholder="AIzaSy..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">DeepSeek API Key</label>
              <input 
                type="password" 
                value={apiKeys.deepseek}
                onChange={(e) => setApiKeys(prev => ({...prev, deepseek: e.target.value}))}
                placeholder="sk-..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* Model Selection Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <Brain className="w-3 h-3"/> 2. 选择当前使用的模型
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setAiProvider('gemini')}
                disabled={!apiKeys.gemini}
                className={clsx(
                  "py-3 rounded-xl border text-sm font-bold transition-all relative overflow-hidden", 
                  aiProvider === 'gemini' 
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  !apiKeys.gemini && "opacity-50 cursor-not-allowed bg-slate-100"
                )}
              >
                Gemini 2.5 Flash
                {!apiKeys.gemini && <span className="block text-[10px] font-normal text-red-500 mt-0.5">(需输入 Key)</span>}
              </button>
              <button 
                onClick={() => setAiProvider('deepseek')}
                disabled={!apiKeys.deepseek}
                className={clsx(
                  "py-3 rounded-xl border text-sm font-bold transition-all relative overflow-hidden", 
                  aiProvider === 'deepseek' 
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  !apiKeys.deepseek && "opacity-50 cursor-not-allowed bg-slate-100"
                )}
              >
                DeepSeek V3
                {!apiKeys.deepseek && <span className="block text-[10px] font-normal text-red-500 mt-0.5">(需输入 Key)</span>}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3"/>
              只有输入了对应 Key 的模型才能被选中。
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSettingsModal;
