/**
 * Low-Occlusion In-Game HUD for Tesla Roadster: Apex Pursuit
 * Strictly adheres to game craft directives:
 * - >85% clear playfield with pointer-events: none wrapper
 * - No CSS backdrop-filter over active WebGL
 * - Tabular-nums integer readouts for speed, meters, and sprint timer
 * - Code-authored SVG icons for utilities and gauges
 */

import React from 'react';
import { CameraViewMode } from '../game/three/engine';

export interface HUDData {
  speedMph: number;
  speedKph: number;
  thrusterGas: number;
  thrusterActive: boolean;
  batteryThermal: number;
  hullIntegrity: number;
  empCharge: number;
  distance: number;
  targetDistance: number;
  sprint0to60: number | null;
  sprintTimer: number;
  score: number;
  cameraMode: CameraViewMode;
  isMuted: boolean;
}

interface GameHUDProps {
  data: HUDData;
  onPause: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onTriggerEMP: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  data,
  onPause,
  onCycleCamera,
  onToggleMute,
  onTriggerEMP,
}) => {
  const isOverheating = data.batteryThermal > 85;
  const isCriticalHull = data.hullIntegrity < 25;
  const isEMPReady = data.empCharge >= 95;

  const progressPercent =
    data.targetDistance > 0 ? Math.min(100, (data.distance / data.targetDistance) * 100) : null;

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none z-10">
      {/* TOP BAR CLUSTER */}
      <div className="flex justify-between items-start">
        {/* Top-Left: Syndicate Threat & Sector Progress */}
        <div className="pointer-events-auto bg-slate-950/85 border border-slate-800 p-3 shadow-lg min-w-[220px]">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
              Syndicate Threat
            </span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-rose-400 uppercase">
              DEFCON 1 // PURSUIT
            </span>
          </div>

          {progressPercent !== null ? (
            <div>
              <div className="flex justify-between text-xs font-mono font-bold text-zinc-300 mb-1">
                <span>EXTRACTION ZONE</span>
                <span className="tabular-nums text-cyan-400">
                  {Math.round(data.distance)}m / {data.targetDistance}m
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-between text-xs font-mono text-zinc-300">
              <span>DISTANCE SPRINT</span>
              <span className="tabular-nums text-cyan-400 font-bold">{Math.round(data.distance)}m</span>
            </div>
          )}

          <div className="mt-1 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>SCORE</span>
            <span className="text-white font-bold tabular-nums">{data.score.toLocaleString()} PTS</span>
          </div>
        </div>

        {/* Top-Right: Compact Utility Icon Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Camera View Switcher */}
          <button
            onClick={onCycleCamera}
            aria-label={`Cycle Camera View (Current: ${data.cameraMode})`}
            tabIndex={-1}
            className="w-10 h-10 bg-slate-950/85 border border-slate-800 hover:border-cyan-400 text-zinc-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            aria-label={data.isMuted ? 'Unmute Audio' : 'Mute Audio'}
            tabIndex={-1}
            className="w-10 h-10 bg-slate-950/85 border border-slate-800 hover:border-cyan-400 text-zinc-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            {data.isMuted ? (
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            aria-label="Pause Game"
            tabIndex={-1}
            className="w-10 h-10 bg-slate-950/85 border border-slate-800 hover:border-cyan-400 text-zinc-300 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* CENTER BOTTOM NOTIFICATIONS (EMP TRIGGER & 0-60 SPRINT) */}
      <div className="flex flex-col items-center gap-2 mb-2">
        {/* EMP Countermeasure Button / Cue */}
        <button
          onClick={onTriggerEMP}
          disabled={!isEMPReady}
          aria-label="Deploy EMP Shockwave"
          className={`pointer-events-auto px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2 cursor-pointer ${
            isEMPReady
              ? 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-300 shadow-lg shadow-cyan-500/40'
              : 'bg-slate-950/80 text-zinc-500 border-slate-800 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>EMP DISRUPTOR [E]</span>
          <span className="tabular-nums">({data.empCharge}%)</span>
        </button>

        {/* 0-60 Benchmark Badge */}
        {data.sprint0to60 ? (
          <div className="bg-slate-950/90 border border-cyan-400/50 px-3 py-1 text-xs font-mono text-cyan-300 flex items-center gap-2">
            <span className="font-bold">0-60 MPH BENCHMARK:</span>
            <span className="text-white font-black tabular-nums text-sm">{data.sprint0to60.toFixed(2)}s</span>
          </div>
        ) : data.sprintTimer > 0 && data.speedMph < 60 ? (
          <div className="bg-slate-950/90 border border-slate-800 px-3 py-1 text-xs font-mono text-amber-400 flex items-center gap-2">
            <span>0-60 SPRINTING:</span>
            <span className="text-white font-bold tabular-nums">{data.sprintTimer.toFixed(2)}s</span>
          </div>
        ) : null}
      </div>

      {/* BOTTOM PERIMETER CLUSTERS */}
      <div className="flex justify-between items-end">
        {/* Bottom-Left: Roadster Digital Instrument Cluster */}
        <div className="pointer-events-auto bg-slate-950/90 border border-slate-800 p-4 shadow-2xl min-w-[200px]">
          <div className="flex items-baseline gap-2">
            <div className="text-5xl sm:text-6xl font-black italic tracking-tighter text-white tabular-nums">
              {data.speedMph}
            </div>
            <div className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">
              MPH
            </div>
          </div>

          <div className="text-xs font-mono text-zinc-400 tabular-nums flex items-center gap-2 mt-0.5">
            <span>{data.speedKph} KM/H</span>
            <span>·</span>
            <span className="text-cyan-300 font-bold tracking-wider">PLAID MODE</span>
          </div>

          {/* Cold-Gas Thruster Surge Alert */}
          {data.thrusterActive && (
            <div className="mt-2 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-400/40 px-2 py-0.5 tracking-wider uppercase">
              SPACEX THRUSTER ENGAGED
            </div>
          )}
        </div>

        {/* Bottom-Right: Systems & Vitallity Cluster */}
        <div className="pointer-events-auto bg-slate-950/90 border border-slate-800 p-4 shadow-2xl min-w-[220px] flex flex-col gap-2.5">
          {/* SpaceX Cold-Gas Thruster Nitrogen Tank */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="text-zinc-400">NITROGEN THRUSTER [SHIFT]</span>
              <span className="text-cyan-400 font-bold tabular-nums">{data.thrusterGas}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  data.thrusterGas > 20 ? 'bg-cyan-400' : 'bg-rose-500'
                }`}
                style={{ width: `${data.thrusterGas}%` }}
              />
            </div>
          </div>

          {/* Hull Integrity (3-State Socket Bar) */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className={isCriticalHull ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                HULL INTEGRITY
              </span>
              <span className={`font-bold tabular-nums ${isCriticalHull ? 'text-rose-400' : 'text-white'}`}>
                {data.hullIntegrity}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  data.hullIntegrity > 50 ? 'bg-emerald-400' : data.hullIntegrity > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${data.hullIntegrity}%` }}
              />
            </div>
          </div>

          {/* Battery Thermal Monitor */}
          <div className="flex justify-between items-center text-xs font-mono border-t border-slate-800 pt-1.5">
            <span className="text-zinc-400">PACK THERMAL</span>
            <span className={`font-bold tabular-nums ${isOverheating ? 'text-rose-400' : 'text-emerald-400'}`}>
              {data.batteryThermal}°C {isOverheating ? '· OVERHEAT' : '· NOMINAL'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
