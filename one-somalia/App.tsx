import React, { useState } from 'react';
import { SomaliFlag } from './components/SomaliFlag';
import { MaahirLogo } from './components/MaahirLogo';
import { SettingsPanel } from './components/SettingsPanel';

const App: React.FC = () => {
  // Answer Assist State
  const [autoSelect, setAutoSelect] = useState(true);
  const [previewOnly, setPreviewOnly] = useState(true);

  // Lecture Skip State
  const [autoSkipVideo, setAutoSkipVideo] = useState(true);
  const [smartAdvance, setSmartAdvance] = useState(true);
  const [enableSkipBtn, setEnableSkipBtn] = useState(true);

  // Status State
  const [showStatus, setShowStatus] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [pauseExtension, setPauseExtension] = useState(false);

  return (
    <div className="flex justify-center items-start min-h-screen bg-[#F8FAFC] font-sans text-slate-800 p-6">
      <div className="w-full max-w-[360px] flex flex-col gap-5">
        
        {/* UNIFIED HERO CARD */}
        {/* This card now contains the Flag, Logo, Title, AND the System Notice in one unit */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#0EA5E9] shadow-2xl shadow-blue-500/25">
            
            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-[50px] mix-blend-overlay"></div>
            <div className="absolute bottom-[-10%] left-[-20%] w-56 h-56 bg-cyan-400/20 rounded-full blur-[60px] mix-blend-overlay"></div>

            <div className="relative z-10 flex flex-col items-center pt-8 pb-4 px-4">
                
                {/* Visual Identity Row */}
                <div className="flex items-center justify-center gap-6 mb-4">
                    {/* Flag Glass Container */}
                    <div className="group relative">
                        <div className="absolute inset-0 bg-white/20 blur-md rounded-xl transform scale-90 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-2 hover:rotate-0 transition-all duration-300">
                             <div className="w-[42px] rounded overflow-hidden shadow-sm">
                                <SomaliFlag />
                             </div>
                        </div>
                    </div>

                    {/* Logo Glass Container */}
                    <div className="group relative">
                        <div className="absolute inset-0 bg-white/20 blur-md rounded-full transform scale-90 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center shadow-lg transform rotate-2 hover:rotate-0 transition-all duration-300">
                             <div className="w-10 h-10 rounded-full overflow-hidden border border-white/50 shadow-sm">
                                <MaahirLogo />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Typography */}
                <div className="text-center mb-6">
                    <h1 className="text-white text-[26px] font-black tracking-tight drop-shadow-sm leading-none mb-1.5">
                        One Somalia
                    </h1>
                    <p className="text-blue-50 text-[10px] font-bold uppercase tracking-[0.3em] opacity-90">
                        Maahir Helper
                    </p>
                </div>

                {/* INTEGRATED SYSTEM NOTICE */}
                {/* Merged inside the hero card with glassmorphism */}
                <div className="w-full bg-white/90 backdrop-blur-xl border border-white/50 rounded-xl p-3 flex items-center gap-3 shadow-lg shadow-black/5 transform translate-y-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest leading-none mb-0.5">
                            System Notice
                        </span>
                        <span className="text-slate-800 text-xs font-bold leading-tight">
                            Somaliland is not a country.
                        </span>
                    </div>
                </div>

            </div>
        </div>

        {/* SETTINGS AREA */}
        <div className="bg-white rounded-[2rem] p-1 shadow-lg shadow-slate-200/50 border border-slate-100">
            <SettingsPanel 
                autoSelect={autoSelect}
                setAutoSelect={setAutoSelect}
                previewOnly={previewOnly}
                setPreviewOnly={setPreviewOnly}
                autoSkipVideo={autoSkipVideo}
                setAutoSkipVideo={setAutoSkipVideo}
                smartAdvance={smartAdvance}
                setSmartAdvance={setSmartAdvance}
                enableSkipBtn={enableSkipBtn}
                setEnableSkipBtn={setEnableSkipBtn}
                showStatus={showStatus}
                setShowStatus={setShowStatus}
                debugMode={debugMode}
                setDebugMode={setDebugMode}
                pauseExtension={pauseExtension}
                setPauseExtension={setPauseExtension}
            />
        </div>

        {/* FOOTER */}
        <div className="text-center">
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide flex justify-center items-center gap-2">
                <span className="opacity-50">v1.0.0</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="opacity-75">Powered by Maahir</span>
            </p>
        </div>

      </div>
    </div>
  );
};

export default App;