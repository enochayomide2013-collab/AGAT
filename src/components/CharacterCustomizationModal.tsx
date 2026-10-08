import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  X,
  Sparkles,
  User,
  Scissors,
  Shirt,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Palette,
  Eye,
  Smile,
  Crown,
  Shuffle,
  Play,
  Sliders,
} from 'lucide-react';
import {
  CharacterCustomization,
  HairstyleType,
  FacialHairType,
  EyewearType,
  HeadwearType,
  NoseType,
  FaceShapeType,
  EyebrowStyleType,
  BodyType,
  OutfitType,
  PantsType,
  ShoesType,
} from '../types/game';
import { GameEngine, DEFAULT_CHARACTER_CUSTOMIZATION } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { buildCharacterRig, CharacterRig, updateCharacterRigAnimation } from '../engine/CharacterRigBuilder';

interface CharacterCustomizationModalProps {
  engine: GameEngine | null;
  isOpen: boolean;
  onClose: () => void;
  initialCustomization?: CharacterCustomization;
  onSave?: (customization: CharacterCustomization) => void;
}

// ----------------------------------------------------------------------
// DATA CATALOG FOR STYLIST OPTIONS
// ----------------------------------------------------------------------

const HAIRSTYLES: Array<{ id: HairstyleType; label: string; desc: string }> = [
  { id: 'short_fade', label: 'Tactical Fade', desc: 'Clean, tapered military high-and-tight' },
  { id: 'buzz', label: 'Buzz Cut', desc: 'Close-cropped utilitarian shave' },
  { id: 'mohawk', label: 'Cyberpunk Mohawk', desc: 'High spiked crest with shaved sides' },
  { id: 'pompadour', label: 'Retro Pompadour', desc: 'Swept-up high-volume vintage street crest' },
  { id: 'cyber_ponytail', label: 'Cyber Samurai Topknot', desc: 'Sleek topknot with cybernetic binding' },
  { id: 'afro', label: 'Afro Crown', desc: 'Full, rounded sculpted silhouette' },
  { id: 'long_wavy', label: 'Shoulder Wavy Locks', desc: 'Flowing rebellious textured layers' },
  { id: 'dreadlocks', label: 'Urban Dreadlocks', desc: 'Layered rope twists with undercut' },
  { id: 'undercut', label: 'Slicked Undercut', desc: 'Razor-faded sides with slicked top' },
  { id: 'messy_spikes', label: 'Rebel Anime Spikes', desc: 'Volumetric angular anime spike crest' },
  { id: 'cornrows', label: 'Geometric Cornrows', desc: 'Precision braided architectural rows' },
  { id: 'slick_back', label: 'Wall Street Slick', desc: 'Glossy swept-back executive hair' },
];

const HAIR_COLORS = [
  { hex: '#111111', label: 'Jet Black' },
  { hex: '#3b251a', label: 'Espresso Brown' },
  { hex: '#5c3a21', label: 'Chestnut Auburn' },
  { hex: '#d4af37', label: 'Honey Blonde' },
  { hex: '#f1f5f9', label: 'Platinum Ice' },
  { hex: '#00f0ff', label: 'Neon Cyan' },
  { hex: '#ff007f', label: 'Hot Cyber Pink' },
  { hex: '#dc2626', label: 'Crimson Red' },
  { hex: '#10b981', label: 'Acid Emerald' },
  { hex: '#9333ea', label: 'Electric Purple' },
  { hex: '#ea580c', label: 'Blaze Orange' },
  { hex: '#94a3b8', label: 'Silver Wolf' },
];

const SKIN_TONES = [
  { hex: '#fde2d0', label: 'Nordic Light' },
  { hex: '#d9a07a', label: 'Warm Olive' },
  { hex: '#af7a52', label: 'Golden Bronze' },
  { hex: '#7c4a2d', label: 'Deep Amber' },
  { hex: '#452615', label: 'Rich Espresso' },
  { hex: '#cbd5e1', label: 'Cyber Porcelain' },
];

