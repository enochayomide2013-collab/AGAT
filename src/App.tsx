import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { MapModal } from './components/MapModal';
import { ShopModal } from './components/ShopModal';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new GameEngine(canvasRef.current);
    game.isPaused = true; // wait for player to click Enter / Continue in Main Menu

    game.onStateUpdate = () => {
      // Periodic trigger for HUD react state
      setTick((t) => (t + 1) % 1000);

      // Check player health for game over
      if (game.playerHealth <= 0 && !isGameOver) {
        setIsGameOver(true);
        game.isPaused = true;
      }
    };

    game.onToggleShop = () => {
      setIsShopOpen((prev) => !prev);
    };

    setEngine(game);

    return () => {
      game.dispose();
    };
  }, []);

  // Keyboard shortcut for Map (M), Shop (B), & Pause (Esc)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return;

      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        setIsMapOpen((prev) => !prev);
      } else if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
        setIsShopOpen((prev) => !prev);
      } else if (e.code === 'Escape') {
        if (isShopOpen) {
          setIsShopOpen(false);
        } else if (isMapOpen) {
          setIsMapOpen(false);
        } else {
          setIsPaused((prev) => {
            const next = !prev;
            if (engine) engine.isPaused = next;
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isPlaying, isGameOver, isMapOpen, isShopOpen, engine]);

  const handleStartGame = () => {
    setIsPlaying(true);
    setIsPaused(false);
    if (engine) {
      engine.isPaused = false;
    }
    setTimeout(() => {
      canvasRef.current?.focus();
    }, 50);
  };

  const handleResumeGame = () => {
    setIsPaused(false);
    if (engine) {
      engine.isPaused = false;
    }
    setTimeout(() => {
      canvasRef.current?.focus();
    }, 50);
  };

  const handleReturnMainMenu = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsMapOpen(false);
    setIsShopOpen(false);
    if (engine) {
      engine.isPaused = true;
    }
  };

  const hasSavedData = !!localStorage.getItem('agat_save_data');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="w-full h-full block cursor-crosshair focus:outline-none"
      />

      {/* In-Game HUD (Active when playing) */}
      {isPlaying && !isPaused && !isMapOpen && !isShopOpen && !isGameOver && (
        <HUD
          engine={engine}
          onOpenMap={() => setIsMapOpen(true)}
          onOpenPause={() => {
            setIsPaused(true);
            if (engine) engine.isPaused = true;
          }}
          onOpenShop={() => setIsShopOpen(true)}
        />
      )}

      {/* Main Menu (Start screen) */}
      {!isPlaying && (
        <MainMenu
          onStartGame={handleStartGame}
          hasSavedGame={hasSavedData}
          engine={engine}
        />
      )}

      {/* Pause Menu (Esc) */}
      {isPlaying && isPaused && !isGameOver && (
        <PauseMenu
          engine={engine}
          onResume={handleResumeGame}
          onOpenMap={() => {
            setIsPaused(false);
            setIsMapOpen(true);
          }}
          onReturnMainMenu={handleReturnMainMenu}
        />
      )}

      {/* Interactive Map Modal (M) */}
      {isMapOpen && (
        <MapModal
          engine={engine}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      {/* In-Game Shop Modal (B) */}
      {isShopOpen && engine && (
        <ShopModal
          engine={engine}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* Game Over / Hospital Respawn Modal */}
      {isGameOver && engine && (
        <GameOverModal
          engine={engine}
          onRespawn={() => {
            setIsGameOver(false);
            if (engine) engine.isPaused = false;
          }}
        />
      )}
    </div>
  );
}
