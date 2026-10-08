import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Sparkles, User, Scissors, Shirt, Check, RotateCw, ZoomIn, ZoomOut, Palette } from 'lucide-react';
import { CharacterCustomization, HairstyleType, FacialHairType, EyewearType, BodyType, OutfitType } from '../types/game';
import { GameEngine, DEFAULT_CHARACTER_CUSTOMIZATION } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';

interface CharacterCustomizationModalProps {
  engine: GameEngine | null;
  isOpen: boolean;
  onClose: () => void;
  initialCustomization?: CharacterCustomization;
  onSave?: (customization: CharacterCustomization) => void;
}

const HAIRSTYLES: Array<{ id: HairstyleType; label: string; desc: string }> = [
  { id: 'short_fade', label: 'Tactical Fade', desc: 'Clean, tapered military cut' },
  { id: 'mohawk', label: 'Cyberpunk Mohawk', desc: 'High crest with neon spikes' },
  { id: 'pompadour', label: 'Retro Pompadour', desc: 'Swept-up high-volume vintage crest' },
  { id: 'cyber_ponytail', label: 'Cyber Ponytail', desc: 'Sleek topknot with cybernetic binding' },
  { id: 'buzz', label: 'Buzz Cut', desc: 'Close-cropped utilitarian shave' },
  { id: 'afro', label: 'Afro Crown', desc: 'Full, rounded sculpted silhouette' },
  { id: 'long_wavy', label: 'Shoulder Wavy', desc: 'Flowing rebellious locks' },
];

const HAIR_COLORS = [
  { hex: '#111111', label: 'Jet Black' },
  { hex: '#3b251a', label: 'Espresso Brown' },
  { hex: '#78350f', label: 'Auburn' },
  { hex: '#e6ddb8', label: 'Platinum Blonde' },
  { hex: '#00f0ff', label: 'Neon Cyan' },
  { hex: '#ff007f', label: 'Hot Cyber Pink' },
  { hex: '#dc2626', label: 'Crimson Red' },
  { hex: '#10b981', label: 'Acid Emerald' },
  { hex: '#9333ea', label: 'Electric Purple' },
  { hex: '#f8fafc', label: 'Synth White' },
];

const SKIN_TONES = [
  { hex: '#fde2d0', label: 'Nordic Light' },
  { hex: '#d9a07a', label: 'Warm Olive' },
  { hex: '#af7a52', label: 'Golden Bronze' },
  { hex: '#7c4a2d', label: 'Deep Amber' },
  { hex: '#452615', label: 'Rich Espresso' },
  { hex: '#cbd5e1', label: 'Cyber Porcelain' },
];

const FACIAL_HAIR: Array<{ id: FacialHairType; label: string }> = [
  { id: 'none', label: 'Clean Shaven' },
  { id: 'stubble', label: '5 O’Clock Stubble' },
  { id: 'goatee', label: 'Sculpted Goatee' },
  { id: 'full_beard', label: 'Rugged Full Beard' },
  { id: 'moustache', label: 'Classic Moustache' },
];

const EYEWEAR: Array<{ id: EyewearType; label: string; desc: string }> = [
  { id: 'none', label: 'None', desc: 'Natural vision' },
  { id: 'cyber_shades', label: 'Matrix Cyber Shades', desc: 'Polarized dark specs' },
  { id: 'hud_visor', label: 'Tactical HUD Visor', desc: 'Glowing augmented optics' },
  { id: 'cyber_eye', label: 'Bionic Eye Implant', desc: 'Glowing optic cyberware' },
];

const BODY_TYPES: Array<{ id: BodyType; label: string; desc: string }> = [
  { id: 'balanced', label: 'Athletic / Balanced', desc: 'Versatile, standard metropolitan build' },
  { id: 'muscular', label: 'Muscular / Heavy', desc: 'Broad shoulders, powerful brawny frame' },
  { id: 'slim', label: 'Slim / Agile', desc: 'Lean, aerodynamic stealth silhouette' },
];

