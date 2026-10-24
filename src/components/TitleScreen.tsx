/**
 * Title Screen for Tesla Roadster: Apex Pursuit
 * Live 3D vehicle turntable backdrop, bespoke inline SVG title lockup,
 * Stage selection, paint customizer, and clean control hints.
 */

import React from 'react';
import { CAR_COLORS } from '../game/three/carModel';
import { STAGES, StageConfig } from '../game/rules';

interface TitleScreenProps {
  onStart: () => void;
  selectedStageId: number;
  onSelectStage: (stageId: number) => void;
  selectedColorHex: number;
  onSelectColor: (hex: number) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  selectedStageId,
  onSelectStage,
  selectedColorHex,
  onSelectColor,
}) => {
  const colorOptions = [
    { name: 'Midnight Cherry', hex: CAR_COLORS.midnightCherry },
    { name: 'Liquid Quicksilver', hex: CAR_COLORS.apexSilver },
    { name: 'Stealth Matte', hex: CAR_COLORS.stealthMatte },
    { name: 'Deep Electric Blue', hex: CAR_COLORS.electricBlue },
    { name: 'Speed Yellow', hex: CAR_COLORS.speedYellow },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-10 select-none z-20">
      {/* Top Left: Title Lockup & Emblem over calm negative space */}
      <div className="pointer-events-auto max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          {/* Bespoke Tesla Roadster Apex Crest SVG */}
          <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 4L42 16V32L24 44L6 32V16L24 4Z"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="rgba(6, 182, 212, 0.15)"
            />
            <path d="M14 20H34M18 24H30M24 24V34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="14" r="2.5" fill="#38bdf8" />
          </svg>
          <div className="text-xs tracking-[0.28em] text-cyan-400 font-mono font-semibold uppercase">
            SpaceX Package // Tri-Motor Plaid
          </div>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight text-white uppercase leading-none drop-shadow-md">
          TESLA ROADSTER
          <span className="block text-2xl sm:text-4xl text-cyan-400 font-extrabold not-italic tracking-wider mt-1">
            APEX PURSUIT
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-zinc-300 mt-2 font-mono">
          0-60 in 1.1s · Cold-Gas Nitrogen Thrusters · Syndicate Threat Level: CRITICAL
        </p>

        {/* Start Game Primary CTA */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            data-start="true"
            onClick={onStart}
            aria-label="Initiate Pursuit Launch"
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-extrabold text-sm sm:text-base uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/30 flex items-center gap-3 cursor-pointer"
          >
            <span>INITIATE LAUNCH</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline-block">
            Press [ENTER] or [SPACE]
          </span>
        </div>
      </div>

      {/* Center-Right: Paint & Stage Selector */}
      <div className="pointer-events-auto self-start sm:self-end mt-4 sm:mt-0 flex flex-col gap-4 max-w-md w-full bg-slate-950/80 border border-slate-800 p-5 shadow-2xl">
        {/* Paint Swatches */}
        <div>
          <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2 flex justify-between">
            <span>Chassis Paint Finish</span>
            <span className="text-cyan-400">
              {colorOptions.find((c) => c.hex === selectedColorHex)?.name}
            </span>
          </div>
          <div className="flex gap-2">
            {colorOptions.map((opt) => (
              <button
                key={opt.hex}
                onClick={() => onSelectColor(opt.hex)}
                aria-label={`Select ${opt.name} paint`}
                style={{ backgroundColor: `#${opt.hex.toString(16).padStart(6, '0')}` }}
                className={`w-9 h-9 rounded-sm border-2 transition-all cursor-pointer ${
                  selectedColorHex === opt.hex ? 'border-cyan-400 scale-110 shadow-md shadow-cyan-400/50' : 'border-zinc-700 hover:border-zinc-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mission / Stage Selector */}
        <div>
          <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
            Pursuit Sector Operation
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STAGES.map((stage: StageConfig) => {
              const isSelected = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  onClick={() => onSelectStage(stage.id)}
                  aria-label={`Select stage ${stage.name}`}
                  className={`text-left p-2.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 text-white'
                      : 'bg-slate-900/40 border-slate-800 text-zinc-400 hover:border-slate-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono tracking-tight text-cyan-300">
                    STAGE 0{stage.id}
                  </div>
                  <div className="text-xs font-semibold truncate mt-0.5">{stage.name}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {stage.targetDistance > 0 ? `${stage.targetDistance}m Goal` : 'Infinite Survival'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Flat borderless control hints */}
      <div className="pointer-events-auto text-center py-2 text-zinc-400 font-mono text-xs sm:text-sm tracking-wide">
        <span className="text-zinc-200">WASD / Arrows</span> Drive ·{' '}
        <span className="text-cyan-400">Shift</span> SpaceX Thruster Boost ·{' '}
        <span className="text-amber-400">Space</span> Drift / E-Brake ·{' '}
        <span className="text-rose-400">E</span> EMP Shockwave ·{' '}
        <span className="text-zinc-200">C</span> Camera ·{' '}
        <span className="text-zinc-200">Esc / P</span> Pause
      </div>
    </div>
  );
};