const EYE_COLORS = [
  { hex: '#00f0ff', label: 'Ice Cyan' },
  { hex: '#2563eb', label: 'Sapphire Blue' },
  { hex: '#10b981', label: 'Acid Emerald' },
  { hex: '#d97706', label: 'Golden Amber' },
  { hex: '#291811', label: 'Dark Hazel' },
  { hex: '#a855f7', label: 'Electric Violet' },
  { hex: '#ef4444', label: 'Crimson Glow' },
  { hex: '#e2e8f0', label: 'Synth Silver' },
];

const NOSE_TYPES: Array<{ id: NoseType; label: string; desc: string }> = [
  { id: 'straight', label: 'Straight Athletic', desc: 'Balanced clean geometric bridge' },
  { id: 'button', label: 'Compact Button', desc: 'Upturned rounded delicate tip' },
  { id: 'aquiline', label: 'Sharp Aquiline', desc: 'Prominent defined hooked silhouette' },
  { id: 'broad', label: 'Broad Fighter', desc: 'Wide powerful grounded bridge' },
];

const FACE_SHAPES: Array<{ id: FaceShapeType; label: string; desc: string }> = [
  { id: 'angular', label: 'Angular Chiseled', desc: 'Prominent jawline and cheek contours' },
  { id: 'square', label: 'Square Rugged', desc: 'Heavy brawny metropolitan jaw' },
  { id: 'round', label: 'Soft Rounded', desc: 'Gentle youth contours' },
  { id: 'sharp', label: 'Sharp Sleek', desc: 'Tapered aerodynamic chin' },
];

const EYEBROW_STYLES: Array<{ id: EyebrowStyleType; label: string }> = [
  { id: 'arched', label: 'Arched Defined' },
  { id: 'thick', label: 'Heavy Thick' },
  { id: 'straight', label: 'Straight Utilitarian' },
  { id: 'slit', label: 'Cyber Razor Slit' },
];

const FACIAL_HAIR: Array<{ id: FacialHairType; label: string }> = [
  { id: 'none', label: 'Clean Shaven' },
  { id: 'stubble', label: '5 O’Clock Stubble' },
  { id: 'goatee', label: 'Sculpted Goatee' },
  { id: 'full_beard', label: 'Rugged Full Beard' },
  { id: 'moustache', label: 'Classic Moustache' },
  { id: 'chinstrap', label: 'Cyber Chinstrap' },
];

const EYEWEAR: Array<{ id: EyewearType; label: string; desc: string }> = [
  { id: 'none', label: 'None', desc: 'Bare natural eyes' },
  { id: 'cyber_shades', label: 'Matrix Dark Shades', desc: 'Polarized dark rectangular specs' },
  { id: 'aviators', label: 'Gold Rim Aviators', desc: 'Classic pilot teardrop frames' },
  { id: 'hud_visor', label: 'Augmented HUD Visor', desc: 'Glowing cybernetic optics overlay' },
  { id: 'cyber_eye', label: 'Bionic Eye Implant', desc: 'Right socket optic camera unit' },
  { id: 'tactical_mask', label: 'Street Half-Mask', desc: 'Neoprene urban combat filter' },
];

const HEADWEAR: Array<{ id: HeadwearType; label: string; desc: string }> = [
  { id: 'none', label: 'No Headwear', desc: 'Uncovered hairstyle' },
  { id: 'baseball_cap', label: 'Snapback (Forward)', desc: 'Street baseball cap front bill' },
  { id: 'backwards_cap', label: 'Snapback (Backwards)', desc: 'Casual street backwards cap' },
  { id: 'beanie', label: 'Knit Street Beanie', desc: 'Folded warm winter slouch hat' },
  { id: 'cyber_headphones', label: 'Cyber DJ Headphones', desc: 'Over-ear neon glowing cans' },
  { id: 'tactical_helmet', label: 'Tactical Helmet', desc: 'Reinforced ballistic helmet' },
];

const BODY_TYPES: Array<{ id: BodyType; label: string; desc: string }> = [
  { id: 'balanced', label: 'Athletic / Balanced', desc: 'Standard metropolitan versatile frame' },
  { id: 'muscular', label: 'Muscular / Heavy', desc: 'Broad shoulders and powerful physique' },
  { id: 'slim', label: 'Slim / Agile', desc: 'Aerodynamic stealth runner build' },
  { id: 'heavy', label: 'Heavyweight Brawny', desc: 'Formidable bouncer stature' },
];

