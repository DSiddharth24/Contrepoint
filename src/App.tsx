/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  JobRun, 
  PipelineStep, 
  QuerySpec, 
  CandidatePaper, 
  ExtractedClaim, 
  ContradictionReport, 
  ClaimCluster,
  DisagreementType
} from './types';
import ConsoleLogs from './components/ConsoleLogs';
import ManuscriptCard from './components/ManuscriptCard';
import ContradictionSpotlight from './components/ContradictionSpotlight';
import { 
  Search, Sparkles, RefreshCw, Edit3, Save, Check, Trash2, HelpCircle, 
  Dna, Layers, AlertCircle, FileText, Lock, ChevronDown, ChevronUp, X, Sliders, CheckSquare, Square,
  ArrowRight, GitCompare, History, Plus
} from 'lucide-react';

export default function App() {
  const [rawQuery, setRawQuery] = useState('');
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [activeRun, setActiveRun] = useState<JobRun | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [activeTab, setActiveTab] = useState<'scope' | 'search' | 'extract' | 'cluster'>('scope');
  
  // Editing states
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [editedScope, setEditedScope] = useState<QuerySpec>({ subject: '', intervention: '', outcome: '', population_constraints: '' });
  
  const [selectedPapers, setSelectedPapers] = useState<Record<string, boolean>>({});
  
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editedClaim, setEditedClaim] = useState<ExtractedClaim | null>(null);
  
  const [challengingComparisonIndex, setChallengingComparisonIndex] = useState<{ clusterId: string; compIndex: number } | null>(null);
  const [challengedClassification, setChallengedClassification] = useState<DisagreementType>('Noise');
  const [challengedReason, setChallengedReason] = useState('');

  // Expandable accordions for apparent contradictions
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);

  // Spacious UI state overrides
  const [showLogs, setShowLogs] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Load past runs on startup
  useEffect(() => {
    fetchRuns();
  }, []);

  // Poll active run if it's currently processing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (activeRun && (activeRun.status === 'pending' || activeRun.status === 'running' || activeRun.steps[activeRun.currentStep].status === 'running')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/runs/${activeRun.id}`);
          if (res.ok) {
            const updated = await res.json() as JobRun;
            setActiveRun(updated);
            
            // Auto switch active tab based on completed stages
            if (updated.currentStep !== activeRun.currentStep) {
              setActiveTab(updated.currentStep as any);
            }
            
            if (updated.status === 'completed' || updated.status === 'failed') {
              if (interval) clearInterval(interval);
              // Refresh run list
              fetchRuns();
            }
          }
        } catch (e) {
          console.error("Error polling run:", e);
        }
      }, 1200);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeRun?.status, activeRun?.currentStep, activeRun?.id]);

  // Set up forms and active tab when active run changes
  useEffect(() => {
    if (activeRun) {
      if (activeRun.steps.scope.output) {
        setEditedScope(activeRun.steps.scope.output as QuerySpec);
      }
      if (activeRun.steps.search.output) {
        const papers = activeRun.steps.search.output as CandidatePaper[];
        const initialToggles: Record<string, boolean> = {};
        papers.forEach(p => {
          initialToggles[p.id] = true; // Selected by default
        });
        setSelectedPapers(initialToggles);
      }

      // Auto-set the best visible tab for this run
      if (activeRun.steps.cluster.status === 'completed' || activeRun.steps.cluster.status === 'running') {
        setActiveTab('cluster');
        if (activeRun.steps.cluster.status === 'completed' && activeRun.steps.cluster.output) {
          const report = activeRun.steps.cluster.output as ContradictionReport;
          if (report.clusters && report.clusters.length > 0) {
            const firstContradictory = report.clusters.find(c => c.is_contradictory);
            setActiveClusterId(firstContradictory ? firstContradictory.id : report.clusters[0].id);
          }
        }
      } else if (activeRun.steps.extract.status === 'completed' || activeRun.steps.extract.status === 'running') {
        setActiveTab('extract');
      } else if (activeRun.steps.search.status === 'completed' || activeRun.steps.search.status === 'running') {
        setActiveTab('search');
      } else {
        setActiveTab('scope');
      }
    }
  }, [activeRun?.id]);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/runs');
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (e) {
      console.error("Failed to fetch runs:", e);
    } finally {
      setLoadingRuns(false);
    }
  };

  const startNewRun = async (queryText: string) => {
    if (!queryText.trim()) return;
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_query: queryText })
      });
      if (res.ok) {
        const newRun = await res.json() as JobRun;
        setActiveRun(newRun);
        setRawQuery('');
        setActiveTab('scope');
        fetchRuns();
      }
    } catch (e) {
      console.error("Failed to start run:", e);
    }
  };

  const deleteRun = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeRun?.id === id) {
          setActiveRun(null);
        }
        fetchRuns();
      }
    } catch (e) {
      console.error("Failed to delete run:", e);
    }
  };

  // 1. SCOPE STEP RERUN
  const handleSaveScopeAndSearch = async () => {
    if (!activeRun) return;
    try {
      const res = await fetch(`/api/runs/${activeRun.id}/step/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideData: editedScope })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveRun(updated.run);
        setIsEditingScope(false);
        setActiveTab('search');
        addLocalLog('scope', 'success', 'User adjusted Scoped Query Spec parameters. Triggering downstream SEARCH.');
      }
    } catch (e) {
      console.error("Error re-running search step:", e);
    }
  };

  // 2. SEARCH STEP RERUN
  const handleProceedToExtraction = async () => {
    if (!activeRun) return;
    const papers = activeRun.steps.search.output as CandidatePaper[];
    const filteredPapers = papers.filter(p => selectedPapers[p.id]);

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/step/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideData: filteredPapers })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveRun(updated.run);
        setActiveTab('extract');
        addLocalLog('search', 'success', `User refined candidate paper set. Loaded ${filteredPapers.length} targets for claim extraction.`);
      }
    } catch (e) {
      console.error("Error proceeding to extraction:", e);
    }
  };

  // 3. EXTRACT STEP CLAY EDITING
  const startEditingClaim = (claim: ExtractedClaim) => {
    setEditingClaimId(claim.paper_id);
    setEditedClaim({ ...claim });
  };

  const saveEditedClaim = async () => {
    if (!activeRun || !editedClaim) return;
    const claims = activeRun.steps.extract.output as ExtractedClaim[];
    const updatedClaims = claims.map(c => c.paper_id === editedClaim.paper_id ? editedClaim : c);

    // Write updated claims to active run local memory state
    const updatedRun = {
      ...activeRun,
      steps: {
        ...activeRun.steps,
        extract: {
          ...activeRun.steps.extract,
          output: updatedClaims
        }
      }
    };

    try {
      const res = await fetch(`/api/runs/${activeRun.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRun)
      });
      if (res.ok) {
        const saved = await res.json() as JobRun;
        setActiveRun(saved);
        fetchRuns();
      } else {
        setActiveRun(updatedRun);
      }
    } catch (e) {
      console.error("Error saving edited claim to database:", e);
      setActiveRun(updatedRun);
    }

    setEditingClaimId(null);
    setEditedClaim(null);
    addLocalLog('extract', 'info', `Edited quantitative parameters for paper: "${editedClaim.title.substring(0, 30)}..."`);
  };

  const handleProceedToClustering = async () => {
    if (!activeRun) return;
    const claims = activeRun.steps.extract.output as ExtractedClaim[];

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/step/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideData: claims })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveRun(updated.run);
        setActiveTab('cluster');
        addLocalLog('extract', 'success', 'User locked structured claims. Recalculating metabolic clustering matrices.');
      }
    } catch (e) {
      console.error("Error proceeding to clustering:", e);
    }
  };

  // 4. CHALLENGE CLASSIFICATION
  const startChallengeComparison = (clusterId: string, compIndex: number, comp: any) => {
    setChallengingComparisonIndex({ clusterId, compIndex });
    setChallengedClassification(comp.classification);
    setChallengedReason(comp.reason);
  };

  const saveChallenge = async () => {
    if (!activeRun || !challengingComparisonIndex) return;
    const report = activeRun.steps.cluster.output as ContradictionReport;
    
    const updatedClusters = report.clusters.map(cluster => {
      if (cluster.id === challengingComparisonIndex.clusterId) {
        const updatedComparisons = cluster.comparisons.map((comp, idx) => {
          if (idx === challengingComparisonIndex.compIndex) {
            return {
              ...comp,
              classification: challengedClassification,
              reason: challengedReason
            };
          }
          return comp;
        });

        // Re-evaluate if cluster has a genuine contradiction
        const hasContradiction = updatedComparisons.some(c => c.classification === 'Genuine open contradiction');

        return {
          ...cluster,
          comparisons: updatedComparisons,
          is_contradictory: hasContradiction,
          contradiction_type: hasContradiction ? 'Genuine open contradiction' as any : challengedClassification
        };
      }
      return cluster;
    });

    const updatedReport = {
      ...report,
      clusters: updatedClusters
    };

    const updatedRun = {
      ...activeRun,
      report: updatedReport,
      steps: {
        ...activeRun.steps,
        cluster: {
          ...activeRun.steps.cluster,
          output: updatedReport
        }
      }
    };

    try {
      const res = await fetch(`/api/runs/${activeRun.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRun)
      });
      if (res.ok) {
        const saved = await res.json() as JobRun;
        setActiveRun(saved);
        fetchRuns();
      } else {
        setActiveRun(updatedRun);
      }
    } catch (e) {
      console.error("Error saving classification challenge to database:", e);
      setActiveRun(updatedRun);
    }

    setChallengingComparisonIndex(null);
    addLocalLog('cluster', 'success', `User successfully challenged classification mapping. Updated spotlight.`);
  };

  const addLocalLog = (step: PipelineStep, type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    if (!activeRun) return;
    const updatedLogs = [
      ...activeRun.logs,
      { timestamp: new Date().toISOString(), message, step, type }
    ];
    setActiveRun({
      ...activeRun,
      logs: updatedLogs
    });
  };

  const toggleClusterAccordion = (clusterId: string) => {
    setExpandedClusters(prev => ({
      ...prev,
      [clusterId]: !prev[clusterId]
    }));
  };

  const handleSelectComparisonFromMap = (clusterId: string, compIndex: number) => {
    setActiveClusterId(clusterId);
    setChallengingComparisonIndex(null);
  };

  const templates = [
    { label: "Intermittent Fasting & Insulin", query: "Does intermittent fasting improve insulin sensitivity?" },
    { label: "Creatine Loading & Cognition", query: "Does creatine supplementation improve cognitive performance?" }
  ];

  return (
    <div className="min-h-screen grid-bg flex flex-col font-sans text-[#2B2E2C]">
      
      {/* Visual Header */}
      <header className="border-b border-[#D3D8CC] bg-[#FAF9F5] py-5 px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-[#B23A2E] text-[#FAF9F5] flex items-center justify-center font-serif text-xl font-semibold italic shadow-sm">
            C
          </div>
          <div>
            <h1 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-[#2B2E2C] flex items-center gap-2">
              CONTREPOINT
            </h1>
            <p className="font-mono text-[11px] text-[#7A8073]">
              Agentic Clinical Meta-Analysis Engine • Deciphering Literature Disagreement
            </p>
          </div>
        </div>

        {/* Top-Right Header Actions (New Hunt, History Dropdown) */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          {runs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className="font-mono text-xs border border-[#D3D8CC] hover:bg-white bg-[#E9ECE5]/30 text-[#2B2E2C] px-3.5 py-2 rounded-none flex items-center gap-2 transition-all cursor-pointer select-none"
              >
                <History className="w-4 h-4 text-[#7A8073]" />
                <span>Saved Dossiers ({runs.length})</span>
                <ChevronDown className={`w-3 h-3 text-[#7A8073] transition-transform duration-200 ${showHistoryDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D3D8CC] shadow-lg z-50 py-1 max-h-96 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-[#D3D8CC] bg-[#FAF9F5] font-mono text-[10px] font-bold text-[#7A8073] flex justify-between items-center">
                    <span>HISTORY INDEX</span>
                    {loadingRuns && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </div>
                  {runs.map(run => {
                    const isActive = activeRun?.id === run.id;
                    return (
                      <div
                        key={run.id}
                        onClick={() => {
                          setActiveRun(run);
                          setShowHistoryDropdown(false);
                        }}
                        className={`px-4 py-3 border-b border-[#D3D8CC]/50 cursor-pointer text-left transition-colors flex items-start justify-between gap-3 hover:bg-[#FAF9F5] ${
                          isActive ? 'bg-[#FAF9F5]/80 font-semibold' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-xs text-[#2B2E2C] truncate leading-tight">
                            {run.raw_query}
                          </p>
                          <span className="font-mono text-[8px] text-[#7A8073] block mt-1 uppercase">
                            {run.createdAt.split('T')[0]} • {run.status}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRun(run.id, e);
                          }}
                          className="p-1 text-[#7A8073] hover:text-[#B23A2E] hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeRun && (
            <button
              onClick={() => {
                setActiveRun(null);
                setRawQuery('');
              }}
              className="font-mono text-xs bg-[#2E4374] hover:bg-[#2E4374]/95 text-white px-4 py-2 rounded-none flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Hunt
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 space-y-10 flex flex-col justify-start">
        
        {!activeRun ? (
          <div className="space-y-10 py-8 max-w-2xl mx-auto w-full text-center">
            <div className="space-y-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[#B23A2E] font-bold bg-[#B23A2E]/5 px-3 py-1 border border-[#B23A2E]/10">Clinical Disagreement Engine</span>
              <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-[#2B2E2C] leading-tight">
                Decipher Scientific Disagreements
              </h2>
              <p className="font-serif text-[16px] text-[#7A8073] max-w-xl mx-auto leading-relaxed">
                Enter a scientific query or claim below. Our agentic pipeline will crawl literature, extract statistical trials, and reconstruct side-by-side face-offs.
              </p>
            </div>

            {/* Elegant, Spacious Search Box */}
            <div className="border border-[#D3D8CC] p-6 bg-[#FAF9F5] shadow-sm space-y-4 text-left">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="e.g. Does intermittent fasting improve insulin sensitivity?"
                  value={rawQuery}
                  onChange={e => setRawQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startNewRun(rawQuery)}
                  className="w-full font-serif text-[16px] pl-12 pr-4 py-4 rounded-none border border-[#D3D8CC] bg-white text-[#2B2E2C] focus:outline-none focus:border-[#2E4374] focus:ring-1 focus:ring-[#2E4374]/30 transition-all shadow-inner placeholder:italic"
                />
                <Search className="w-5 h-5 text-[#7A8073] absolute left-4 top-4.5" />
              </div>

              <button 
                onClick={() => startNewRun(rawQuery)}
                disabled={!rawQuery.trim()}
                className="w-full bg-[#2E4374] hover:bg-[#2E4374]/95 text-white font-mono text-xs font-bold py-4 px-4 rounded-none flex items-center justify-center gap-2 transition-all shadow-sm disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> LAUNCH DEEP ANALYSIS MACHINE
              </button>
            </div>

            {/* Curated Templates */}
            <div className="space-y-4 pt-4 border-t border-[#D3D8CC]/50">
              <span className="font-mono text-xs text-[#7A8073] uppercase tracking-wider block font-semibold">
                Explore Clinical Trial Matchups
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => startNewRun(tpl.query)}
                    className="font-serif text-sm text-[#2E4374] hover:text-[#2B2E2C] bg-[#2E4374]/5 hover:bg-[#2E4374]/10 border border-[#2E4374]/10 hover:border-[#2E4374]/30 px-5 py-4 rounded-none transition-all text-left flex items-start gap-2 group cursor-pointer"
                  >
                    <span className="text-[#B23A2E] font-bold group-hover:scale-110 transition-transform">🔍</span>
                    <div>
                      <span className="font-semibold block text-[#2B2E2C] group-hover:text-[#2E4374] transition-colors text-[14px]">
                        {tpl.label}
                      </span>
                      <span className="text-xs text-[#7A8073] block mt-1 leading-snug">
                        {tpl.query}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Past History Grid if no active run and runs exist */}
            {runs.length > 0 && (
              <div className="space-y-4 pt-12 border-t border-[#D3D8CC]/50 text-left">
                <h3 className="font-mono text-xs font-bold text-[#7A8073] uppercase tracking-wider">
                  Recent Scientific Investigations ({runs.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {runs.slice(0, 4).map(run => (
                    <div
                      key={run.id}
                      onClick={() => setActiveRun(run)}
                      className="p-5 border border-[#D3D8CC] bg-white hover:border-[#2E4374] cursor-pointer transition-all flex flex-col justify-between h-32 hover:shadow-sm"
                    >
                      <h4 className="font-serif text-[14px] font-semibold text-[#2B2E2C] line-clamp-2 leading-snug">
                        {run.raw_query}
                      </h4>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#7A8073]">
                        <span>{run.createdAt.split('T')[0]}</span>
                        <span className={`px-2 py-0.5 uppercase font-semibold text-[8px] ${
                          run.status === 'completed' ? 'bg-[#2E4374]/10 text-[#2E4374]' :
                          run.status === 'failed' ? 'bg-[#B23A2E]/10 text-[#B23A2E]' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="space-y-8 w-full">
            
            {/* Active Analysis Info & Pipeline Progress Tracker */}
            <div className="border border-[#D3D8CC] rounded-none p-6 md:p-8 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-[#D3D8CC] pb-4">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] tracking-widest uppercase text-[#7A8073] block font-bold">Active Investigative Dossier</span>
                  <h2 className="font-serif text-2xl font-bold text-[#2B2E2C] leading-snug">{activeRun.raw_query}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] px-3 py-1 rounded-none font-bold uppercase tracking-wider ${
                    activeRun.status === 'completed' ? 'bg-[#2E4374]/10 text-[#2E4374]' :
                    activeRun.status === 'failed' ? 'bg-[#B23A2E]/10 text-[#B23A2E]' : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}>
                    {activeRun.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Minimal Pipeline Progress Tracker (Instead of terminal logs wall of text) */}
              {activeRun.status !== 'completed' && activeRun.status !== 'failed' && (
                <div className="space-y-3 font-mono text-xs pt-2">
                  <div className="flex justify-between text-[#7A8073]">
                    <span>Agent pipeline is active...</span>
                    <span className="font-bold text-[#2E4374] flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      STAGE: {activeRun.currentStep.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-[#E9ECE5] h-2 rounded-none overflow-hidden relative">
                    <div 
                      className="bg-[#2E4374] h-full transition-all duration-500"
                      style={{ 
                        width: 
                          activeRun.currentStep === 'scope' ? '25%' :
                          activeRun.currentStep === 'search' ? '50%' :
                          activeRun.currentStep === 'extract' ? '75%' : '90%'
                      }}
                    />
                  </div>
                  {activeRun.logs.length > 0 && (
                    <p className="text-[#2B2E2C] italic font-serif text-sm mt-2 border-l-2 border-[#2E4374] pl-3 py-1">
                      &ldquo;{activeRun.logs[activeRun.logs.length - 1].message}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Stepper Tabs Nav - Full Width */}
            <div className="flex border-b border-[#D3D8CC] overflow-x-auto gap-2 font-mono text-xs bg-white p-1">
              
              <button
                onClick={() => setActiveTab('scope')}
                className={`py-3 px-6 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'scope' ? 'border-[#2E4374] text-[#2E4374]' : 'border-transparent text-[#7A8073] hover:text-[#2B2E2C]'
                }`}
              >
                <Dna className="w-4 h-4" /> 1. Query Spec
                {activeRun.steps.scope.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                onClick={() => activeRun.steps.search.status !== 'pending' && setActiveTab('search')}
                disabled={activeRun.steps.search.status === 'pending'}
                className={`py-3 px-6 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'search' ? 'border-[#2E4374] text-[#2E4374]' : 'border-transparent text-[#7A8073] hover:text-[#2B2E2C]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Layers className="w-4 h-4" /> 2. Candidate Papers
                {activeRun.steps.search.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                onClick={() => activeRun.steps.extract.status !== 'pending' && setActiveTab('extract')}
                disabled={activeRun.steps.extract.status === 'pending'}
                className={`py-3 px-6 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'extract' ? 'border-[#2E4374] text-[#2E4374]' : 'border-transparent text-[#7A8073] hover:text-[#2B2E2C]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <FileText className="w-4 h-4" /> 3. Extracted Claims
                {activeRun.steps.extract.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                onClick={() => activeRun.steps.cluster.status !== 'pending' && setActiveTab('cluster')}
                disabled={activeRun.steps.cluster.status === 'pending'}
                className={`py-3 px-6 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'cluster' ? 'border-[#2E4374] text-[#2E4374]' : 'border-transparent text-[#7A8073] hover:text-[#2B2E2C]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <GitCompare className="w-4 h-4 text-[#B23A2E]" /> 4. VS Comparison
                {activeRun.steps.cluster.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

            </div>

            {/* View Window Panels */}
            <div className="w-full">

                {/* TAB 1: QUERY SCOPE SPECIFICATION */}
                {activeTab === 'scope' && (
                  <div className="space-y-6">
                    <div className="border border-[#D3D8CC] rounded-none p-6 md:p-8 bg-white shadow-sm relative">
                      
                      {/* Active step progress indicator */}
                      {activeRun.steps.scope.status === 'running' && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-none z-25">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#2E4374] mb-2" />
                          <p className="font-mono text-xs text-[#2E4374] animate-pulse">AGENT REASONING AT STAGE 1: SCOPING QUESTION...</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-b border-[#D3D8CC] pb-4 mb-6">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#7A8073]">AGENT STAGE 1 OUTPUT</span>
                          <h3 className="font-serif text-xl font-bold text-[#2B2E2C]">Experimental Query Scoping Matrix</h3>
                        </div>
                        {!isEditingScope ? (
                          <button 
                            onClick={() => setIsEditingScope(true)}
                            className="font-mono text-xs border border-[#D3D8CC] hover:bg-[#FAF9F5] px-3 py-1.5 rounded-none flex items-center gap-1.5 text-[#7A8073] hover:text-[#2B2E2C] transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Modify Spec
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setIsEditingScope(false)}
                              className="font-mono text-xs border border-transparent hover:bg-zinc-100 px-3 py-1.5 rounded-none text-[#7A8073]"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleSaveScopeAndSearch}
                              className="font-mono text-xs bg-[#2E4374] text-white hover:bg-[#2E4374]/95 px-3 py-1.5 rounded-none flex items-center gap-1.5 transition-all"
                            >
                              <Save className="w-3.5 h-3.5" /> Save & Re-search
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Spec Fields */}
                      <div className="space-y-6">
                        {/* Subject */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                          <span className="font-mono text-xs font-semibold uppercase text-[#7A8073] pt-2">Subject:</span>
                          <div className="md:col-span-3">
                            {isEditingScope ? (
                              <input 
                                type="text"
                                value={editedScope.subject}
                                onChange={e => setEditedScope({ ...editedScope, subject: e.target.value })}
                                className="w-full font-serif text-[15px] p-2.5 border border-[#D3D8CC] bg-[#FAF9F5] rounded-none text-[#2B2E2C]"
                              />
                            ) : (
                              <p className="font-serif text-[16px] text-[#2B2E2C] bg-[#FAF9F5] p-3 border border-[#D3D8CC]/50 rounded-none">
                                {activeRun.steps.scope.output?.subject || "Extracting..."}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Intervention */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                          <span className="font-mono text-xs font-semibold uppercase text-[#7A8073] pt-2">Intervention:</span>
                          <div className="md:col-span-3">
                            {isEditingScope ? (
                              <textarea 
                                value={editedScope.intervention}
                                onChange={e => setEditedScope({ ...editedScope, intervention: e.target.value })}
                                className="w-full font-serif text-[15px] p-2.5 border border-[#D3D8CC] bg-[#FAF9F5] rounded-none text-[#2B2E2C] h-20 resize-none"
                              />
                            ) : (
                              <p className="font-serif text-[16px] text-[#2B2E2C] bg-[#FAF9F5] p-3 border border-[#D3D8CC]/50 rounded-none leading-relaxed">
                                {activeRun.steps.scope.output?.intervention || "Extracting..."}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Outcome */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                          <span className="font-mono text-xs font-semibold uppercase text-[#7A8073] pt-2">Outcome Measure:</span>
                          <div className="md:col-span-3">
                            {isEditingScope ? (
                              <textarea 
                                value={editedScope.outcome}
                                onChange={e => setEditedScope({ ...editedScope, outcome: e.target.value })}
                                className="w-full font-serif text-[15px] p-2.5 border border-[#D3D8CC] bg-[#FAF9F5] rounded-none text-[#2B2E2C] h-20 resize-none"
                              />
                            ) : (
                              <p className="font-serif text-[16px] text-[#2B2E2C] bg-[#FAF9F5] p-3 border border-[#D3D8CC]/50 rounded-none leading-relaxed">
                                {activeRun.steps.scope.output?.outcome || "Extracting..."}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Population constraints */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
                          <span className="font-mono text-xs font-semibold uppercase text-[#7A8073] pt-2">Demographic Bounds:</span>
                          <div className="md:col-span-3">
                            {isEditingScope ? (
                              <textarea 
                                value={editedScope.population_constraints}
                                onChange={e => setEditedScope({ ...editedScope, population_constraints: e.target.value })}
                                className="w-full font-serif text-[15px] p-2.5 border border-[#D3D8CC] bg-[#FAF9F5] rounded-none text-[#2B2E2C] h-20 resize-none"
                              />
                            ) : (
                              <p className="font-serif text-[16px] text-[#2B2E2C] bg-[#FAF9F5] p-3 border border-[#D3D8CC]/50 rounded-none leading-relaxed">
                                {activeRun.steps.scope.output?.population_constraints || "Extracting..."}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 2: CANDIDATE PAPERS SEARCH */}
                {activeTab === 'search' && (
                  <div className="space-y-6">
                    <div className="border border-[#D3D8CC] rounded-none p-6 md:p-8 bg-white shadow-sm relative">
                      
                      {activeRun.steps.search.status === 'running' && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-none z-25">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#2E4374] mb-2" />
                          <p className="font-mono text-xs text-[#2E4374] animate-pulse">AGENT QUERYING LITERATURE SERVICES & RERANKING...</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-b border-[#D3D8CC] pb-4 mb-6">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#7A8073]">AGENT STAGE 2 OUTPUT</span>
                          <h3 className="font-serif text-xl font-bold text-[#2B2E2C]">Retrieved Publications & Reranking</h3>
                        </div>
                        {activeRun.steps.search.status === 'completed' && (
                          <button 
                            onClick={handleProceedToExtraction}
                            className="font-mono text-xs bg-[#2E4374] hover:bg-[#2E4374]/95 text-white px-4 py-2 rounded-none flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            Proceed to Extract Claims <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Papers Grid */}
                      <div className="space-y-4">
                        {(activeRun.steps.search.output as CandidatePaper[] || []).map((paper, i) => {
                          const isChecked = selectedPapers[paper.id] ?? true;
                          return (
                            <div 
                              key={paper.id} 
                              onClick={() => {
                                setSelectedPapers(prev => ({
                                  ...prev,
                                  [paper.id]: !isChecked
                                }));
                              }}
                              className={`p-4 border rounded-none cursor-pointer transition-all flex gap-4 ${
                                isChecked ? 'bg-[#FAF9F5] border-[#D3D8CC]' : 'bg-white border-[#D3D8CC]/50 opacity-60'
                              }`}
                            >
                              <div className="pt-1 flex-shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="w-5 h-5 text-[#2E4374]" />
                                ) : (
                                  <Square className="w-5 h-5 text-[#7A8073]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <span className="font-mono text-[10px] text-[#7A8073] bg-[#E9ECE5] px-2 py-0.5 rounded-none">
                                    REF #{i+1} • {paper.source}
                                  </span>
                                  <span className="font-mono text-[11px] text-[#2E4374] font-semibold">
                                    Relevance Rank: {paper.relevanceScore}%
                                  </span>
                                </div>
                                <h4 className="font-serif text-[16px] font-semibold text-[#2B2E2C] mt-2 mb-1">
                                  {paper.title}
                                </h4>
                                <p className="font-mono text-xs text-[#7A8073] mb-3">
                                  {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''} — <span className="italic">{paper.venue}</span> ({paper.year})
                                </p>
                                <p className="font-serif text-sm text-[#2B2E2C]/85 leading-relaxed line-clamp-3">
                                  {paper.abstract}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 3: STRUCTURED CLAIMS EXTRACTION */}
                {activeTab === 'extract' && (
                  <div className="space-y-6">
                    {/* Active Processing Loader */}
                    {activeRun.steps.extract.status === 'running' && (
                      <div className="border border-[#D3D8CC] rounded-none p-12 text-center bg-white shadow-sm flex flex-col items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#2E4374] mb-3" />
                        <p className="font-mono text-xs text-[#2E4374] animate-pulse">STAGE 3: PARSING STATISTICAL FINDINGS FROM PUBLICATION TEXT...</p>
                        <p className="font-mono text-[10px] text-[#7A8073] mt-1 max-w-sm mx-auto">Evaluating trial demographics, effect parameters, and matching verified citations strictly.</p>
                      </div>
                    )}

                    {activeRun.steps.extract.status === 'completed' && (
                      <>
                        <div className="flex items-center justify-between flex-wrap gap-4 mb-4 bg-white p-4 border border-[#D3D8CC] rounded-none shadow-sm">
                          <div>
                            <h3 className="font-serif text-lg font-bold text-[#2B2E2C]">Verified Structured Claims</h3>
                            <p className="font-mono text-xs text-[#7A8073]">Locked { (activeRun.steps.extract.output as ExtractedClaim[]).length } clinical findings with source quotes.</p>
                          </div>
                          <button 
                            onClick={handleProceedToClustering}
                            className="font-mono text-xs bg-[#B23A2E] hover:bg-[#B23A2E]/95 text-white px-4 py-2.5 rounded-none flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            Compare Contradictions VS <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Claims List */}
                        <div className="space-y-6">
                          {(activeRun.steps.extract.output as ExtractedClaim[] || []).map((claim, idx) => (
                            <div key={claim.paper_id} className="relative">
                              <ManuscriptCard claim={claim} index={idx} />
                              
                              {/* inline quick claim details editor */}
                              {editingClaimId === claim.paper_id && editedClaim ? (
                                <div className="absolute inset-0 bg-[#FAF9F5] rounded-none border-2 border-[#2E4374] p-6 z-30 overflow-y-auto space-y-4">
                                  <div className="flex justify-between items-center border-b border-[#D3D8CC] pb-2">
                                    <h4 className="font-mono text-xs font-bold text-[#2E4374]">EDIT QUANTITATIVE CLAIM DETAILS</h4>
                                    <button onClick={() => setEditingClaimId(null)} className="p-1 hover:bg-zinc-100 rounded-none">
                                      <X className="w-4 h-4 text-[#7A8073]" />
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="font-mono text-[10px] text-[#7A8073] block mb-1">POPULATION N</label>
                                      <input 
                                        type="number"
                                        value={editedClaim.population.n}
                                        onChange={e => setEditedClaim({
                                          ...editedClaim,
                                          population: { ...editedClaim.population, n: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full p-2 border border-[#D3D8CC] rounded-none bg-white text-xs font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="font-mono text-[10px] text-[#7A8073] block mb-1">COHORT SUMMARY</label>
                                      <input 
                                        type="text"
                                        value={editedClaim.population.description}
                                        onChange={e => setEditedClaim({
                                          ...editedClaim,
                                          population: { ...editedClaim.population, description: e.target.value }
                                        })}
                                        className="w-full p-2 border border-[#D3D8CC] rounded-none bg-white text-xs font-serif"
                                      />
                                    </div>
                                    <div>
                                      <label className="font-mono text-[10px] text-[#7A8073] block mb-1">FINDING DIRECTION</label>
                                      <select 
                                        value={editedClaim.finding.direction}
                                        onChange={e => setEditedClaim({
                                          ...editedClaim,
                                          finding: { ...editedClaim.finding, direction: e.target.value as any }
                                        })}
                                        className="w-full p-2 border border-[#D3D8CC] rounded-none bg-white text-xs font-mono"
                                      >
                                        <option value="positive">positive</option>
                                        <option value="negative">negative</option>
                                        <option value="null">null</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="font-mono text-[10px] text-[#7A8073] block mb-1">EFFECT MAGNITUDE</label>
                                      <input 
                                        type="text"
                                        value={editedClaim.finding.magnitude}
                                        onChange={e => setEditedClaim({
                                          ...editedClaim,
                                          finding: { ...editedClaim.finding, magnitude: e.target.value }
                                        })}
                                        className="w-full p-2 border border-[#D3D8CC] rounded-none bg-white text-xs font-serif"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="font-mono text-[10px] text-[#7A8073] block mb-1">VERIFIED EXCERPT</label>
                                      <textarea 
                                        value={editedClaim.source_quote}
                                        onChange={e => setEditedClaim({ ...editedClaim, source_quote: e.target.value })}
                                        className="w-full p-2 border border-[#D3D8CC] rounded-none bg-white text-xs font-serif h-20 resize-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingClaimId(null)} className="font-mono text-xs px-3 py-1.5 border border-[#D3D8CC] rounded-none">Cancel</button>
                                    <button onClick={saveEditedClaim} className="font-mono text-xs bg-[#2E4374] text-white px-4 py-1.5 rounded-none">Save Updates</button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => startEditingClaim(claim)}
                                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 hover:opacity-100 bg-[#FAF9F5] border border-[#D3D8CC] p-1.5 rounded-none text-[#7A8073] hover:text-[#2B2E2C] transition-all flex items-center gap-1 font-mono text-[10px]"
                                  style={{ transform: 'translateY(-2px)' }}
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Override Finding
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 4: CONTRADICTION MAP REPORT */}
                {activeTab === 'cluster' && (
                  <div className="space-y-8">
                    
                    {activeRun.steps.cluster.status === 'running' && (
                      <div className="border border-[#D3D8CC] rounded-none p-12 text-center bg-white shadow-sm flex flex-col items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#2E4374] mb-3" />
                        <p className="font-mono text-xs text-[#2E4374] animate-pulse">STAGE 4: EVALUATING TRIAL CONGRUENCY & DETECTING CONTRADICTIONS...</p>
                      </div>
                    )}

                     {activeRun.steps.cluster.status === 'completed' && activeRun.steps.cluster.output && (() => {
                      const report = activeRun.steps.cluster.output as ContradictionReport;
                      const clusters = report.clusters || [];
                      const selectedCluster = clusters.find(c => c.id === activeClusterId) || clusters[0];
                      return (
                        <>
                          {/* Matchup Selection Grid */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#7A8073]">
                                Select a Research Dispute Matchup ({clusters.length})
                              </h4>
                              <span className="font-mono text-[10px] text-[#2E4374] bg-[#2E4374]/10 px-2 py-0.5 font-bold">
                                ACTIVE MODE: VS FACE-OFF COMPARISON
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {clusters.map((cluster) => {
                                const isSelected = selectedCluster && selectedCluster.id === cluster.id;
                                return (
                                  <button
                                    key={cluster.id}
                                    onClick={() => {
                                      setActiveClusterId(cluster.id);
                                      setChallengingComparisonIndex(null);
                                    }}
                                    className={`text-left p-4 border transition-all relative flex flex-col justify-between rounded-none shadow-sm h-36 ${
                                      isSelected
                                        ? 'bg-white border-[#2E4374] ring-2 ring-[#2E4374]/30'
                                        : 'bg-[#FAF9F5] border-[#D3D8CC] hover:bg-white hover:border-[#7A8073]'
                                    }`}
                                  >
                                    <div className="space-y-1 w-full">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[8px] uppercase tracking-wider text-[#7A8073] truncate">
                                          {cluster.outcome_measure}
                                        </span>
                                        <span className={`px-1.5 py-0.5 text-[7.5px] font-mono font-bold uppercase shrink-0 border ${
                                          cluster.is_contradictory
                                            ? 'text-[#B23A2E] bg-[#B23A2E]/5 border-[#B23A2E]/20'
                                            : 'text-[#2E4374] bg-[#2E4374]/5 border-[#2E4374]/20'
                                        }`}>
                                          {cluster.is_contradictory ? 'CONTRADICTION' : 'CONSISTENT'}
                                        </span>
                                      </div>
                                      <h4 className="font-serif text-sm font-bold text-[#2B2E2C] line-clamp-2 leading-snug">
                                        {cluster.name}
                                      </h4>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-[#D3D8CC]/50 flex items-center justify-between text-[10px] font-mono text-[#7A8073] w-full">
                                      <span>{cluster.claims.length} Study Trials</span>
                                      <span className="font-semibold text-[#2E4374] flex items-center gap-0.5">
                                        View Matchup <ArrowRight className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Selected Matchup Spotlight (The VS feature) */}
                          {selectedCluster ? (
                            <div className="space-y-6 pt-2">
                              <ContradictionSpotlight cluster={selectedCluster} />

                              {/* Challenging / Editing mapping overlay if triggered */}
                              {challengingComparisonIndex && challengingComparisonIndex.clusterId === selectedCluster.id && (
                                <div className="bg-[#FAF9F5] border-2 border-[#2E4374] p-5 rounded-none mt-4 shadow-md space-y-4 font-mono text-xs text-[#2B2E2C]">
                                  <div className="flex justify-between items-center border-b border-[#D3D8CC] pb-2">
                                    <h4 className="font-bold text-[#2E4374]">CHALLENGE SCIENTIFIC CLASSIFICATION</h4>
                                    <button onClick={() => setChallengingComparisonIndex(null)}>
                                      <X className="w-4 h-4 text-[#7A8073]" />
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-[#7A8073] mb-1">CLASSIFY DISAGREEMENT AS:</label>
                                      <select 
                                        value={challengedClassification}
                                        onChange={e => setChallengedClassification(e.target.value as any)}
                                        className="w-full p-2 border border-[#D3D8CC] bg-white rounded-none text-xs font-semibold"
                                      >
                                        <option value="Noise">Noise (CIs overlap, small power)</option>
                                        <option value="Scope Mismatch">Scope Mismatch (differing populations/methods)</option>
                                        <option value="Methodology-driven">Methodology-driven (mismatch in study rigor/design)</option>
                                        <option value="Genuine open contradiction">Genuine open contradiction (comparable rigor/cohorts, opposite results)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[#7A8073] mb-1">SCIENTIFIC ARGUMENT / REASONING:</label>
                                      <textarea 
                                        value={challengedReason}
                                        onChange={e => setChallengedReason(e.target.value)}
                                        className="w-full p-2 border border-[#D3D8CC] bg-white rounded-none text-xs font-serif h-24 resize-none leading-relaxed"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setChallengingComparisonIndex(null)} className="px-3 py-1.5 border border-[#D3D8CC] rounded-none">Cancel</button>
                                    <button onClick={saveChallenge} className="bg-[#2E4374] text-white px-4 py-1.5 rounded-none">Confirm Override</button>
                                  </div>
                                </div>
                              )}

                              {/* Challenge button in spotlight footer */}
                              {!challengingComparisonIndex && (
                                <div className="flex justify-end -mt-4 mb-6">
                                  <button 
                                    onClick={() => startChallengeComparison(selectedCluster.id, 0, selectedCluster.comparisons[0] || { classification: 'Genuine open contradiction', reason: '' })}
                                    className="font-mono text-[11px] text-[#7A8073] hover:text-[#2B2E2C] bg-white border border-[#D3D8CC] px-3 py-1.5 rounded-none shadow-sm hover:shadow transition-all flex items-center gap-1"
                                  >
                                    <Sliders className="w-3.5 h-3.5 text-[#B23A2E]" /> Challenge Agent Classification
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="border border-[#D3D8CC] p-12 text-center text-xs font-mono text-[#7A8073]">
                              No active outcome groups to visualize.
                            </div>
                          )}

                          {/* 3. Escalate on Uncertainty (Step 7) */}
                          {(report.unclassified_papers || []).length > 0 && (
                            <div className="space-y-4 pt-6">
                              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#7A8073] border-b border-[#D3D8CC] pb-2">
                                Reviewed but not Confidently Classified (Unclassified)
                              </h4>
                              <div className="space-y-2">
                                {report.unclassified_papers.map((p, i) => (
                                  <div key={i} className="p-4 border border-[#D3D8CC] bg-[#FAF9F5]/30 rounded-none text-xs font-mono flex items-start gap-3">
                                    <Lock className="w-4 h-4 text-[#7A8073] mt-0.5" />
                                    <div>
                                      <span className="font-semibold text-[#2B2E2C]">{p.title}</span>
                                      <p className="text-[#7A8073] mt-1 italic">Escalation Reason: {p.reason}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                  </div>
                )}

              </div>

              {/* Collapsible Technical Analysis Trace */}
              <div className="border border-[#D3D8CC] bg-white rounded-none p-5 shadow-sm">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="font-mono text-xs text-[#7A8073] hover:text-[#2B2E2C] flex items-center justify-between w-full font-bold uppercase tracking-wider select-none cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#7A8073]" />
                    <span>Technical Trace logs ({activeRun.logs.length} events)</span>
                  </span>
                  {showLogs ? <ChevronUp className="w-4 h-4 text-[#2E4374]" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showLogs && (
                  <div className="mt-4 border-t border-[#D3D8CC]/50 pt-4">
                    <ConsoleLogs 
                      logs={activeRun.logs} 
                      status={activeRun.status} 
                      currentStep={activeRun.currentStep}
                    />
                  </div>
                )}
              </div>

            </div>
          )}

        </main>

      {/* Footer */}
      <footer className="border-t border-[#D3D8CC] py-4 bg-[#FAF9F5] text-center font-mono text-[10px] text-[#7A8073]">
        <span>Contrepoint • Open Science Meta-Analysis Machine • No Medical Advice Provided</span>
      </footer>

    </div>
  );
}
