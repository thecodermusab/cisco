import React from 'react';
import { FactResponse, LoadingState } from '../types';

interface FactCardProps {
  state: LoadingState;
  data: FactResponse | null;
  onGenerate: () => void;
}

export const FactCard: React.FC<FactCardProps> = ({ state, data, onGenerate }) => {
  return (
    <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Did you know?
        </h3>
        {data?.category && (
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
            {data.category}
          </span>
        )}
      </div>

      <div className="min-h-[80px] flex items-center justify-center">
        {state === LoadingState.LOADING ? (
          <div className="flex flex-col items-center animate-pulse space-y-2">
            <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
            <div className="h-2 w-1/2 bg-slate-200 rounded"></div>
            <span className="text-xs text-slate-400 mt-2">Consulting Gemini AI...</span>
          </div>
        ) : state === LoadingState.ERROR ? (
          <p className="text-red-500 text-sm text-center">
            Could not retrieve a fact at this time. Please check your connection.
          </p>
        ) : data ? (
          <p className="text-slate-700 text-base leading-relaxed text-center font-medium">
            "{data.fact}"
          </p>
        ) : (
          <p className="text-slate-400 text-sm text-center italic">
            Tap the button below to learn about Somalia.
          </p>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={state === LoadingState.LOADING}
        className="w-full mt-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {state === LoadingState.LOADING ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>Discover Somalia</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
};