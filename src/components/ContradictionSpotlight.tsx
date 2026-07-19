/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClaimCluster, ExtractedClaim } from '../types';
import { AlertOctagon, ShieldAlert, FlaskConical, CheckCircle } from 'lucide-react';

interface ContradictionSpotlightProps {
  cluster: ClaimCluster;
}

export default function ContradictionSpotlight({ cluster }: ContradictionSpotlightProps) {
  // Find the primary contradiction or comparison
  const primaryComparison = cluster.comparisons.find(c => c.classification === 'Genuine open contradiction') || cluster.comparisons[0];

  let paper1 = cluster.claims[0];
  let paper2 = cluster.claims[1];

  if (primaryComparison) {
    paper1 = cluster.claims.find(c => c.paper_id === primaryComparison.paper_id_1) || paper1;
    paper2 = cluster.claims.find(c => c.paper_id === primaryComparison.paper_id_2) || paper2;
  }

  if (!paper1) {
    return (
      <div className="p-8 text-center border border-[#D3D8CC] text-[#7A8073] font-serif text-sm">
        No trials available in this outcome group.
      </div>
    );
  }

  const isContradictory = cluster.is_contradictory;
  
  // Theme definitions based on whether it is contradictory or consistent
  const theme = {
    text: isContradictory ? 'text-[#B23A2E]' : 'text-[#2E4374]',
    badgeBg: isContradictory ? 'bg-red-50 text-[#B23A2E] border-red-200/50' : 'bg-blue-50 text-[#2E4374] border-blue-200/50',
    bannerTitle: isContradictory ? 'GENUINE OPEN CONTRADICTION IDENTIFIED' : 'RESOLVED OR APPARENT DISAGREEMENT',
    alphaLabel: isContradictory ? 'STUDY ALPHA (POSITIVE EFFECT FINDING)' : 'STUDY ALPHA',
    betaLabel: isContradictory ? 'STUDY BETA (OPPOSITE/NULL FINDING)' : 'STUDY BETA',
    excerptBgAlpha: 'bg-slate-50/50 border-[#2E4374]/30',
    excerptBgBeta: isContradictory ? 'bg-red-50/30 border-[#B23A2E]/30' : 'bg-zinc-50 border-[#7A8073]/30',
    vsBadgeBorder: isContradictory ? 'border-[#B23A2E] text-[#B23A2E]' : 'border-[#2E4374] text-[#2E4374]',
  };

  return (
    <div className={`border-t-4 ${isContradictory ? 'border-[#B23A2E]' : 'border-[#2E4374]'} border-x border-b border-[#D3D8CC] bg-white rounded-none overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300`}>
      
      {/* Premium Spacious Header */}
      <div className="bg-[#FAF9F5] border-b border-[#D3D8CC] px-8 py-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isContradictory ? (
            <AlertOctagon className="w-5 h-5 text-[#B23A2E]" />
          ) : (
            <CheckCircle className="w-5 h-5 text-[#2E4374]" />
          )}
          <div>
            <span className="font-mono text-[9px] tracking-widest uppercase text-[#7A8073] font-bold block mb-0.5">AGENT METRICS RECONCILIATION</span>
            <h3 className="font-serif text-lg font-bold tracking-tight text-[#2B2E2C]">{theme.bannerTitle}</h3>
          </div>
        </div>
        <div className={`font-mono text-xs px-3.5 py-1.5 border rounded-none font-bold uppercase tracking-wider ${theme.badgeBg}`}>
          Endpoint: {cluster.outcome_measure}
        </div>
      </div>

      {/* Conflict Question Statement */}
      <div className="border-b border-[#D3D8CC] px-8 py-8 bg-[#E9ECE5]/10">
        <span className="font-mono text-[10px] text-[#7A8073] uppercase tracking-wider block mb-1 font-bold">Outcome Endpoint Scope</span>
        <h4 className="font-serif text-2xl font-bold text-[#2B2E2C] leading-snug">
          &ldquo;{cluster.name}&rdquo;
        </h4>
        <p className="font-mono text-xs text-[#7A8073] mt-3">
          Target Population Bounds: <span className="text-[#2B2E2C] font-semibold bg-[#FAF9F5] px-2 py-1 border border-[#D3D8CC]/50">{cluster.population_type}</span>
        </p>
      </div>

      {/* Side-by-Side Excerpts */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#D3D8CC] relative bg-white">
        
        {/* Paper A */}
        <div className="p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAF9F5]/20 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#2E4374] font-bold uppercase tracking-wider">{theme.alphaLabel}</span>
              <span className="font-mono text-[10px] text-[#7A8073] bg-[#E9ECE5]/50 px-2 py-0.5 rounded-none">{paper1.methodology.design} • N={paper1.population.n}</span>
            </div>
            
            <div>
              <h5 className="font-serif text-[17px] font-bold text-[#2B2E2C] leading-snug mb-1">
                {paper1.title}
              </h5>
              <p className="font-mono text-xs text-[#7A8073]">
                {paper1.authors[0]} et al. ({paper1.year}) • <span className="italic">{paper1.venue}</span>
              </p>
            </div>

            <div className={`p-5 ${theme.excerptBgAlpha} border-l-2 border-[#2E4374] rounded-none text-base italic font-serif text-[#2B2E2C] leading-relaxed relative mt-2`}>
              <span className="absolute -top-3 left-2 font-mono text-[9px] bg-white px-1.5 border border-[#2E4374]/30 rounded-none text-[#2E4374] font-bold">ALPHA CITATION EXCERPT</span>
              &ldquo;{paper1.source_quote}&rdquo;
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-[#D3D8CC]/30 flex justify-between text-xs font-mono">
            <span className="text-[#7A8073]">Quantified Effect Size:</span>
            <span className="font-bold text-[#2B2E2C] bg-[#FAF9F5] px-2 py-0.5 border border-[#D3D8CC]/50">{paper1.finding.magnitude} {paper1.finding.unit || ''} (p={paper1.finding.p_value})</span>
          </div>
        </div>

        {/* Paper B */}
        {paper2 ? (
          <div className="p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAF9F5]/20 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs ${isContradictory ? 'text-[#B23A2E]' : 'text-[#7A8073]'} font-bold uppercase tracking-wider`}>{theme.betaLabel}</span>
                <span className="font-mono text-[10px] text-[#7A8073] bg-[#E9ECE5]/50 px-2 py-0.5 rounded-none">{paper2.methodology.design} • N={paper2.population.n}</span>
              </div>
              
              <div>
                <h5 className="font-serif text-[17px] font-bold text-[#2B2E2C] leading-snug mb-1">
                  {paper2.title}
                </h5>
                <p className="font-mono text-xs text-[#7A8073]">
                  {paper2.authors[0]} et al. ({paper2.year}) • <span className="italic">{paper2.venue}</span>
                </p>
              </div>

              <div className={`p-5 ${theme.excerptBgBeta} border-l-2 ${isContradictory ? 'border-[#B23A2E]' : 'border-[#7A8073]'} rounded-none text-base italic font-serif text-[#2B2E2C] leading-relaxed relative mt-2`}>
                <span className="absolute -top-3 left-2 font-mono text-[9px] bg-white px-1.5 border border-zinc-300 rounded-none text-[#7A8073] font-bold">BETA CITATION EXCERPT</span>
                &ldquo;{paper2.source_quote}&rdquo;
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-[#D3D8CC]/30 flex justify-between text-xs font-mono">
              <span className="text-[#7A8073]">Quantified Effect Size:</span>
              <span className="font-bold text-[#2B2E2C] bg-[#FAF9F5] px-2 py-0.5 border border-[#D3D8CC]/50">{paper2.finding.magnitude} {paper2.finding.unit || ''} (p={paper2.finding.p_value})</span>
            </div>
          </div>
        ) : (
          <div className="p-8 md:p-10 bg-[#FAF9F5]/20 flex flex-col items-center justify-center text-center">
            <p className="font-serif text-sm italic text-[#7A8073]">No other trial in this outcome group has been processed for side-by-side comparison.</p>
          </div>
        )}

        {/* Center VS Bracket connecting them (rendered on desktop only) */}
        {paper2 && (
          <div className={`hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-[#D3D8CC] bg-[#FAF9F5] text-[#7A8073] items-center justify-center font-serif text-xs font-bold ${theme.vsBadgeBorder} italic shadow-sm`}>
            VS
          </div>
        )}
      </div>

      {/* Disagreement Meta Analysis Rationale */}
      <div className="border-t border-[#D3D8CC] p-8 md:p-10 bg-[#E9ECE5]/10 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#D3D8CC]">
        {/* Agent Hypothesis */}
        <div className="space-y-3">
          <h6 className="font-mono text-xs font-bold uppercase text-[#B23A2E] flex items-center gap-2 tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Agent Reconciliation Thesis
          </h6>
          <p className="font-serif text-sm text-[#2B2E2C] leading-relaxed md:pr-4">
            {cluster.hypothesis || (primaryComparison ? primaryComparison.reason : "No major contradictions identified; trials demonstrate statistical and methodological alignment.")}
          </p>
        </div>

        {/* Resolution protocol */}
        <div className="space-y-3 pt-6 md:pt-0 md:pl-8">
          <h6 className="font-mono text-xs font-bold uppercase text-[#2E4374] flex items-center gap-2 tracking-wider">
            <FlaskConical className="w-4 h-4" /> Resolution Protocol Specification
          </h6>
          <p className="font-serif text-sm text-[#2B2E2C] leading-relaxed">
            {cluster.resolution_evidence_needed || "Requires a direct, head-to-head randomized trial controlled strictly for exposure duration and confounding baseline dietary scores to isolate true biological response."}
          </p>
        </div>
      </div>
    </div>
  );
}
