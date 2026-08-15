/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Origin, Destination, CostMatrix, CaseStudy } from './types';
import { CLASSIC_CASES } from './data/cases';
import {
  solveTransportationSimplex,
  checkBalance,
  getBalancedMatrix,
} from './utils/transportationAlgorithms';

import { Header, TabType } from './components/Header';
import { ModelTopologyView } from './components/ModelTopologyView';
import { MatrixSandbox } from './components/MatrixSandbox';
import { InitialFeasibleView } from './components/InitialFeasibleView';
import { TableauSolverView } from './components/TableauSolverView';
import { ClassicCasesView } from './components/ClassicCasesView';
import { CodeEngineView } from './components/CodeEngineView';
import { AiInsightView } from './components/AiInsightView';
import { KnowledgeGuideView } from './components/KnowledgeGuideView';
import { ExportReportView } from './components/ExportReportView';

import { BookOpen, X } from 'lucide-react';

export default function App() {
  const defaultCase = CLASSIC_CASES[0];

  const [activeTab, setActiveTab] = useState<TabType>('model');
  const [origins, setOrigins] = useState<Origin[]>(defaultCase.origins);
  const [destinations, setDestinations] = useState<Destination[]>(defaultCase.destinations);
  const [costMatrix, setCostMatrix] = useState<CostMatrix>(defaultCase.costMatrix);
  const [currentCase, setCurrentCase] = useState<CaseStudy | null>(defaultCase);

  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(false);

  // Compute balance status
  const { isBalanced, totalSupply, totalDemand } = checkBalance(origins, destinations);

  // Compute solver result for current matrix
  const solverResult = solveTransportationSimplex(origins, destinations, costMatrix, 'vogel');

  // One-click Auto Balance matrix
  const handleBalanceMatrix = () => {
    const balanced = getBalancedMatrix(origins, destinations, costMatrix);
    setOrigins(balanced.origins);
    setDestinations(balanced.destinations);
    setCostMatrix(balanced.costMatrix);
  };

  // Load a case study
  const handleLoadCase = (caseStudy: CaseStudy) => {
    setOrigins(caseStudy.origins);
    setDestinations(caseStudy.destinations);
    setCostMatrix(caseStudy.costMatrix);
    setCurrentCase(caseStudy);
    setIsCaseModalOpen(false);
    setActiveTab('tableau');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation & Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBalanced={isBalanced}
        totalSupply={totalSupply}
        totalDemand={totalDemand}
        onBalanceMatrix={handleBalanceMatrix}
        onOpenCaseModal={() => setIsCaseModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {activeTab === 'model' && (
          <ModelTopologyView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            allocation={solverResult.finalAllocation}
          />
        )}

        {activeTab === 'sandbox' && (
          <MatrixSandbox
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            allocation={solverResult.finalAllocation}
            onChangeOrigins={setOrigins}
            onChangeDestinations={setDestinations}
            onChangeCostMatrix={setCostMatrix}
            onBalanceMatrix={handleBalanceMatrix}
          />
        )}

        {activeTab === 'initial' && (
          <InitialFeasibleView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
          />
        )}

        {activeTab === 'tableau' && (
          <TableauSolverView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            currentCase={currentCase}
            onLoadCase={handleLoadCase}
          />
        )}

        {activeTab === 'cases' && (
          <ClassicCasesView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            currentCaseId={currentCase?.id}
            onLoadCase={handleLoadCase}
            onApplyVariant={(newO, newD, newC, variantCase) => {
              setOrigins(newO);
              setDestinations(newD);
              setCostMatrix(newC);
              if (variantCase) {
                setCurrentCase(variantCase);
                setActiveTab('tableau');
              }
            }}
          />
        )}

        {activeTab === 'code_engine' && (
          <CodeEngineView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            currentCase={currentCase}
            onLoadCase={handleLoadCase}
          />
        )}

        {activeTab === 'ai_insight' && (
          <AiInsightView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            allocation={solverResult.finalAllocation}
          />
        )}

        {activeTab === 'knowledge' && <KnowledgeGuideView />}

        {activeTab === 'export' && (
          <ExportReportView
            origins={origins}
            destinations={destinations}
            costMatrix={costMatrix}
            allocation={solverResult.finalAllocation}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>运输问题与表上作业法实验室 (Transportation Problem Lab)</div>
          <div>Operations Research &amp; Logistics Network Optimization Workbench</div>
        </div>
      </footer>

      {/* Case Selector Modal */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                选择并加载运筹经典案例
              </h3>
              <button
                onClick={() => setIsCaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {CLASSIC_CASES.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    handleLoadCase(item);
                    setActiveTab('tableau');
                  }}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{item.description}</div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                    一键使用
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
