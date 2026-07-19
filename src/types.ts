/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuerySpec {
  subject: string;
  intervention: string;
  outcome: string;
  population_constraints: string;
}

export interface CandidatePaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  abstract: string;
  url: string;
  source: 'Semantic Scholar' | 'PubMed' | 'arXiv' | 'Predefined';
  citationCount?: number;
  relevanceScore?: number;
}

export interface StudyPopulation {
  n: number;
  description: string;
}

export interface StudyMethodology {
  design: 'RCT' | 'Cohort' | 'Case-Control' | 'Cross-Sectional' | 'Meta-Analysis' | 'Systematic Review' | 'Preprint' | 'Other';
  duration: string;
  key_confounds_controlled: string[];
}

export interface Finding {
  direction: 'positive' | 'negative' | 'null';
  magnitude: string;
  unit: string;
  confidence_interval: string;
  p_value: string;
}

export interface ExtractedClaim {
  paper_id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  url: string;
  source: string;
  population: StudyPopulation;
  methodology: StudyMethodology;
  finding: Finding;
  source_quote: string;
  source_location: string;
  unresolved_extraction?: boolean;
}

export type DisagreementType = 
  | 'Noise'                // direction conflicts but CI overlaps or sample size too small
  | 'Scope Mismatch'       // different populations, outcomes or exposure definitions
  | 'Methodology-driven'   // findings diverge based on study design differences
  | 'Genuine open contradiction'; // comparable rigor/population, but still disagree

export interface PairwiseComparison {
  paper_id_1: string;
  paper_id_2: string;
  title_1: string;
  title_2: string;
  classification: DisagreementType;
  reason: string;
}

export interface CredibilityScore {
  overall_score: number; // 0 - 100
  design_tier_score: number; // RCT=40, Cohort=30, Case-Control=20, etc.
  sample_size_score: number; // Logarithmic scaling based on N
  confidence_score: number; // based on p-value and CI
  conflict_of_interest_score: number; // Deductions if funded by industry
  replication_score: number; // Has it been verified
  disclosed_conflicts: string;
  funding_source: string;
  journal_context: string; // Separated prestige context
}

export interface ClaimCluster {
  id: string;
  name: string; // Plain-language statement of the dispute or topic
  outcome_measure: string;
  population_type: string;
  claims: ExtractedClaim[];
  comparisons: PairwiseComparison[];
  is_contradictory: boolean;
  contradiction_type?: DisagreementType;
  hypothesis?: string;
  resolution_evidence_needed?: string;
}

export interface UnclassifiedPaper {
  paper_id: string;
  title: string;
  reason: string;
}

export interface ContradictionReport {
  query_spec: QuerySpec;
  clusters: ClaimCluster[];
  unclassified_papers: UnclassifiedPaper[];
}

export type PipelineStep =
  | 'idle'
  | 'scope'
  | 'search'
  | 'extract'
  | 'cluster'
  | 'completed'
  | 'failed';

export interface PipelineStepStatus {
  step: PipelineStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  updatedAt: string;
  output?: any;
}

export interface RunLogs {
  timestamp: string;
  message: string;
  step: PipelineStep;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface JobRun {
  id: string;
  raw_query: string;
  createdAt: string;
  updatedAt: string;
  currentStep: PipelineStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  steps: Record<PipelineStep, PipelineStepStatus>;
  logs: RunLogs[];
  report?: ContradictionReport;
}