const OUTFITS: Array<{ id: OutfitType; label: string; desc: string }> = [
  { id: 'cyber_leather', label: 'Cyber Leather Jacket', desc: 'Reinforced street jacket with neon piping' },
  { id: 'street_hoodie', label: 'Urban Streetwear', desc: 'Heavyweight hoodie with kangaroo pouch' },
  { id: 'tactical_vest', label: 'Combat Tactical Vest', desc: 'Kevlar ballistic plate and ammo pouches' },
  { id: 'formal_suit', label: 'Syndicate Hitman Suit', desc: 'Tailored two-piece jacket, shirt & tie' },
  { id: 'track_jacket', label: 'Athletic Track Jacket', desc: 'Retro zip athletic jacket with side stripes' },
  { id: 'tank_top', label: 'Brawler Tank Top', desc: 'Bare-arm gym vest showing muscle frame' },
];

const PANTS_TYPES: Array<{ id: PantsType; label: string; desc: string }> = [
  { id: 'cargo_pants', label: 'Tactical Cargos', desc: 'Heavy-duty multi-pocket street cargos' },
  { id: 'slim_jeans', label: 'Distressed Slim Jeans', desc: 'Dark washed tapered denim' },
  { id: 'joggers', label: 'Athletic Joggers', desc: 'Elastic cuff lightweight street joggers' },
  { id: 'formal_slacks', label: 'Tailored Slacks', desc: 'Sharp pressed suit trousers' },
  { id: 'cyber_armor', label: 'Cyber Exo Greaves', desc: 'Armored knee & shin plate protection' },
];

const SHOES_TYPES: Array<{ id: ShoesType; label: string }> = [
  { id: 'high_tops', label: 'High-Top Sneakers' },
  { id: 'combat_boots', label: 'Tactical Combat Boots' },
  { id: 'skate_shoes', label: 'Skater Low-Tops' },
  { id: 'formal_oxfords', label: 'Polished Oxfords' },
];

const JACKET_COLORS = [
  { hex: '#1e293b', label: 'Slate Shadow' },
  { hex: '#09090b', label: 'Obsidian Black' },
  { hex: '#7f1d1d', label: 'Blood Burgundy' },
  { hex: '#065f46', label: 'Tactical Olive' },
  { hex: '#1e3a8a', label: 'Midnight Navy' },
  { hex: '#d97706', label: 'Hazard Amber' },
  { hex: '#581c87', label: 'Royal Violet' },
  { hex: '#e2e8f0', label: 'Synth White' },
];

const PANTS_COLORS = [
  { hex: '#334155', label: 'Dark Charcoal' },
  { hex: '#0f172a', label: 'Pitch Midnight' },
  { hex: '#1e293b', label: 'Steel Grey' },
  { hex: '#475569', label: 'Camo Slate' },
  { hex: '#991b1b', label: 'Crimson Cargo' },
  { hex: '#0284c7', label: 'Denim Cyan' },
  { hex: '#d97706', label: 'Ochre Sand' },
];