const OUTFITS: Array<{ id: OutfitType; label: string; desc: string }> = [
  { id: 'cyber_leather', label: 'Cyber Leather Jacket', desc: 'Reinforced street jacket with neon piping' },
  { id: 'street_hoodie', label: 'Urban Streetwear', desc: 'Casual heavyweight hoodie and tech-cargo' },
  { id: 'tactical_vest', label: 'Tactical Combat Vest', desc: 'Kevlar ballistic plate and tactical pouches' },
  { id: 'formal_suit', label: 'High-Roller Hitman Suit', desc: 'Tailored sharp syndicate two-piece' },
];

const JACKET_COLORS = [
  { hex: '#1e293b', label: 'Slate Shadow' },
  { hex: '#09090b', label: 'Obsidian Black' },
  { hex: '#7f1d1d', label: 'Blood Burgundy' },
  { hex: '#065f46', label: 'Tactical Olive' },
  { hex: '#1e3a8a', label: 'Midnight Navy' },
  { hex: '#d97706', label: 'Hazard Amber' },
  { hex: '#581c87', label: 'Royal Violet' },
];

const PANTS_COLORS = [
  { hex: '#334155', label: 'Dark Charcoal' },
  { hex: '#0f172a', label: 'Pitch Midnight' },
  { hex: '#1e293b', label: 'Steel Grey' },
  { hex: '#475569', label: 'Camo Slate' },
  { hex: '#991b1b', label: 'Crimson Cargo' },
  { hex: '#0284c7', label: 'Denim Cyan' },
];

const PRESETS: Array<{ name: string; tag: string; data: CharacterCustomization }> = [
  {
    name: 'Cyber Mercenary',
    tag: 'Aggressive street operative',
    data: {
      hairstyle: 'mohawk',
      hairColor: '#00f0ff',
      skinTone: '#d9a07a',
      facialHair: 'stubble',
      facialHairColor: '#111111',
      eyewear: 'hud_visor',
      eyewearColor: '#00f0ff',
      bodyType: 'muscular',
      outfit: 'cyber_leather',
      jacketColor: '#1e293b',
      pantsColor: '#334155',
    },
  },
  {
    name: 'Downtown Fixer',
    tag: 'Syndicate diplomat',
    data: {
      hairstyle: 'pompadour',
      hairColor: '#111111',
      skinTone: '#fde2d0',
      facialHair: 'goatee',
      facialHairColor: '#111111',
      eyewear: 'cyber_shades',
      eyewearColor: '#111111',
      bodyType: 'balanced',
      outfit: 'formal_suit',
      jacketColor: '#09090b',
      pantsColor: '#0f172a',
    },
  },
  {
    name: 'Street Drifter',
    tag: 'Speedway racer',
    data: {
      hairstyle: 'cyber_ponytail',
      hairColor: '#ff007f',
      skinTone: '#af7a52',
      facialHair: 'none',
      facialHairColor: '#111111',
      eyewear: 'hud_visor',
      eyewearColor: '#ff007f',
      bodyType: 'slim',
      outfit: 'street_hoodie',
      jacketColor: '#d97706',
      pantsColor: '#1e293b',
    },
  },
  {
    name: 'Tactical Spectre',
    tag: 'Ghost contractor',
    data: {
      hairstyle: 'buzz',
      hairColor: '#f8fafc',
      skinTone: '#cbd5e1',
      facialHair: 'full_beard',
      facialHairColor: '#f8fafc',
      eyewear: 'cyber_eye',
      eyewearColor: '#00f0ff',
      bodyType: 'balanced',
      outfit: 'tactical_vest',
      jacketColor: '#065f46',
      pantsColor: '#1e293b',
    },
  },
];

