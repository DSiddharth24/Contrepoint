/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { RunLogs, PipelineStep } from '../types';
import { Terminal, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ConsoleLogsProps {
  logs: RunLogs[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: PipelineStep;
}

export default function ConsoleLogs({ logs, status, currentStep }: ConsoleLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: RunLogs['type']) => {
    switch (type) {
      case 'error':
        return 'text-[#B23A2E]';
      case 'success':
        return 'text-[#2E4374] font-semibold';
      case 'warning':
        return 'text-amber-800';
      case 'info':
      default:
        return 'text-[#2B2E2C]/80';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
    } catch {
      return "00:00:00";
    }
  };

  return (
    <div className="border border-[#D3D8CC] rounded-none overflow-hidden bg-white shadow-sm mb-8">
      {/* Console Header */}
      <div className="bg-[#E9ECE5] border-b border-[#D3D8CC] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#2B2E2C]">
          <Terminal className="w-4 h-4 text-[#7A8073]" />
          <span>RESEARCH AGENT CHRONICLE TAPE</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {status === 'running' && (
            <span className="flex items-center gap-1 text-[#2E4374] font-bold">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>STAGE: {currentStep.toUpperCase()}</span>
            </span>
          )}
          {status === 'completed' && (
            <span className="text-[#2E4374] flex items-center gap-1 font-bold">
              <CheckCircle className="w-3 h-3" />
              <span>LOG CLOSURE</span>
            </span>
          )}
          {status === 'failed' && (
            <span className="text-[#B23A2E] flex items-center gap-1 font-bold">
              <AlertCircle className="w-3 h-3" />
              <span>AGENT HALTED</span>
            </span>
          )}
          {status === 'pending' && <span className="text-[#7A8073] font-bold">STANDBY</span>}
        </div>
      </div>

      {/* Log Feed */}
      <div 
        ref={containerRef}
        className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 leading-relaxed bg-[#FAF9F5]"
        style={{ backgroundImage: 'linear-gradient(rgba(211, 216, 204, 0.45) 1px, transparent 1px)', backgroundSize: '100% 24px' }}
      >
        {logs.length === 0 ? (
          <div className="text-[#7A8073] italic py-4 text-center">
            &lt; Ready. Enter a raw query or select a topic template to begin the hunt &gt;
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2.5 transition-all duration-150 border-b border-[#D3D8CC]/10 pb-1">
              <span className="text-[#7A8073] flex-shrink-0 select-none">
                [{formatTime(log.timestamp)}]
              </span>
              <span className="text-[#7A8073] font-semibold flex-shrink-0 select-none uppercase text-[10px] w-14 truncate">
                {log.step}
              </span>
              <span className={`flex-1 ${getLogColor(log.type)} whitespace-pre-wrap`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
