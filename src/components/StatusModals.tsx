/**
 * Status Modals for Tesla Roadster: Apex Pursuit
 * Pause, Victory, and Game Over modals with tabular metrics
 * and primary action CTAs.
 */

import React from 'react';
import { GameRunStats } from '../game/rules';

interface StatusModalsProps {
  state: 'paused' | 'gameover' | 'victory';
  stats: GameRunStats;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onNextStage?: () => void;
  hasNextStage?: boolean;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  state,
  stats,
  onResume,
  onRestart,
  onTitle,
  onNextStage,
  hasNextStage,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
      {/* 1. PAUSE MODAL */}
      {state === 'paused' && (
        <div className="bg-slate-950 border border-slate-800 max-w-md w-full p-6 shadow-2xl text-center">
          <div className="text-xs font-mono tracking-widest text-cyan-400 uppercase mb-1">
            Telemetry Paused
          </div>
          <h2 className="text-3xl font-black italic text-white uppercase tracking-tight mb-6">
            PURSUIT SUSPENDED
          </h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={onResume}
              aria-label="Resume pursuit"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm uppercase tracking-widest transition-colors cursor-pointer"
            >
              RESUME [ESC / P]
            </button>
            <button
              onClick={onRestart}
              aria-label="Restart mission"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              RESTART SECTOR
            </button>
            <button
              onClick={onTitle}
              aria-label="Return to title screen"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-zinc-400 hover:text-white border border-slate-800 font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* 2. VICTORY / STAGE CLEAR MODAL */}
      {state === 'victory' && (
        <div className="bg-slate-950 border border-cyan-500/60 max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            MISSION SUCCESS // EXTRACTION COMPLETE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tight mb-6">
            APEX EVASION VERIFIED
          </h2>

          {/* Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Total Score</div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {stats.score.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Top Speed</div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 tabular-nums">
                {Math.round(stats.topSpeedMph)} MPH
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">0-60 MPH Benchmark</div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {stats.best0to60 ? `${stats.best0to60.toFixed(2)}s` : '--'}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Syndicate Neutralized</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {stats.syndicateNeutralized} UNITS
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {hasNextStage && onNextStage && (
              <button
                data-start="true"
                onClick={onNextStage}
                aria-label="Next Sector"
                className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm uppercase tracking-widest transition-colors cursor-pointer"
              >
                NEXT SECTOR
              </button>
            )}
            <button
              data-start="true"
              onClick={onRestart}
              aria-label="Replay Sector"
              className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              REPLAY SECTOR
            </button>
            <button
              onClick={onTitle}
              aria-label="Return to Main Menu"
              className="py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-zinc-400 hover:text-white border border-slate-800 font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              MENU
            </button>
          </div>
        </div>
      )}

      {/* 3. GAME OVER (DEFEAT) MODAL */}
      {state === 'gameover' && (
        <div className="bg-slate-950 border border-rose-500/60 max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-950/80 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            CRITICAL HULL FAILURE // VEHICLE IMMOBILIZED
          </div>
          <h2 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tight mb-6">
            PURSUIT TERMINATED
          </h2>

          {/* Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Distance Reached</div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {Math.round(stats.distanceTraveled)}m
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Top Speed</div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 tabular-nums">
                {Math.round(stats.topSpeedMph)} MPH
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Final Score</div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {stats.score.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Near Misses</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {stats.nearMissCount}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              data-start="true"
              onClick={onRestart}
              aria-label="Retry Mission"
              className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm uppercase tracking-widest transition-colors cursor-pointer"
            >
              RETRY LAUNCH
            </button>
            <button
              onClick={onTitle}
              aria-label="Return to Main Menu"
              className="py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-zinc-400 hover:text-white border border-slate-800 font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