export const CharacterCustomizationModal: React.FC<CharacterCustomizationModalProps> = ({
  engine,
  isOpen,
  onClose,
  initialCustomization,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'hair' | 'face' | 'body' | 'outfit' | 'presets'>('hair');
  const [customization, setCustomization] = useState<CharacterCustomization>(() => {
    return initialCustomization || engine?.customization || { ...DEFAULT_CHARACTER_CUSTOMIZATION };
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);
  const cameraFocusRef = useRef<'full' | 'head'>('full');

  // Preview 3D setup
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();

    // Studio Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xbae6fd, 2.2);
    keyLight.position.set(3, 4, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf43f5e, 1.2);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 1.8, 10);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    camera.position.set(0, 1.3, 3.2);
    camera.lookAt(0, 1.15, 0);

    // Build Preview Rig
    const rigGroup = new THREE.Group();
    scene.add(rigGroup);

    // Build meshes matching current customization
    const buildRig = (c: CharacterCustomization) => {
      // Clear previous children
      while (rigGroup.children.length > 0) {
        rigGroup.remove(rigGroup.children[0]);
      }

      const bodyScale = c.bodyType === 'muscular' ? 1.18 : c.bodyType === 'slim' ? 0.88 : 1.0;
      const armScale = c.bodyType === 'muscular' ? 1.25 : c.bodyType === 'slim' ? 0.85 : 1.0;

      // Torso
      const torsoMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.jacketColor),
        roughness: c.outfit === 'cyber_leather' ? 0.4 : 0.7,
        metalness: c.outfit === 'cyber_leather' ? 0.3 : 0.05,
      });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55 * bodyScale, 0.75, 0.3 * bodyScale), torsoMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      rigGroup.add(torso);

      // Head
      const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.skinTone), roughness: 0.75 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
      head.position.y = 1.72;
      head.castShadow = true;
      rigGroup.add(head);

      // Hair
      const hairMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.hairColor),
        roughness: 0.5,
      });

      if (c.hairstyle === 'short_fade') {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
        h.position.y = 1.9;
        rigGroup.add(h);
      } else if (c.hairstyle === 'buzz') {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.08, 0.33), hairMat);
        h.position.y = 1.88;
        rigGroup.add(h);
      } else if (c.hairstyle === 'mohawk') {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.36), hairMat);
        h.position.set(0, 1.98, 0.02);
        rigGroup.add(h);
      } else if (c.hairstyle === 'pompadour') {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.36), hairMat);
        h.position.set(0, 1.94, -0.04);
        rigGroup.add(h);
      } else if (c.hairstyle === 'cyber_ponytail') {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), hairMat);
        cap.position.y = 1.9;
        rigGroup.add(cap);

        const pony = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 12), hairMat);
        pony.position.set(0, 1.75, -0.26);
        pony.rotation.x = -Math.PI / 6;
        rigGroup.add(pony);
      } else if (c.hairstyle === 'afro') {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.44), hairMat);
        h.position.y = 1.95;
        rigGroup.add(h);
      } else if (c.hairstyle === 'long_wavy') {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.35), hairMat);
        cap.position.y = 1.9;
        rigGroup.add(cap);

        const leftStrand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.18), hairMat);
        leftStrand.position.set(-0.18, 1.62, 0.02);
        rigGroup.add(leftStrand);

        const rightStrand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.18), hairMat);
        rightStrand.position.set(0.18, 1.62, 0.02);
        rigGroup.add(rightStrand);
      }

      // Facial Hair
      if (c.facialHair !== 'none') {
        const beardMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(c.facialHairColor || c.hairColor),
          roughness: 0.7,
        });

        if (c.facialHair === 'stubble') {
          const stubble = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.14, 0.18), beardMat);
          stubble.position.set(0, 1.6, 0.1);
          rigGroup.add(stubble);
        } else if (c.facialHair === 'goatee') {
          const goatee = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.16), beardMat);
          goatee.position.set(0, 1.58, 0.12);
          rigGroup.add(goatee);
        } else if (c.facialHair === 'full_beard') {
          const beard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.22), beardMat);
          beard.position.set(0, 1.56, 0.1);
          rigGroup.add(beard);
        } else if (c.facialHair === 'moustache') {
          const stache = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.12), beardMat);
          stache.position.set(0, 1.64, 0.14);
          rigGroup.add(stache);
        }
      }

      // Eyewear
      if (c.eyewear !== 'none') {
        if (c.eyewear === 'cyber_shades') {
          const shadeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.9 });
          const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), shadeMat);
          shades.position.set(0, 1.74, 0.14);
          rigGroup.add(shades);
        } else if (c.eyewear === 'hud_visor') {
          const visorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(c.eyewearColor || '#00f0ff'),
            emissive: new THREE.Color(c.eyewearColor || '#00f0ff'),
            emissiveIntensity: 0.7,
            roughness: 0.1,
          });
          const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.14), visorMat);
          visor.position.set(0, 1.74, 0.14);
          rigGroup.add(visor);
        } else if (c.eyewear === 'cyber_eye') {
          const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.9,
          });
          const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), eyeMat);
          eye.rotation.x = Math.PI / 2;
          eye.position.set(0.09, 1.74, 0.16);
          rigGroup.add(eye);
        }
      }

      // Legs
      const pantsMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.pantsColor), roughness: 0.8 });
      const legGeo = new THREE.BoxGeometry(0.2 * bodyScale, 0.75, 0.22 * bodyScale);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.14 * bodyScale, 0.38, 0);
      rigGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.14 * bodyScale, 0.38, 0);
      rigGroup.add(rightLeg);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.16 * armScale, 0.65, 0.18 * armScale);
      const leftArm = new THREE.Mesh(armGeo, torsoMat);
      leftArm.position.set(-0.35 * bodyScale, 1.1, 0);
      rigGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, torsoMat);
      rightArm.position.set(0.35 * bodyScale, 1.1, 0);
      rigGroup.add(rightArm);
    };

    buildRig(customization);

    // Animation Loop
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      rigGroup.rotation.y = rotationRef.current;

      // Adjust camera focus
      if (cameraFocusRef.current === 'head') {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.75, 0.1);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 1.4, 0.1);
        camera.lookAt(0, 1.72, 0);
      } else {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.25, 0.1);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 3.2, 0.1);
        camera.lookAt(0, 1.1, 0);
      }

      renderer.render(scene, camera);
    };
    render();

    // Mouse Drag Rotation
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseXRef.current = e.clientX;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      rotationRef.current += dx * 0.015;
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.dispose();
    };
  }, [isOpen, customization]);

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof CharacterCustomization>(key: K, value: CharacterCustomization[K]) => {
    soundManager.playUIClick();
    setCustomization((prev) => {
      const next = { ...prev, [key]: value };
      if (engine) {
        engine.updatePlayerCustomization(next);
      }
      return next;
    });
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    soundManager.playUIClick();
    setCustomization(preset.data);
    if (engine) {
      engine.updatePlayerCustomization(preset.data);
    }
  };

  const handleSaveAndClose = () => {
    soundManager.playMissionComplete();
    if (engine) {
      engine.updatePlayerCustomization(customization);
      engine.saveGame();
    }
    if (onSave) onSave(customization);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl select-none">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Header Badge */}
        <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
          <span className="p-1.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg">
            <Scissors className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">AGAT CHARACTER STYLIST</h2>
            <p className="text-[11px] text-slate-400 font-mono">PERSONA & CYBERNETIC CUSTOMIZATION</p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: 3D Character Preview Viewport */}
        <div className="md:w-5/12 h-64 md:h-full relative bg-radial from-slate-900 via-slate-950 to-black flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-800">
          <canvas ref={previewCanvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

          {/* Viewport Overlay Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="flex items-center gap-1.5 text-[11px]">
              <RotateCw className="w-3.5 h-3.5 text-sky-400 animate-spin-slow" /> Drag to Rotate
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  cameraFocusRef.current = 'head';
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Head Focus
              </button>
              <button
                onClick={() => {
                  cameraFocusRef.current = 'full';
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Full Body
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Customization Categories & Controls */}
        <div className="md:w-7/12 h-full flex flex-col justify-between p-6 overflow-hidden">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 mt-8 md:mt-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('hair')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'hair' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Hair & Beard</span>
            </button>
            <button
              onClick={() => setActiveTab('face')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'face' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Face & Cyber</span>
            </button>
            <button
              onClick={() => setActiveTab('body')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'body' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Body Type</span>
            </button>
            <button
              onClick={() => setActiveTab('outfit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'outfit' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Outfits</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'presets' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-2">
            {/* TAB: HAIR & BEARD */}
            {activeTab === 'hair' && (
              <div className="space-y-5">
                {/* Hairstyle Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Hairstyle Cut
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {HAIRSTYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => handleUpdate('hairstyle', style.id)}
                        className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                          customization.hairstyle === style.id
                            ? 'bg-sky-500/15 border-sky-400 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{style.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color Palette */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Hair Color Dye
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {HAIR_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => handleUpdate('hairColor', col.hex)}
                        title={col.label}
                        className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          customization.hairColor === col.hex
                            ? 'border-sky-400 bg-sky-500/20'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="text-[10px] text-slate-300 truncate w-full text-center">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Facial Hair Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Facial Hair Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FACIAL_HAIR.map((fh) => (
                      <button
                        key={fh.id}
                        onClick={() => handleUpdate('facialHair', fh.id)}
                        className={`p-2 rounded-lg text-center text-xs font-medium border transition-all cursor-pointer ${
                          customization.facialHair === fh.id
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {fh.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FACE & CYBERNETICS */}
            {activeTab === 'face' && (
              <div className="space-y-5">
                {/* Skin Tone Swatches */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Complexion / Skin Tone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SKIN_TONES.map((st) => (
                      <button
                        key={st.hex}
                        onClick={() => handleUpdate('skinTone', st.hex)}
                        className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-all cursor-pointer ${
                          customization.skinTone === st.hex
                            ? 'border-sky-400 bg-sky-500/20'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: st.hex }} />
                        <span className="text-xs text-slate-300">{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eyewear & Optics */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Eyewear & Optical Cyberware
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {EYEWEAR.map((eye) => (
                      <button
                        key={eye.id}
                        onClick={() => handleUpdate('eyewear', eye.id)}
                        className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                          customization.eyewear === eye.id
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{eye.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{eye.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BODY TYPE */}
            {activeTab === 'body' && (
              <div className="space-y-4">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Protagonist Physique & Silhouette
                </label>
                <div className="space-y-3">
                  {BODY_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      onClick={() => handleUpdate('bodyType', bt.id)}
                      className={`w-full p-4 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                        customization.bodyType === bt.id
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-white">{bt.label}</div>
                        <div className="text-xs text-slate-400 mt-1">{bt.desc}</div>
                      </div>
                      {customization.bodyType === bt.id && <Check className="w-5 h-5 text-sky-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: OUTFITS */}
            {activeTab === 'outfit' && (
              <div className="space-y-5">
                {/* Outfit Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Attire Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTFITS.map((out) => (
                      <button
                        key={out.id}
                        onClick={() => handleUpdate('outfit', out.id)}
                        className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                          customization.outfit === out.id
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{out.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{out.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jacket Color */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Jacket & Torso Tint
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {JACKET_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => handleUpdate('jacketColor', col.hex)}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                          customization.jacketColor === col.hex
                            ? 'border-sky-400 bg-sky-500/20'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: col.hex }} />
                        <span className="text-[11px] text-slate-300 truncate">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pants Color */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                    Pants & Cargo Tint
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PANTS_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => handleUpdate('pantsColor', col.hex)}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                          customization.pantsColor === col.hex
                            ? 'border-sky-400 bg-sky-500/20'
                            : 'border-slate-800 bg-slate-950/60'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: col.hex }} />
                        <span className="text-[11px] text-slate-300 truncate">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Curated Stylist Presets
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => handleApplyPreset(p)}
                      className="p-3.5 rounded-xl text-left bg-slate-950/70 border border-slate-800 hover:border-sky-400/80 transition-all cursor-pointer group"
                    >
                      <div className="font-bold text-sm text-white group-hover:text-sky-300">{p.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{p.tag}</div>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-sky-400 font-mono">
                        <span>APPLY PRESET →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveAndClose}
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>APPLY & SAVE STYLE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