const PRESETS: Array<{ name: string; tag: string; data: CharacterCustomization }> = [
  {
    name: 'Neon Mercenary',
    tag: 'Cyberpunk street operative',
    data: {
      hairstyle: 'mohawk',
      hairColor: '#00f0ff',
      skinTone: '#d9a07a',
      eyeColor: '#00f0ff',
      noseType: 'straight',
      faceShape: 'angular',
      eyebrowStyle: 'slit',
      facialHair: 'stubble',
      facialHairColor: '#111111',
      eyewear: 'hud_visor',
      eyewearColor: '#00f0ff',
      headwear: 'none',
      bodyType: 'muscular',
      heightScale: 1.05,
      outfit: 'cyber_leather',
      jacketColor: '#1e293b',
      pantsType: 'cyber_armor',
      pantsColor: '#0f172a',
      shoes: 'combat_boots',
      shoesColor: '#09090b',
    },
  },
  {
    name: 'Downtown Syndicate',
    tag: 'Sharp high-stakes fixer',
    data: {
      hairstyle: 'pompadour',
      hairColor: '#111111',
      skinTone: '#fde2d0',
      eyeColor: '#d97706',
      noseType: 'aquiline',
      faceShape: 'angular',
      eyebrowStyle: 'arched',
      facialHair: 'goatee',
      facialHairColor: '#111111',
      eyewear: 'aviators',
      eyewearColor: '#d97706',
      headwear: 'none',
      bodyType: 'balanced',
      heightScale: 1.0,
      outfit: 'formal_suit',
      jacketColor: '#09090b',
      pantsType: 'formal_slacks',
      pantsColor: '#0f172a',
      shoes: 'formal_oxfords',
      shoesColor: '#09090b',
    },
  },
  {
    name: 'Underground Drifter',
    tag: 'Street racer & tag artist',
    data: {
      hairstyle: 'dreadlocks',
      hairColor: '#d4af37',
      skinTone: '#7c4a2d',
      eyeColor: '#10b981',
      noseType: 'broad',
      faceShape: 'square',
      eyebrowStyle: 'thick',
      facialHair: 'chinstrap',
      facialHairColor: '#3b251a',
      eyewear: 'cyber_shades',
      eyewearColor: '#00f0ff',
      headwear: 'cyber_headphones',
      headwearColor: '#0f172a',
      bodyType: 'balanced',
      heightScale: 1.0,
      outfit: 'street_hoodie',
      jacketColor: '#7f1d1d',
      pantsType: 'cargo_pants',
      pantsColor: '#1e293b',
      shoes: 'high_tops',
      shoesColor: '#f1f5f9',
    },
  },
  {
    name: 'Ghost Infiltrator',
    tag: 'Tactical covert specialist',
    data: {
      hairstyle: 'buzz',
      hairColor: '#f1f5f9',
      skinTone: '#cbd5e1',
      eyeColor: '#a855f7',
      noseType: 'aquiline',
      faceShape: 'sharp',
      eyebrowStyle: 'straight',
      facialHair: 'none',
      facialHairColor: '#111111',
      eyewear: 'tactical_mask',
      eyewearColor: '#00f0ff',
      headwear: 'tactical_helmet',
      headwearColor: '#1e293b',
      bodyType: 'slim',
      heightScale: 0.98,
      outfit: 'tactical_vest',
      jacketColor: '#065f46',
      pantsType: 'cargo_pants',
      pantsColor: '#0f172a',
      shoes: 'combat_boots',
      shoesColor: '#09090b',
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
  const [activeTab, setActiveTab] = useState<'hair' | 'face' | 'headwear' | 'outfit' | 'body' | 'presets' | 'finetuning'>('face');
  const [customization, setCustomization] = useState<CharacterCustomization>(() => {
    return initialCustomization || engine?.customization || { ...DEFAULT_CHARACTER_CUSTOMIZATION };
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);
  const cameraZoomRef = useRef<number>(3.0);
  const cameraFocusRef = useRef<'full' | 'head'>('head');
  const previewPoseRef = useRef<'idle' | 'walk' | 'sprint' | 'aim'>('idle');

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
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(2.5, 3.5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 2.2, 12);
    rimLight.position.set(-2, 2.5, -2.5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xff007f, 1.2);
    fillLight.position.set(-3, 1.5, 2);
    scene.add(fillLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(36, canvas.clientWidth / canvas.clientHeight, 0.1, 50);

    // Active Rig
    let currentRig: CharacterRig | null = null;

    const rebuildPreviewRig = (c: CharacterCustomization) => {
      if (currentRig) {
        scene.remove(currentRig.group);
      }
      currentRig = buildCharacterRig(c);
      scene.add(currentRig.group);
    };

    rebuildPreviewRig(customization);

    let animId: number;
    let walkCycle = 0;

    const renderLoop = (timeMs: number) => {
      animId = requestAnimationFrame(renderLoop);
      const time = timeMs * 0.001;

      if (currentRig) {
        currentRig.group.rotation.y = rotationRef.current;

        // Animate based on selected preview pose
        const pose = previewPoseRef.current;
        if (pose === 'walk') {
          walkCycle += 0.08;
          updateCharacterRigAnimation(currentRig, {
            isMoving: true,
            isSprinting: false,
            isCrouching: false,
            isAiming: false,
            walkCycle,
            time,
          });
        } else if (pose === 'sprint') {
          walkCycle += 0.14;
          updateCharacterRigAnimation(currentRig, {
            isMoving: true,
            isSprinting: true,
            isCrouching: false,
            isAiming: false,
            walkCycle,
            time,
          });
        } else if (pose === 'aim') {
          updateCharacterRigAnimation(currentRig, {
            isMoving: false,
            isSprinting: false,
            isCrouching: false,
            isAiming: true,
            walkCycle: 0,
            time,
          });
          // Aim weapon stance
          currentRig.arms[1].rotation.x = -1.45;
          currentRig.arms[0].rotation.x = -1.35;
          currentRig.arms[0].rotation.z = 0.35;
        } else {
          // Idle breathing with eye blinking
          updateCharacterRigAnimation(currentRig, {
            isMoving: false,
            isSprinting: false,
            isCrouching: false,
            isAiming: false,
            walkCycle: 0,
            time,
          });
        }
      }

      // Camera position handling
      const isHead = cameraFocusRef.current === 'head';
      const targetLookY = isHead ? 1.68 : 1.15;
      const targetDist = cameraZoomRef.current * (isHead ? 0.55 : 1.0);

      camera.position.set(0, isHead ? 1.72 : 1.25, targetDist);
      camera.lookAt(0, targetLookY, 0);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(renderLoop);

    // Mouse drag handlers for 360 preview rotation
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseXRef.current = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - lastMouseXRef.current;
      rotationRef.current += deltaX * 0.015;
      lastMouseXRef.current = e.clientX;
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Ref to rebuild when state changes
    (canvas as unknown as { _rebuildRig: (c: CharacterCustomization) => void })._rebuildRig = rebuildPreviewRig;

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [isOpen]);

  // Update 3D preview on customization change
  useEffect(() => {
    if (previewCanvasRef.current) {
      const c = previewCanvasRef.current as unknown as { _rebuildRig?: (c: CharacterCustomization) => void };
      if (c._rebuildRig) {
        c._rebuildRig(customization);
      }
    }
  }, [customization]);

  const updateProp = <K extends keyof CharacterCustomization>(key: K, value: CharacterCustomization[K]) => {
    setCustomization((prev) => ({ ...prev, [key]: value }));
    soundManager.playUIClick();
  };

  const handleApplyPreset = (p: CharacterCustomization) => {
    setCustomization({ ...p });
    soundManager.playMissionComplete();
  };

  const handleRandomize = () => {
    const randomHair = HAIRSTYLES[Math.floor(Math.random() * HAIRSTYLES.length)].id;
    const randomHairColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].hex;
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].hex;
    const randomEyeColor = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)].hex;
    const randomNose = NOSE_TYPES[Math.floor(Math.random() * NOSE_TYPES.length)].id;
    const randomFace = FACE_SHAPES[Math.floor(Math.random() * FACE_SHAPES.length)].id;
    const randomBeard = FACIAL_HAIR[Math.floor(Math.random() * FACIAL_HAIR.length)].id;
    const randomEyewear = EYEWEAR[Math.floor(Math.random() * EYEWEAR.length)].id;
    const randomHeadwear = HEADWEAR[Math.floor(Math.random() * HEADWEAR.length)].id;
    const randomOutfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id;
    const randomJacketColor = JACKET_COLORS[Math.floor(Math.random() * JACKET_COLORS.length)].hex;
    const randomPantsType = PANTS_TYPES[Math.floor(Math.random() * PANTS_TYPES.length)].id;
    const randomPantsColor = PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)].hex;

    setCustomization((prev) => ({
      ...prev,
      hairstyle: randomHair,
      hairColor: randomHairColor,
      skinTone: randomSkin,
      eyeColor: randomEyeColor,
      noseType: randomNose,
      faceShape: randomFace,
      facialHair: randomBeard,
      eyewear: randomEyewear,
      headwear: randomHeadwear,
      outfit: randomOutfit,
      jacketColor: randomJacketColor,
      pantsType: randomPantsType,
      pantsColor: randomPantsColor,
    }));
    soundManager.playUIClick();
  };

  const handleSaveAndExit = () => {
    if (engine) {
      engine.updatePlayerCustomization(customization);
      engine.saveGame();
    }
    if (onSave) {
      onSave(customization);
    }
    soundManager.playMissionComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="max-w-5xl w-full h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Left 3D Interactive Character Stage */}
        <div className="md:w-5/12 bg-gradient-to-b from-slate-950 via-slate-900 to-black relative flex flex-col border-b md:border-b-0 md:border-r border-slate-800">
          {/* Stage Top Bar */}
          <div className="p-4 flex items-center justify-between z-10">
            <div>
              <div className="text-[10px] font-mono font-bold tracking-widest text-sky-400 uppercase">
                AGAT STYLIST STUDIO
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">CHARACTER RIG</h2>
            </div>

            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-500/50 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer shadow"
              title="Generate random character style"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>RANDOMIZE</span>
            </button>
          </div>

          {/* Interactive WebGL Canvas */}
          <div className="flex-1 relative cursor-grab active:cursor-grabbing">
            <canvas ref={previewCanvasRef} className="w-full h-full block" />

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
              {/* Zoom & Focus Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md shadow">
                <button
                  onClick={() => {
                    cameraFocusRef.current = cameraFocusRef.current === 'head' ? 'full' : 'head';
                    soundManager.playUIClick();
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/40 hover:bg-sky-500/30 transition-colors cursor-pointer"
                >
                  {cameraFocusRef.current === 'head' ? 'VIEW: FACE' : 'VIEW: BODY'}
                </button>
                <button
                  onClick={() => {
                    cameraZoomRef.current = Math.max(1.8, cameraZoomRef.current - 0.4);
                  }}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    cameraZoomRef.current = Math.min(4.5, cameraZoomRef.current + 0.4);
                  }}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    rotationRef.current += Math.PI / 4;
                  }}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Rotate 45°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Pose Selector */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md shadow">
                {(['idle', 'walk', 'sprint', 'aim'] as const).map((pose) => (
                  <button
                    key={pose}
                    onClick={() => {
                      previewPoseRef.current = pose;
                      soundManager.playUIClick();
                    }}
                    className={`px-2 py-1 text-[10px] font-mono font-bold rounded uppercase transition-colors cursor-pointer ${
                      previewPoseRef.current === pose
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {pose}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Customization Controls Sidebar */}
        <div className="md:w-7/12 flex flex-col justify-between bg-slate-900/90 overflow-hidden">
          {/* Category Tabs */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('face')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'face'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Face & Eyes</span>
              </button>

              <button
                onClick={() => setActiveTab('hair')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'hair'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>Hair & Beard</span>
              </button>

              <button
                onClick={() => setActiveTab('headwear')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'headwear'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>Headwear</span>
              </button>

              <button
                onClick={() => setActiveTab('outfit')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'outfit'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Shirt className="w-4 h-4" />
                <span>Wardrobe</span>
              </button>

              <button
                onClick={() => setActiveTab('body')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'body'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Body Stature</span>
              </button>

              <button
                onClick={() => setActiveTab('finetuning')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'finetuning'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Fine Tuning</span>
              </button>

              <button
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'presets'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Presets</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Options Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. FACE & EYES TAB */}
            {activeTab === 'face' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Eye Colors */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Eye Iris Pigment</span>
                    <span className="font-mono text-sky-400 text-[11px]">{customization.eyeColor}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {EYE_COLORS.map((ec) => (
                      <button
                        key={ec.hex}
                        onClick={() => updateProp('eyeColor', ec.hex)}
                        title={ec.label}
                        className={`h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          customization.eyeColor === ec.hex
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-slate-800 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: ec.hex }}
                      >
                        {customization.eyeColor === ec.hex && (
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Nose Style */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Nose Anatomy & Bridge
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {NOSE_TYPES.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => updateProp('noseType', n.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.noseType === n.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{n.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{n.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Face Shape / Jaw Contouring */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Facial Contour & Jaw Width
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {FACE_SHAPES.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => updateProp('faceShape', f.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.faceShape === f.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{f.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eyebrow Style */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Eyebrows Definition
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EYEBROW_STYLES.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => updateProp('eyebrowStyle', b.id)}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                          customization.eyebrowStyle === b.id
                            ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Tone */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Skin Complexion</span>
                    <span className="font-mono text-sky-400 text-[11px]">{customization.skinTone}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {SKIN_TONES.map((st) => (
                      <button
                        key={st.hex}
                        onClick={() => updateProp('skinTone', st.hex)}
                        title={st.label}
                        className={`h-11 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          customization.skinTone === st.hex
                            ? 'border-sky-400 scale-105 shadow-md shadow-sky-500/30'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                        style={{ backgroundColor: st.hex }}
                      >
                        {customization.skinTone === st.hex && (
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eyewear & Optics */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Eyewear, Visors & Cyberware
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {EYEWEAR.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => updateProp('eyewear', e.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.eyewear === e.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{e.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{e.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. HAIR & BEARD TAB */}
            {activeTab === 'hair' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Haircut Styles */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Metropolitan Haircut Styles (12 Choices)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {HAIRSTYLES.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => updateProp('hairstyle', h.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.hairstyle === h.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{h.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{h.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color Dye */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Hair Color Dye (12 Colors)</span>
                    <span className="font-mono text-sky-400 text-[11px]">{customization.hairColor}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {HAIR_COLORS.map((hc) => (
                      <button
                        key={hc.hex}
                        onClick={() => updateProp('hairColor', hc.hex)}
                        title={hc.label}
                        className={`h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          customization.hairColor === hc.hex
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                        style={{ backgroundColor: hc.hex }}
                      >
                        {customization.hairColor === hc.hex && (
                          <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Facial Hair */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Facial Hair & Stubble
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FACIAL_HAIR.map((fh) => (
                      <button
                        key={fh.id}
                        onClick={() => updateProp('facialHair', fh.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.facialHair === fh.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{fh.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. HEADWEAR TAB */}
            {activeTab === 'headwear' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Headwear & Street Gear
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {HEADWEAR.map((hw) => (
                      <button
                        key={hw.id}
                        onClick={() => updateProp('headwear', hw.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.headwear === hw.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{hw.label}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{hw.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {customization.headwear !== 'none' && (
                  <div>
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                      Headwear Color
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {JACKET_COLORS.map((jc) => (
                        <button
                          key={jc.hex}
                          onClick={() => updateProp('headwearColor', jc.hex)}
                          className={`h-10 rounded-xl border-2 transition-all cursor-pointer ${
                            customization.headwearColor === jc.hex
                              ? 'border-white scale-110 shadow-lg'
                              : 'border-slate-800'
                          }`}
                          style={{ backgroundColor: jc.hex }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. OUTFIT TAB */}
            {activeTab === 'outfit' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Upper Body Jackets */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Upper Body Silhouette
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {OUTFITS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => updateProp('outfit', o.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.outfit === o.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{o.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jacket Primary Color */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Upper Garment Color</span>
                    <span className="font-mono text-sky-400 text-[11px]">{customization.jacketColor}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {JACKET_COLORS.map((jc) => (
                      <button
                        key={jc.hex}
                        onClick={() => updateProp('jacketColor', jc.hex)}
                        title={jc.label}
                        className={`h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          customization.jacketColor === jc.hex
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                        style={{ backgroundColor: jc.hex }}
                      >
                        {customization.jacketColor === jc.hex && (
                          <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pants Style */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Trousers & Combat Legs
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PANTS_TYPES.map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => updateProp('pantsType', pt.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.pantsType === pt.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{pt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{pt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pants Color */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Trousers Color</span>
                    <span className="font-mono text-sky-400 text-[11px]">{customization.pantsColor}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {PANTS_COLORS.map((pc) => (
                      <button
                        key={pc.hex}
                        onClick={() => updateProp('pantsColor', pc.hex)}
                        title={pc.label}
                        className={`h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                          customization.pantsColor === pc.hex
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                        style={{ backgroundColor: pc.hex }}
                      >
                        {customization.pantsColor === pc.hex && (
                          <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footwear */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Footwear & Shoes
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {SHOES_TYPES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => updateProp('shoes', s.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          customization.shoes === s.id
                            ? 'border-sky-400 bg-sky-500/20 text-white font-bold'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. BODY & STATURE TAB */}
            {activeTab === 'body' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Body Type */}
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Physique & Frame Stature
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {BODY_TYPES.map((bt) => (
                      <button
                        key={bt.id}
                        onClick={() => updateProp('bodyType', bt.id)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          customization.bodyType === bt.id
                            ? 'border-sky-400 bg-sky-500/15'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-sm font-bold text-white">{bt.label}</div>
                        <div className="text-xs text-slate-400 mt-1">{bt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height Scale */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    <span>Height & Stature Scale</span>
                    <span className="font-mono text-sky-400">
                      {Math.round((customization.heightScale || 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.92"
                    max="1.12"
                    step="0.02"
                    value={customization.heightScale || 1.0}
                    onChange={(e) => updateProp('heightScale', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>Compact Agility (92%)</span>
                    <span>Standard Metropolitan (100%)</span>
                    <span>Towering Stature (112%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. FINE TUNING TAB (ANATOMICAL SLIDERS) */}
            {activeTab === 'finetuning' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-xl">
                  <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <span>3D Facial Anatomy & Morph Sculpting</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Adjust specific 3D morph parameters to sculpt facial geometry in real-time. Inverse kinematics and vertex mapping dynamically update your avatar in the 3D viewport.
                  </p>
                </div>

                {/* Nose Bridge Width */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Nose Bridge Width</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.noseBridgeWidth ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.05"
                    value={customization.noseBridgeWidth ?? 1.0}
                    onChange={(e) => updateProp('noseBridgeWidth', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Narrow Bridge (0.5x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Broad Bridge (1.8x)</span>
                  </div>
                </div>

                {/* Nose Projection */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Nose Projection / Tip Depth</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.noseProjection ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.05"
                    value={customization.noseProjection ?? 1.0}
                    onChange={(e) => updateProp('noseProjection', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Compact Tip (0.5x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Prominent Tip (1.8x)</span>
                  </div>
                </div>

                {/* Eye Set Depth */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Eye Set Depth (Socket Depth)</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.eyeDepth ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={customization.eyeDepth ?? 1.0}
                    onChange={(e) => updateProp('eyeDepth', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Deep Socket (0.6x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Shallow Socket (1.5x)</span>
                  </div>
                </div>

                {/* Eye Spacing */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Eye Inter-Orbital Spacing</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.eyeSpacing ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={customization.eyeSpacing ?? 1.0}
                    onChange={(e) => updateProp('eyeSpacing', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Close Set (0.6x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Wide Set (1.5x)</span>
                  </div>
                </div>

                {/* Ear Lobe Size */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Ear Lobe & Auricle Size</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.earLobeSize ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.8"
                    step="0.05"
                    value={customization.earLobeSize ?? 1.0}
                    onChange={(e) => updateProp('earLobeSize', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Subtle Lobe (0.6x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Enlarged Lobe (1.8x)</span>
                  </div>
                </div>

                {/* Jaw Angle */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Jaw Angle & Breadth</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.jawAngle ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={customization.jawAngle ?? 1.0}
                    onChange={(e) => updateProp('jawAngle', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Narrow Chin (0.6x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Broad Jaw (1.5x)</span>
                  </div>
                </div>

                {/* Jawline Definition */}
                <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                    <span>Jawline Mandible Definition</span>
                    <span className="font-mono text-sky-400 text-[11px]">{(customization.jawlineDefinition ?? 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={customization.jawlineDefinition ?? 1.0}
                    onChange={(e) => updateProp('jawlineDefinition', parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Soft Mandible (0.6x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Chiseled Mandible (1.5x)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. PRESETS TAB */}
            {activeTab === 'presets' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Ready-To-Deploy Operative Archetypes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESETS.map((p) => (
                    <div
                      key={p.name}
                      className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-sky-500/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{p.tag}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {p.data.outfit.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleApplyPreset(p.data)}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>EQUIP PRESET</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Bottom Bar */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveAndExit}
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>APPLY & SAVE CHARACTER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
