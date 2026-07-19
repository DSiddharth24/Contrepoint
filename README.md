# Contrepoint

### **Agentic Clinical Meta-Analysis Engine • Deciphering Literature Disagreement**

**Live Platform:** [https://contrepoint.ai.studio](https://contrepoint.ai.studio)

---

## 🔬 Project Overview

**Contrepoint** is a high-fidelity, agentic meta-analysis platform designed to resolve apparent contradictions and genuine disagreements in scientific literature. In clinical research, studies frequently yield conflicting findings regarding the same interventions or outcome measures. Finding, comparing, and interpreting these disagreements usually takes weeks of meticulous manual literature review.

Contrepoint automates this pipeline. It systematically extracts, validates, and clusters randomized controlled trials (RCTs) and clinical studies, creating direct, side-by-side **VS Face-Off** comparisons. By grading the credibility of each trial through a purely metrics-driven system and evaluating the underlying methodologies, Contrepoint delivers an automated **Reconciliation Thesis** and specifies exact **Resolution Protocol Specifications** to guide future scientific discovery.

---

## 🗺️ The Scientific Reconciliation Pipeline

Contrepoint operates across a rigorous four-stage clinical meta-analysis protocol:

### **1. Query Scope Specification**
The pipeline begins by analyzing a raw user clinical question or hypothesis. The engine decomposes the text to map:
*   **Outcome Endpoint Scope:** The precise clinical measurements under review (e.g., *HOMA-IR and glucose infusion rate*).
*   **Target Population Bounds:** The cohort constraints (e.g., *Healthy, lean, non-obese adults*).
*   **Intervention Protocols:** The specific exposure regimens.

### **2. Trial Acquisition & Screening**
The engine ingests candidate scientific papers, filtering out low-quality preprints and ensuring high relevance to the specified outcome endpoints. In this stage, papers are parsed for peer-reviewed authenticity and mapped to metadata indices.

### **3. Claims Extraction & Credibility Grading**
For each candidate paper, the system:
*   Extracts verified verbatim citations directly from the text (abstract or main body) containing the core experimental finding.
*   Maps trial parameters: sample size power ($N$), experimental duration, methodology design (e.g., *Double-blind RCT*, *Crossover study*), and controlled confounders.
*   Applies a strictly metrics-driven **Credibility Rating (0–100)** factoring in study design tier, statistical power, p-value strength, conflict of interest (COI) disclosure, and funding independence.

### **4. VS Comparison & Face-Off**
The system identifies clinical trials examining similar endpoints but reporting divergent effects, structuring them into an interactive **VS Matchup**:
*   **Side-by-Side Excerpt Visualizer:** Direct contrast of opposing Alpha (positive effect) and Beta (opposite/null) study excerpts.
*   **Agent Reconciliation Thesis:** A synthesized, multi-factorial hypothesis resolving the mismatch (e.g., identifying differences in study duration, population baseline profiles, or exposure methodologies).
*   **Resolution Protocol Specification:** Actionable blueprints for future randomized controlled trials to definitively settle the scientific debate.

---

## 🎨 Visual Identity & Aesthetic Principles

Contrepoint is built on a custom Swiss Modernist design language designed for clarity, prestige, and clinical authority:

*   **Premium Spaciousness:** The layout rejects visual clutter and compact, dense UI paradigms in favor of expansive margins, comfortable line heights ($1.625$ golden ratio), and highly structured negative space.
*   **Typographic Balance:** Display headings pair an elegant, authoritative serif face (`Playfair Display` / `Merriweather` styled) for titles and papers with a clean, versatile sans-serif (`Inter`) for interface components. Technical metadata, statistics, and pipeline logs utilize a highly readable monospaced font (`JetBrains Mono`) to convey scientific rigor.
*   **High-Contrast Minimalist Palette:** The system employs warm off-whites (`#FAF9F5`), deep muted slate-blues (`#2E4374`) for consistent findings, rich crimson-reds (`#B23A2E`) for contradictory alerts, and soft charcoal grays (`#2B2E2C`) for body typography. 

---

## 🛠️ Architecture & Core Technologies

The application is built on a highly modular and robust full-stack architecture:

*   **Frontend SPA Framework:** React 18+ with Vite as the build tool.
*   **Design & Layout:** Tailwind CSS for fluid, fully responsive utility layouts.
*   **Iconography:** High-precision, clean vector symbols imported exclusively from `lucide-react`.
*   **State & Inter-component Communication:** Optimized, reactive React Hook architecture ensuring smooth step transitions, and dynamic visual overlays for challenging agent findings.

---

## 📝 Terms of Use & Open Science Disclaimer

Contrepoint is an open-science platform designed purely for metadata analysis, literature research synthesis, and educational exploration. 
*   **No Medical Advice:** The analyses, credibility ratings, and reconciliation hypotheses generated by this engine do not constitute clinical guidelines, medical diagnoses, or treatment recommendations. Always consult qualified clinical professionals and primary peer-reviewed literature for healthcare decisions.
*   **No Prestige Bias:** Study credibility scores are calculated using a transparent, metrics-driven formula. No subjective or journal-impact-factor prestige bias is applied.
