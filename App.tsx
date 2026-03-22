import React, { useState, useEffect, useRef } from 'react';
import Tableau from './components/Tableau';
import MathModel from './components/MathModel';
import HistoryModule from './components/HistoryModule';
import AiAssistant from './components/AiAssistant';
import AiSettingsModal from './components/AiSettingsModal';
import ProblemConfig from './components/ProblemConfig';
import { ProblemState, SolverState, LogEntry } from './types';
import { solveLeastCost, calculatePotentials, calculateOpportunityCosts, findLoop, applyPivot, generateRandomProblem, createEmptyGrid, calculateTotalCost, isProblemBalanced } from './utils/solver';
import { sendMessageToAI, AIProvider, ChatMessage } from './services/geminiService';
import { Play, RotateCcw, Brain, CheckCircle, ArrowRight, Settings, Activity, List, Calculator, Minus, Plus, FastForward, Zap, Send, MessageSquare, Bot, X, Key, AlertCircle, Sigma, Route, FileText } from 'lucide-react';
import clsx from 'clsx';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  // --- Configuration State ---
  const [config, setConfig] = useState({ rows: 3, cols: 4 });

  // --- AI Settings State ---
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  // Store separate keys for each provider
  const [apiKeys, setApiKeys] = useState<{ gemini: string; deepseek: string }>({
    gemini: '',
    deepseek: ''
  });
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Problem State ---
  const [problem, setProblem] = useState<ProblemState | null>(null);

  const [solver, setSolver] = useState<SolverState>({
    grid: [], u: [], v: [], totalCost: 0,
    status: 'input', message: "请配置问题规模", stepDescription: "选择产地和销地数量，生成平衡型运输问题。", iteration: 0
  });

  const [history, setHistory] = useState<LogEntry[]>([]);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loadingAi]);

  // Auto Solve Effect
  useEffect(() => {
    let timer: number;
    if (isAutoSolving && solver.status === 'ready') {
      timer = window.setTimeout(() => { handleNextIteration(); }, 500); 
    } else if (solver.status === 'optimal') {
      setIsAutoSolving(false);
    }
    return () => clearTimeout(timer);
  }, [isAutoSolving, solver.status]);

  // --- Actions ---

  const addLog = (iter: number, phase: string, desc: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', cost?: number) => {
    setHistory(prev => [...prev, {
      id: Date.now(), iteration: iter, phase, description: desc, cost: cost ?? solver.totalCost, type
    }]);
  };

  const handleGenerate = () => {
    setIsAutoSolving(false);
    const newProblem = generateRandomProblem(config.rows, config.cols);
    setProblem(newProblem);
    const emptyGrid = createEmptyGrid(newProblem.rowCount, newProblem.colCount, newProblem.costs);

    setSolver({
      grid: emptyGrid, u: new Array(newProblem.rowCount).fill(null), v: new Array(newProblem.colCount).fill(null),
      totalCost: 0, status: 'input', message: "运输表已构建",
      stepDescription: "请确认单位运价、产量和销量。点击“开始求解”以使用最小元素法生成初始基可行解。", iteration: 0
    });
    setHistory([]);
    setChatMessages([]); // Reset chat on new problem
  };

  const handleStart = () => {
    if (!problem) return;
    const initialGrid = solveLeastCost(problem);
    const cost = calculateTotalCost(initialGrid);
    const newState: SolverState = {
      grid: initialGrid, u: new Array(problem.rowCount).fill(null), v: new Array(problem.colCount).fill(null),
      totalCost: cost, status: 'ready', message: "初始基可行解 (IBFS)",
      stepDescription: "最小元素法：优先分配运价最低的路径。这是第一次迭代的起点。", iteration: 1
    };
    setSolver(newState);
    addLog(1, "初始化", "生成初始可行解 (最小元素法)", 'info', cost);
  };

  const handleNextStep = () => {
    if (!problem || isProcessing || solver.status === 'optimal') return;
    setSolver(prev => {
      let nextState = { ...prev };
      switch (prev.status) {
        case 'ready':
          const { u, v } = calculatePotentials(prev.grid, problem.rowCount, problem.colCount);
          nextState.u = u; nextState.v = v; nextState.status = 'potentials';
          nextState.message = `迭代 ${prev.iteration}: 计算位势`;
          nextState.stepDescription = `根据基变量满足 u_i + v_j = c_ij 的条件，求解各行各列的位势。`;
          return nextState;
        case 'potentials':
          const { grid: g1, minDelta, enteringCell } = calculateOpportunityCosts(prev.grid, prev.u, prev.v);
          if (minDelta >= 0) {
            nextState.grid = g1; nextState.status = 'optimal'; nextState.message = "最优解达成！";
            nextState.stepDescription = "所有非基变量检验数 Δ_ij ≥ 0，无法继续优化。";
            addLog(prev.iteration, "检验", "所有检验数 ≥ 0，达到最优", 'success', prev.totalCost);
          } else {
            if (enteringCell) g1[enteringCell.r][enteringCell.c].highlight = 'entering';
            nextState.grid = g1; nextState.status = 'deltas';
            nextState.message = `迭代 ${prev.iteration}: 检验非优`;
            nextState.stepDescription = `发现最小检验数 ${minDelta} (小于0)。选定该单元格为调入变量，需要调整运输方案。`;
            addLog(prev.iteration, "检验", `发现负检验数 ${minDelta}，需优化`, 'warning');
          }
          return nextState;
        case 'deltas':
          let en = { r: -1, c: -1 };
          prev.grid.forEach(r => r.forEach(c => { if (c.highlight === 'entering') en = { r: c.row, c: c.col }; }));
          const loop = findLoop(en, prev.grid);
          if (loop) {
            const g2 = prev.grid.map(r => r.map(c => ({...c})));
            loop.forEach((node, idx) => { if (idx > 0) g2[node.r][node.c].highlight = idx % 2 === 0 ? 'loop-plus' : 'loop-minus'; });
            nextState.grid = g2; nextState.status = 'loop'; nextState.message = `迭代 ${prev.iteration}: 构建闭回路`;
            nextState.stepDescription = "找到闭回路。偶数点(+)增加运量，奇数点(-)减少运量。计算调整量 θ。";
          }
          return nextState;
        case 'loop':
          let en2 = { r: -1, c: -1 };
          prev.grid.forEach(r => r.forEach(c => { if (c.highlight === 'entering') en2 = { r: c.row, c: c.col }; }));
          const loop2 = findLoop(en2, prev.grid);
          if (loop2) {
             const { newGrid, theta } = applyPivot(prev.grid, loop2);
             const newCost = calculateTotalCost(newGrid);
             const clean = newGrid.map(r => r.map(c => ({ ...c, opportunityCost: undefined, highlight: 'none' as const })));
             nextState.grid = clean; nextState.totalCost = newCost;
             nextState.u = new Array(problem.rowCount).fill(null); nextState.v = new Array(problem.colCount).fill(null);
             nextState.status = 'ready'; nextState.iteration = prev.iteration + 1;
             nextState.message = `迭代 ${prev.iteration + 1}: 调整完成，准备检验`;
             nextState.stepDescription = `调整运量 θ=${theta}，总运费更新为 ¥${newCost}。现在点击“下一步”开始计算新方案的位势和检验数。`;
             addLog(prev.iteration, "调整", `调整运量 θ=${theta}，运费降至 ${newCost}`, 'info', newCost);
          }
          return nextState;
        default: return prev;
      }
    });
  };

  const handleNextIteration = async () => {
    if (!problem || isProcessing || solver.status === 'optimal') return;
    setIsProcessing(true);
    try {
        const currentGrid = solver.grid;
        const currentIteration = solver.iteration;

        const { u, v } = calculatePotentials(currentGrid, problem.rowCount, problem.colCount);
        setSolver(prev => ({ ...prev, u, v, status: 'potentials', message: `迭代 ${currentIteration}: 计算位势`, stepDescription: "根据基变量计算行位势 u 和列位势 v。" }));
        await delay(1000);

        const { grid: g1, minDelta, enteringCell } = calculateOpportunityCosts(currentGrid, u, v);
        if (minDelta >= 0) {
            setSolver(prev => ({ ...prev, grid: g1, status: 'optimal', message: "最优解达成！", stepDescription: "所有非基变量检验数 ≥ 0。", totalCost: calculateTotalCost(g1) }));
            addLog(currentIteration, "检验", "所有检验数 ≥ 0，达到最优", 'success', calculateTotalCost(g1));
            return;
        }

        let loopToDisplay = null;
        let gridWithLoop = g1;
        if (enteringCell) {
            g1[enteringCell.r][enteringCell.c].highlight = 'entering';
            loopToDisplay = findLoop(enteringCell, g1);
            if (loopToDisplay) {
                gridWithLoop = g1.map(row => row.map(cell => ({...cell})));
                loopToDisplay.forEach((node, idx) => { if (idx > 0) gridWithLoop[node.r][node.c].highlight = idx % 2 === 0 ? 'loop-plus' : 'loop-minus'; });
            }
        }
        setSolver(prev => ({ ...prev, grid: gridWithLoop, status: 'loop', message: `迭代 ${currentIteration}: 寻找闭回路`, stepDescription: `最小检验数 Δ=${minDelta}。构建闭回路准备调整。` }));
        await delay(1000);

        if (loopToDisplay) {
            const { newGrid, theta } = applyPivot(gridWithLoop, loopToDisplay);
            const clean = newGrid.map(row => row.map(c => ({ ...c, opportunityCost: undefined, highlight: 'none' as const })));
            const newCost = calculateTotalCost(clean);
            setSolver(prev => ({
                ...prev, grid: clean, u: new Array(problem.rowCount).fill(null), v: new Array(problem.colCount).fill(null),
                status: 'ready', iteration: currentIteration + 1, totalCost: newCost,
                message: `迭代 ${currentIteration + 1}: 调整完成`, stepDescription: `调整量 θ=${theta}，运费降至 ¥${newCost}。`
            }));
            addLog(currentIteration, "调整", `调整运量 θ=${theta}，运费降至 ${newCost}`, 'info', newCost);
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAutoSolve = () => { setIsAutoSolving(true); if (solver.status === 'input') handleStart(); };

  const handleUpdateCost = (r: number, c: number, cost: number) => {
    if (!problem) return;
    const newCosts = [...problem.costs];
    newCosts[r] = [...newCosts[r]];
    newCosts[r][c] = cost;
    setProblem({ ...problem, costs: newCosts });
    setSolver(prev => {
      const newGrid = [...prev.grid];
      newGrid[r] = [...newGrid[r]];
      newGrid[r][c] = { ...newGrid[r][c], cost };
      return { ...prev, grid: newGrid };
    });
  };

  const handleUpdateSupply = (r: number, val: number) => {
    if (!problem) return;
    const newSupply = [...problem.supply];
    newSupply[r] = val;
    setProblem({ ...problem, supply: newSupply, initialSupply: [...newSupply] });
  };

  const handleUpdateDemand = (c: number, val: number) => {
    if (!problem) return;
    const newDemand = [...problem.demand];
    newDemand[c] = val;
    setProblem({ ...problem, demand: newDemand, initialDemand: [...newDemand] });
  };

  const isBalanced = problem ? isProblemBalanced(problem.supply, problem.demand) : true;
  const totalSupply = problem?.supply.reduce((a, b) => a + b, 0) || 0;
  const totalDemand = problem?.demand.reduce((a, b) => a + b, 0) || 0;

  // --- AI Logic ---
  const handleSendMessage = async (customText?: string) => {
    const text = customText || userInput;
    if (!text.trim()) return;

    // VALIDATION: Check if the CURRENT provider has a key
    const currentKey = apiKeys[aiProvider];
    if (!currentKey) {
        // Force open settings if key is missing
        setShowAiSettings(true);
        // We can add a temporary system message to chat to guide them
        setChatMessages(prev => [...prev, { 
            role: 'model', 
            content: `请先在设置中配置 ${aiProvider === 'gemini' ? 'Gemini' : 'DeepSeek'} 的 API Key，然后才能使用 AI 功能。` 
        }]);
        return;
    }

    setLoadingAi(true);
    const newMsg: ChatMessage = { role: 'user', content: text };
    const updatedHistory = [...chatMessages, newMsg];
    setChatMessages(updatedHistory);
    setUserInput('');

    try {
      // Pass the specific key for the active provider
      const response = await sendMessageToAI(aiProvider, currentKey, updatedHistory, problem ? solver : null);
      setChatMessages([...updatedHistory, { role: 'model', content: response }]);
    } catch (e: any) {
      setChatMessages([...updatedHistory, { role: 'model', content: `错误: ${e.message}` }]);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleExplainStep = () => {
    handleSendMessage(`请解释当前步骤（迭代 ${solver.iteration} - ${solver.status}）。`);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Activity className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transportation Problem AI Lab</h1>
              <p className="text-xs text-slate-500 font-medium">运筹学运输问题求解系统</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-6 grid grid-cols-12 gap-6">
        
        {/* LEFT: Config & History */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 max-h-[calc(100vh-100px)] lg:sticky lg:top-24">
           <ProblemConfig 
             problem={problem}
             config={config}
             setConfig={setConfig}
             handleGenerate={handleGenerate}
             solver={solver}
             isBalanced={isBalanced}
             totalSupply={totalSupply}
             totalDemand={totalDemand}
             handleStart={handleStart}
             handleNextStep={handleNextStep}
             handleNextIteration={handleNextIteration}
             handleAutoSolve={handleAutoSolve}
             isAutoSolving={isAutoSolving}
             setIsAutoSolving={setIsAutoSolving}
             setProblem={setProblem}
             isProcessing={isProcessing}
           />

           {problem && <MathModel problem={problem} />}
        </div>

        {/* CENTER: Tableau */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
           {/* Status Card */}
           <div className="bg-white border-l-4 border-indigo-500 rounded-r-xl shadow-sm p-4 flex items-start gap-4 min-h-[100px]">
              <div className={clsx("p-2 rounded-lg shrink-0", solver.status === 'optimal' ? "bg-green-100 text-green-600" : "bg-indigo-50 text-indigo-600")}>{solver.status === 'optimal' ? <CheckCircle className="w-6 h-6" /> : <Activity className="w-6 h-6" />}</div>
              <div className="flex-1"><div className="flex justify-between items-start"><h3 className="font-bold text-slate-800 text-lg mb-1">{solver.message}</h3></div><p className="text-slate-600 leading-relaxed text-sm">{solver.stepDescription}</p></div>
           </div>

           {/* Tableau Grid */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h3 className="font-bold text-slate-700 flex items-center gap-2">运输表</h3><div className="flex gap-4 text-xs"><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-indigo-100 border border-indigo-300"></div> 基变量</div><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300"></div> 调入</div><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300"></div> 调出</div></div></div>
              <div className="p-4 flex-1 flex items-center justify-center bg-slate-50/30 overflow-auto">{!problem ? <div className="text-center text-slate-400"><Calculator className="w-16 h-16 mx-auto mb-4 opacity-20" /><p>请在左侧配置并生成问题</p></div> : (
                <Tableau 
                  solverState={solver} 
                  problem={problem} 
                  onUpdateCost={handleUpdateCost}
                  onUpdateSupply={handleUpdateSupply}
                  onUpdateDemand={handleUpdateDemand}
                />
              )}</div>
           </div>

           {/* NEW SECTIONS: Formula & Algorithm Hints */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between group hover:border-indigo-200 transition-colors">
                  <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Calculator className="w-4 h-4" /> 当前计算公式
                      </h4>
                      <div className="relative overflow-hidden rounded-xl bg-slate-900 p-4 shadow-inner">
                         <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                            <Sigma className="w-24 h-24 text-white" />
                         </div>
                         <div className="relative z-10">
                            <div className="font-mono text-xs text-slate-400 mb-1">Objective Function</div>
                            <div className="font-mono text-lg font-medium text-white tracking-tight">
                                Total Cost = Σ (x<sub>ij</sub> × c<sub>ij</sub>)
                            </div>
                         </div>
                      </div>
                  </div>
                  <div className="mt-4 flex justify-between items-end">
                      <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-md">Min Z</span>
                      <div className="text-right">
                          <span className="block text-[10px] text-slate-400 mb-0.5">当前总运费</span>
                          <span className="text-xl font-mono font-bold text-indigo-600">¥ {solver.totalCost}</span>
                      </div>
                  </div>
              </div>

              {/* Algorithm Hint Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col group hover:border-indigo-200 transition-colors">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Route className="w-4 h-4" /> 算法提示
                  </h4>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="relative space-y-6 pl-4">
                        {/* Connecting Line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

                        {/* Steps */}
                        <div className="relative flex items-center gap-3">
                           <div className={clsx("w-2.5 h-2.5 rounded-full z-10 outline outline-4 outline-white", ['potentials', 'ready', 'input'].includes(solver.status) ? "bg-indigo-500" : "bg-slate-300")}></div>
                           <div className={clsx("text-xs font-medium transition-colors", ['potentials', 'ready', 'input'].includes(solver.status) ? "text-slate-800" : "text-slate-400")}>
                               每次迭代：先算位势 u, v
                           </div>
                        </div>

                        <div className="relative flex items-center gap-3">
                           <div className={clsx("w-2.5 h-2.5 rounded-full z-10 outline outline-4 outline-white", ['deltas'].includes(solver.status) ? "bg-indigo-500 animate-pulse" : ['loop', 'optimal'].includes(solver.status) ? "bg-indigo-500" : "bg-slate-300")}></div>
                           <div className={clsx("text-xs font-medium transition-colors", ['deltas'].includes(solver.status) ? "text-indigo-600 font-bold" : ['loop', 'optimal'].includes(solver.status) ? "text-slate-800" : "text-slate-400")}>
                               → 算空格检验数 Δ
                           </div>
                        </div>

                        <div className="relative flex items-center gap-3">
                           <div className={clsx("w-2.5 h-2.5 rounded-full z-10 outline outline-4 outline-white", ['loop'].includes(solver.status) ? "bg-indigo-500 animate-pulse" : ['optimal'].includes(solver.status) ? "bg-indigo-500" : "bg-slate-300")}></div>
                           <div className={clsx("text-xs font-medium transition-colors", ['loop'].includes(solver.status) ? "text-indigo-600 font-bold" : ['optimal'].includes(solver.status) ? "text-slate-800" : "text-slate-400")}>
                               → 找最小负 Δ 进基 → 找闭回路
                           </div>
                        </div>
                    </div>
                  </div>
              </div>
           </div>
        </div>

        {/* RIGHT: History & AI Chat */}
        <div className="col-span-12 lg:col-span-3 max-h-[calc(100vh-100px)] lg:sticky lg:top-24 flex flex-col gap-4">
           {problem && (
             <HistoryModule history={history} />
           )}

           <AiAssistant 
             aiProvider={aiProvider}
             chatMessages={chatMessages}
             userInput={userInput}
             setUserInput={setUserInput}
             loadingAi={loadingAi}
             handleSendMessage={handleSendMessage}
             handleExplainStep={handleExplainStep}
             setShowAiSettings={setShowAiSettings}
             chatEndRef={chatEndRef}
             hasProblem={!!problem}
           />
        </div>

        <AiSettingsModal 
          show={showAiSettings}
          onClose={() => setShowAiSettings(false)}
          aiProvider={aiProvider}
          setAiProvider={setAiProvider}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
        />

      </main>
    </div>
  );
};

export default App;