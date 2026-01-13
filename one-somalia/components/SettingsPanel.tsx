import React from 'react';

interface SettingsPanelProps {
  // Answer Assist
  autoSelect: boolean;
  setAutoSelect: (v: boolean) => void;
  previewOnly: boolean;
  setPreviewOnly: (v: boolean) => void;

  // Lecture Skip
  autoSkipVideo: boolean;
  setAutoSkipVideo: (v: boolean) => void;
  smartAdvance: boolean;
  setSmartAdvance: (v: boolean) => void;
  enableSkipBtn: boolean;
  setEnableSkipBtn: (v: boolean) => void;

  // Status
  showStatus: boolean;
  setShowStatus: (v: boolean) => void;
  debugMode: boolean;
  setDebugMode: (v: boolean) => void;
  pauseExtension: boolean;
  setPauseExtension: (v: boolean) => void;
}

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mb-4 px-4 mt-6 first:mt-2">
    {children}
  </h3>
);

const ToggleRow = ({ 
  label, 
  subLabel, 
  checked, 
  onChange 
}: { 
  label: string, 
  subLabel?: string, 
  checked: boolean, 
  onChange: () => void 
}) => (
  <div 
    onClick={onChange}
    className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 cursor-pointer group transition-colors duration-200 rounded-xl mx-2"
  >
    <div className="flex flex-col pr-4">
      <span className="text-slate-700 font-bold text-[13px] group-hover:text-blue-600 transition-colors duration-200">
        {label}
      </span>
      {subLabel && (
        <span className="text-slate-400 text-[11px] font-medium mt-0.5 leading-snug">
          {subLabel}
        </span>
      )}
    </div>
    
    {/* Modern IOS Switch */}
    <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out flex-shrink-0 ${checked ? 'bg-blue-500 shadow-inner' : 'bg-slate-200'}`}>
        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ease-spring ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </div>
  </div>
);

const Divider = () => <div className="h-px bg-slate-100 mx-6 my-1"></div>;

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  autoSelect, setAutoSelect,
  previewOnly, setPreviewOnly,
  autoSkipVideo, setAutoSkipVideo,
  smartAdvance, setSmartAdvance,
  enableSkipBtn, setEnableSkipBtn,
  showStatus, setShowStatus,
  debugMode, setDebugMode,
  pauseExtension, setPauseExtension
}) => {
  return (
    <div className="pb-4">
      
      {/* SECTION 1: ANSWER ASSIST */}
      <SectionTitle>Answer Assist</SectionTitle>
      <div>
        <ToggleRow 
          label="Auto-select answers" 
          subLabel="Pick correct options automatically"
          checked={autoSelect} 
          onChange={() => setAutoSelect(!autoSelect)} 
        />
        <Divider />
        <ToggleRow 
          label="Preview only" 
          subLabel="Highlight without clicking"
          checked={previewOnly} 
          onChange={() => setPreviewOnly(!previewOnly)} 
        />
      </div>

      {/* SECTION 2: LECTURE SKIP */}
      <SectionTitle>Lecture Skip</SectionTitle>
      <div>
        <ToggleRow 
          label="Auto-skip videos" 
          subLabel="Jump to the end"
          checked={autoSkipVideo} 
          onChange={() => setAutoSkipVideo(!autoSkipVideo)} 
        />
        <Divider />
        <ToggleRow 
          label="Smart auto-advance" 
          subLabel="Only click next after completion"
          checked={smartAdvance} 
          onChange={() => setSmartAdvance(!smartAdvance)} 
        />
        <Divider />
        <ToggleRow 
          label="Enable Skip Lecture button" 
          subLabel="Show floating action on page"
          checked={enableSkipBtn} 
          onChange={() => setEnableSkipBtn(!enableSkipBtn)} 
        />
        
        {/* Modern Primary Action Button */}
        <div className="mt-5 px-4">
          <button className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300 transform active:scale-[0.98] hover:shadow-blue-500/40">
            <span className="relative z-10 flex items-center justify-center gap-2">
               Skip Lecture Now
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
               </svg>
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </button>
        </div>
      </div>

      {/* SECTION 3: STATUS */}
      <SectionTitle>Status</SectionTitle>
      <div>
        <ToggleRow 
          label="Show status panel" 
          subLabel="Answers, video, next state"
          checked={showStatus} 
          onChange={() => setShowStatus(!showStatus)} 
        />
        <Divider />
        <ToggleRow 
          label="Debug mode" 
          subLabel="Log selector issues"
          checked={debugMode} 
          onChange={() => setDebugMode(!debugMode)} 
        />
        <Divider />
        <ToggleRow 
          label="Pause extension" 
          subLabel="Hotkey: Alt+Shift+P"
          checked={pauseExtension} 
          onChange={() => setPauseExtension(!pauseExtension)} 
        />
      </div>

    </div>
  );
};