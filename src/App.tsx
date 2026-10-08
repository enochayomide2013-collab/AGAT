import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { MapModal } from './components/MapModal';
import { ShopModal } from './components/ShopModal';
import { GameOverModal } from './components/GameOverModal';
import { CharacterCustomizationModal } from './components/CharacterCustomizationModal';
import { StreetArtModal } from './components/StreetArtModal';
import { AlleyTagWallDef } from './types/game';
import { soundManager } from './engine/SoundManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState<boolean>(false);
  const [isStreetArtOpen, setIsStreetArtOpen] = useState<boolean>(false);
  const [activeTagWall, setActiveTagWall] = useState<AlleyTagWallDef | null>(null);
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

    game.onToggleCustomization = () => {
      setIsCustomizationOpen(true);
      game.isPaused = true;
      game.keys = {};
    };

    game.onOpenStreetArt = (wall) => {
      setActiveTagWall(wall);
      setIsStreetArtOpen(true);
      game.isPaused = true;
      game.keys = {};
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
        setIsMapOpen((prev) => {
          const next = !prev;
          if (engine) {
            engine.isPaused = next;
            engine.keys = {};
          }
          return next;
        });
      } else if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
        setIsShopOpen((prev) => {
          const next = !prev;
          if (engine) {
            engine.isPaused = next;
            engine.keys = {};
          }
          return next;
        });
      } else if (e.code === 'Escape') {
        if (isStreetArtOpen) {
          setIsStreetArtOpen(false);
          if (engine) {
            engine.isPaused = false;
            engine.keys = {};
          }
        } else if (isCustomizationOpen) {
          setIsCustomizationOpen(false);
          if (engine) {
            engine.isPaused = false;
            engine.keys = {};
          }
        } else if (isShopOpen) {
          setIsShopOpen(false);
          if (engine) {
            engine.isPaused = false;
            engine.keys = {};
          }
        } else if (isMapOpen) {
          setIsMapOpen(false);
          if (engine) {
            engine.isPaused = false;
            engine.keys = {};
          }
        } else {
          setIsPaused((prev) => {
            const next = !prev;
            if (engine) {
              engine.isPaused = next;
              engine.keys = {};
            }
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isPlaying, isGameOver, isMapOpen, isShopOpen, isCustomizationOpen, isStreetArtOpen, engine]);

  const handleStartGame = () => {
    soundManager.stopLandingMusic(1.5);
    setIsPlaying(true);
    setIsPaused(false);
    if (engine) {
      engine.keys = {};
      engine.isPaused = false;
    }
    setTimeout(() => {
      canvasRef.current?.focus();
    }, 50);
  };

  const handleResumeGame = () => {
    setIsPaused(false);
    if (engine) {
      engine.keys = {};
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
    soundManager.playLandingMusic();
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
          onOpenMap={() => {
            setIsMapOpen(true);
            if (engine) {
              engine.isPaused = true;
              engine.keys = {};
            }
          }}
          onOpenPause={() => {
            setIsPaused(true);
            if (engine) {
              engine.isPaused = true;
              engine.keys = {};
            }
          }}
          onOpenShop={() => {
            setIsShopOpen(true);
            if (engine) {
              engine.isPaused = true;
              engine.keys = {};
            }
          }}
        />
      )}

      {/* Main Menu (Start screen) */}
      {!isPlaying && (
        <MainMenu
          onStartGame={handleStartGame}
          hasSavedGame={hasSavedData}
          engine={engine}
          onOpenCustomization={() => setIsCustomizationOpen(true)}
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
          onClose={() => {
            setIsMapOpen(false);
            if (engine) {
              engine.isPaused = false;
              engine.keys = {};
            }
          }}
        />
      )}

      {/* In-Game Shop Modal (B) */}
      {isShopOpen && engine && (
        <ShopModal
          engine={engine}
          onClose={() => {
            setIsShopOpen(false);
            if (engine) {
              engine.isPaused = false;
              engine.keys = {};
            }
          }}
        />
      )}

      {/* Character Stylist / Customization Modal */}
      {isCustomizationOpen && (
        <CharacterCustomizationModal
          engine={engine}
          isOpen={isCustomizationOpen}
          onClose={() => {
            setIsCustomizationOpen(false);
            if (engine && isPlaying) {
              engine.isPaused = false;
              engine.keys = {};
            }
          }}
        />
      )}

      {/* Alley Street Art & Tagging Studio Modal */}
      {isStreetArtOpen && (
        <StreetArtModal
          wall={activeTagWall}
          isOpen={isStreetArtOpen}
          onClose={() => {
            setIsStreetArtOpen(false);
            if (engine && isPlaying) {
              engine.isPaused = false;
              engine.keys = {};
            }
          }}
          onSprayTag={async (dataUrl, sprayColor) => {
            setIsStreetArtOpen(false);
            if (engine && activeTagWall) {
              engine.isPaused = false;
              engine.keys = {};
              await engine.applyStreetArtTag(activeTagWall, dataUrl, sprayColor);
            }
          }}
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
