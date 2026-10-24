/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/three/engine';
import { GameState, GameRunStats, createInitialRunStats, STAGES } from './game/rules';
import { CAR_COLORS } from './game/three/carModel';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD, HUDData } from './components/GameHUD';
import { StatusModals } from './components/StatusModals';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedStageId, setSelectedStageId] = useState<number>(1);
  const [selectedColorHex, setSelectedColorHex] = useState<number>(CAR_COLORS.midnightCherry);
  const [endStats, setEndStats] = useState<GameRunStats>(createInitialRunStats());

  const [hudData, setHudData] = useState<HUDData>({
    speedMph: 0,
    speedKph: 0,
    thrusterGas: 100,
    thrusterActive: false,
    batteryThermal: 24,
    hullIntegrity: 100,
    empCharge: 100,
    distance: 0,
    targetDistance: 2500,
    sprint0to60: null,
    sprintTimer: 0,
    score: 0,
    cameraMode: 'chase',
    isMuted: false,
  });

  // Callbacks for Three.js engine
  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  const handleHUDUpdate = useCallback((data: HUDData) => {
    setHudData(data);
  }, []);

  const handleGameOver = useCallback((stats: GameRunStats, _won: boolean) => {
    setEndStats(stats);
  }, []);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current, {
      onStateChange: handleStateChange,
      onHUDUpdate: handleHUDUpdate,
      onGameOver: handleGameOver,
    });
    engineRef.current = engine;

    // Check ?autostart=1 query parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame();
    } else {
      document.body.dataset.state = 'title';
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleStateChange, handleHUDUpdate, handleGameOver]);

  // Actions
  const handleStart = () => {
    engineRef.current?.startGame();
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
  };

  const handleResume = () => {
    engineRef.current?.togglePause();
  };

  const handleRestart = () => {
    engineRef.current?.startGame();
  };

  const handleTitle = () => {
    engineRef.current?.returnToTitle();
  };

  const handleSelectStage = (stageId: number) => {
    setSelectedStageId(stageId);
    engineRef.current?.setStage(stageId);
  };

  const handleSelectColor = (hex: number) => {
    setSelectedColorHex(hex);
    engineRef.current?.setCarColor(hex);
  };

  const handleCycleCamera = () => {
    engineRef.current?.cycleCameraView();
  };

  const handleToggleMute = () => {
    if (engineRef.current) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    }
  };

  const handleTriggerEMP = () => {
    engineRef.current?.triggerEMP();
  };

  const handleNextStage = () => {
    const nextId = selectedStageId + 1;
    if (nextId <= STAGES.length) {
      handleSelectStage(nextId);
      handleStart();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        data-testid="webgl-canvas-mount"
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStart}
          selectedStageId={selectedStageId}
          onSelectStage={handleSelectStage}
          selectedColorHex={selectedColorHex}
          onSelectColor={handleSelectColor}
        />
      )}

      {/* Active In-Game HUD Overlay */}
      {gameState === 'playing' && (
        <GameHUD
          data={hudData}
          onPause={handlePause}
          onCycleCamera={handleCycleCamera}
          onToggleMute={handleToggleMute}
          onTriggerEMP={handleTriggerEMP}
        />
      )}

      {/* Status Modals: Paused / Victory / Game Over */}
      {(gameState === 'paused' || gameState === 'gameover' || gameState === 'victory') && (
        <StatusModals
          state={gameState}
          stats={endStats}
          onResume={handleResume}
          onRestart={handleRestart}
          onTitle={handleTitle}
          onNextStage={handleNextStage}
          hasNextStage={selectedStageId < STAGES.length}
        />
      )}
    </div>
  );
}
