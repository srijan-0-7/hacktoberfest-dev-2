import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Cpu, Cloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AIStatusBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { data: status, isLoading } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
    refetchInterval: 15000,
  });

  if (isLoading || !status) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-500 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
        <span>Checking AI...</span>
      </div>
    );
  }

  const isGemini = status.active_provider === 'gemini';
  const isAvailable = isGemini ? status.gemini_configured : status.ollama_available;

  if (compact) {
    return (
      <Link
        to="/settings"
        title={`AI Provider: ${isGemini ? 'Gemini API' : 'Local Ollama'} (${isAvailable ? 'Online' : 'Offline'})`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
          isAvailable
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        {isGemini ? <Cloud className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
        <span>{isGemini ? 'Gemini' : 'Ollama'}</span>
      </Link>
    );
  }

  return (
    <Link
      to="/settings"
      className="block p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all text-left"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {isGemini ? (
            <Cloud className="w-4 h-4 text-emerald-600" />
          ) : (
            <Cpu className="w-4 h-4 text-emerald-600" />
          )}
          <span className="text-xs font-semibold text-slate-800">
            {isGemini ? 'Gemini Cloud AI' : 'Local Ollama'}
          </span>
        </div>
        {isAvailable ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3" /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
            <AlertCircle className="w-3 h-3" /> Offline
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 truncate">
        {isGemini ? status.gemini_model : `${status.ollama_model} @ local`}
      </p>
    </Link>
  );
};
