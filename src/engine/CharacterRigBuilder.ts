import * as THREE from 'three';
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

export interface CharacterRig {
  group: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  headBase: THREE.Mesh;
  faceGroup: THREE.Group;
  eyes: {
    leftEye: THREE.Mesh;
    rightEye: THREE.Mesh;
    leftIris: THREE.Mesh;
    rightIris: THREE.Mesh;
    leftLid?: THREE.Mesh;
    rightLid?: THREE.Mesh;
  };
  eyebrows: {
    left: THREE.Mesh;
    right: THREE.Mesh;
  };
  nose: THREE.Mesh;
  mouth: THREE.Mesh;
  ears: {
    left: THREE.Mesh;
    right: THREE.Mesh;
  };
  legs: [THREE.Mesh, THREE.Mesh];
  shoes: [THREE.Mesh, THREE.Mesh];
  arms: [THREE.Mesh, THREE.Mesh];
  hairGroup?: THREE.Group;
  headwearGroup?: THREE.Group;
  accessoriesGroup?: THREE.Group;
}

export function buildCharacterRig(c: CharacterCustomization): CharacterRig {
  const group = new THREE.Group();

  const bodyScale = c.bodyType === 'muscular' ? 1.18 : c.bodyType === 'slim' ? 0.88 : c.bodyType === 'heavy' ? 1.28 : 1.0;
  const armScale = c.bodyType === 'muscular' ? 1.25 : c.bodyType === 'slim' ? 0.86 : c.bodyType === 'heavy' ? 1.22 : 1.0;
  const heightScale = c.heightScale || 1.0;
  group.scale.set(1.0, heightScale, 1.0);

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.skinTone),
    roughness: 0.75,
    metalness: 0.05,
  });

  const hairColorHex = c.hairColor || '#111111';
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairColorHex),
    roughness: 0.5,
    metalness: 0.1,
  });

  // ----------------------------------------------------
  // 1. TORSO & OUTFITS
  // ----------------------------------------------------
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.15;

  let torsoRoughness = 0.7;
  let torsoMetalness = 0.05;
  if (c.outfit === 'cyber_leather') {
    torsoRoughness = 0.38;
    torsoMetalness = 0.28;
  } else if (c.outfit === 'tactical_vest') {
    torsoRoughness = 0.85;
    torsoMetalness = 0.15;
  } else if (c.outfit === 'formal_suit') {
    torsoRoughness = 0.5;
    torsoMetalness = 0.08;
  }

  const torsoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.jacketColor),
    roughness: torsoRoughness,
    metalness: torsoMetalness,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55 * bodyScale, 0.75, 0.3 * bodyScale), torsoMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  // Outfit specific details
  if (c.outfit === 'cyber_leather') {
    // Glowing neon collar & piping
    const pipingMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38 * bodyScale, 0.12, 0.34 * bodyScale), pipingMat);
    collar.position.set(0, 0.38, 0.02);
    torso.add(collar);

    // Diagonal zipper
    const zipMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, 0.02), zipMat);
    zipper.position.set(0.06 * bodyScale, 0, 0.16 * bodyScale);
    torso.add(zipper);
  } else if (c.outfit === 'street_hoodie') {
    // Hoodie hood on back of neck & pouch pocket
    const hoodMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.jacketColor), roughness: 0.8 });
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.42 * bodyScale, 0.26, 0.24 * bodyScale), hoodMat);
    hood.position.set(0, 0.28, -0.15 * bodyScale);
    torso.add(hood);

    // Front kangaroo pocket
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.38 * bodyScale, 0.22, 0.04), hoodMat);
    pocket.position.set(0, -0.16, 0.16 * bodyScale);
    torso.add(pocket);
  } else if (c.outfit === 'tactical_vest') {
    // Kevlar ballistic plates & pouches
    const kevlarMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.2 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46 * bodyScale, 0.58, 0.06), kevlarMat);
    plate.position.set(0, 0.02, 0.16 * bodyScale);
    torso.add(plate);

    // Ammo / gear pouches
    for (let p = -1; p <= 1; p++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.11 * bodyScale, 0.14, 0.07), kevlarMat);
      pouch.position.set(p * 0.15 * bodyScale, -0.16, 0.2 * bodyScale);
      torso.add(pouch);
    }
  } else if (c.outfit === 'formal_suit') {
    // White shirt insert & tie
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.18 * bodyScale, 0.45, 0.02), shirtMat);
    shirt.position.set(0, 0.15, 0.155 * bodyScale);
    torso.add(shirt);

    const tieMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06 * bodyScale, 0.42, 0.03), tieMat);
    tie.position.set(0, 0.1, 0.165 * bodyScale);
    torso.add(tie);
  } else if (c.outfit === 'track_jacket') {
    // Athletic stripes down torso
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.02), stripeMat);
    stripeL.position.set(-0.24 * bodyScale, 0, 0.15 * bodyScale);
    torso.add(stripeL);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.02), stripeMat);
    stripeR.position.set(0.24 * bodyScale, 0, 0.15 * bodyScale);
    torso.add(stripeR);
  }

  // ----------------------------------------------------
  // 2. HEAD, JAW & EARS
  // ----------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.72, 0);
  group.add(headGroup);

  // Anatomical Slider Multipliers
  const eyeSpacingMult = c.eyeSpacing || 1.0;
  const eyeDepthOffset = ((c.eyeDepth || 1.0) - 1.0) * -0.015;
  const noseBridgeWidthMult = c.noseBridgeWidth || 1.0;
  const noseProjectionMult = c.noseProjection || 1.0;
  const earLobeSizeMult = c.earLobeSize || 1.0;
  const jawAngleMult = c.jawAngle || 1.0;
  const jawlineDefMult = c.jawlineDefinition || 1.0;

  // Jaw tapering based on faceShape & sliders
  let jawWidth = 0.32 * jawAngleMult;
  let jawDepth = 0.32 * jawlineDefMult;
  let headHeight = 0.35;
  if (c.faceShape === 'angular') {
    jawWidth = 0.31 * jawAngleMult;
    jawDepth = 0.31 * jawlineDefMult;
  } else if (c.faceShape === 'square') {
    jawWidth = 0.34 * jawAngleMult;
    jawDepth = 0.33 * jawlineDefMult;
  } else if (c.faceShape === 'round') {
    jawWidth = 0.33 * jawAngleMult;
    jawDepth = 0.33 * jawlineDefMult;
    headHeight = 0.33;
  } else if (c.faceShape === 'sharp') {
    jawWidth = 0.29 * jawAngleMult;
    jawDepth = 0.32 * jawlineDefMult;
  }

  const headBase = new THREE.Mesh(new THREE.BoxGeometry(jawWidth, headHeight, jawDepth), skinMat);
  headBase.castShadow = true;
  headGroup.add(headBase);

  // Left & Right sculpted ears
  const earMat = skinMat;
  const earGeo = new THREE.BoxGeometry(0.05, 0.11 * earLobeSizeMult, 0.07);
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-jawWidth / 2 - 0.025, 0.01, -0.01);
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(jawWidth / 2 + 0.025, 0.01, -0.01);
  headGroup.add(rightEar);

  // ----------------------------------------------------
  // 3. EXPRESSIVE FACE: EYES, NOSE, MOUTH & EYEBROWS
  // ----------------------------------------------------
  const faceGroup = new THREE.Group();
  headGroup.add(faceGroup);

  // Eyes (whites + irises + pupils)
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.05,
  });

  const irisColorHex = c.eyeColor || '#00f0ff';
  const irisMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(irisColorHex),
    roughness: 0.1,
    metalness: 0.3,
    emissive: irisColorHex === '#00f0ff' || irisColorHex === '#a855f7' ? new THREE.Color(irisColorHex) : new THREE.Color(0x000000),
    emissiveIntensity: irisColorHex === '#00f0ff' ? 0.35 : 0.0,
  });

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

  const eyeGeo = new THREE.BoxGeometry(0.065, 0.045, 0.03);
  const irisGeo = new THREE.BoxGeometry(0.038, 0.038, 0.035);
  const pupilGeo = new THREE.BoxGeometry(0.02, 0.02, 0.038);

  const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  leftEye.position.set(-0.078 * eyeSpacingMult, 0.045, jawDepth / 2 + 0.008 + eyeDepthOffset);
  faceGroup.add(leftEye);

  const leftIris = new THREE.Mesh(irisGeo, irisMat);
  leftIris.position.set(-0.078 * eyeSpacingMult, 0.045, jawDepth / 2 + 0.014 + eyeDepthOffset);
  faceGroup.add(leftIris);

  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.078 * eyeSpacingMult, 0.045, jawDepth / 2 + 0.018 + eyeDepthOffset);
  faceGroup.add(leftPupil);

  const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  rightEye.position.set(0.078 * eyeSpacingMult, 0.045, jawDepth / 2 + 0.008 + eyeDepthOffset);
  faceGroup.add(rightEye);

  const rightIris = new THREE.Mesh(irisGeo, irisMat);
  rightIris.position.set(0.078 * eyeSpacingMult, 0.045, jawDepth / 2 + 0.014 + eyeDepthOffset);
  faceGroup.add(rightIris);

  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.078 * eyeSpacingMult, 0.045, jawDepth / 2 + 0.018 + eyeDepthOffset);
  faceGroup.add(rightPupil);

  // Eyebrows
  const browColorHex = c.eyebrowColor || c.hairColor || '#111111';
  const browMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(browColorHex),
    roughness: 0.6,
  });

  let browThickness = 0.02;
  let browWidth = 0.085;
  let browAngle = 0.08;
  if (c.eyebrowStyle === 'thick') {
    browThickness = 0.032;
    browWidth = 0.092;
  } else if (c.eyebrowStyle === 'straight') {
    browAngle = 0;
  } else if (c.eyebrowStyle === 'slit') {
    browWidth = 0.075;
  }

  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(browWidth, browThickness, 0.025), browMat);
  leftBrow.position.set(-0.082 * eyeSpacingMult, 0.085, jawDepth / 2 + 0.014 + eyeDepthOffset);
  leftBrow.rotation.z = -browAngle;
  faceGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(browWidth, browThickness, 0.025), browMat);
  rightBrow.position.set(0.082 * eyeSpacingMult, 0.085, jawDepth / 2 + 0.014 + eyeDepthOffset);
  rightBrow.rotation.z = browAngle;
  faceGroup.add(rightBrow);

  // 3D Sculpted Nose
  let noseWidth = 0.048 * noseBridgeWidthMult;
  let noseHeight = 0.085;
  let noseDepth = 0.055 * noseProjectionMult;
  if (c.noseType === 'button') {
    noseWidth = 0.042 * noseBridgeWidthMult;
    noseHeight = 0.065;
    noseDepth = 0.048 * noseProjectionMult;
  } else if (c.noseType === 'aquiline') {
    noseWidth = 0.046 * noseBridgeWidthMult;
    noseHeight = 0.105;
    noseDepth = 0.072 * noseProjectionMult;
  } else if (c.noseType === 'broad') {
    noseWidth = 0.068 * noseBridgeWidthMult;
    noseHeight = 0.08;
    noseDepth = 0.058 * noseProjectionMult;
  }

  const noseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.skinTone).offsetHSL(0, 0.05, -0.04), // slightly darker bridge contour
    roughness: 0.7,
  });
  const nose = new THREE.Mesh(new THREE.BoxGeometry(noseWidth, noseHeight, noseDepth), noseMat);
  nose.position.set(0, -0.015, jawDepth / 2 + noseDepth / 2);
  faceGroup.add(nose);

  // Mouth & Lips
  const lipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.skinTone).offsetHSL(0.02, 0.25, -0.1), // natural natural lip flush
    roughness: 0.6,
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), lipMat);
  mouth.position.set(0, -0.095, jawDepth / 2 + 0.012);
  faceGroup.add(mouth);

  // ----------------------------------------------------
  // 4. FACIAL HAIR
  // ----------------------------------------------------
  if (c.facialHair && c.facialHair !== 'none') {
    const beardColor = new THREE.Color(c.facialHairColor || c.hairColor);
    const beardMat = new THREE.MeshStandardMaterial({ color: beardColor, roughness: 0.75 });

    if (c.facialHair === 'stubble') {
      const stubble = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.015, 0.16, 0.19), beardMat);
      stubble.position.set(0, -0.09, 0.09);
      faceGroup.add(stubble);
    } else if (c.facialHair === 'goatee') {
      const goatee = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.16), beardMat);
      goatee.position.set(0, -0.11, jawDepth / 2 + 0.02);
      faceGroup.add(goatee);
    } else if (c.facialHair === 'full_beard') {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.03, 0.24, jawDepth * 0.75), beardMat);
      beard.position.set(0, -0.13, 0.09);
      faceGroup.add(beard);
    } else if (c.facialHair === 'moustache') {
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.08), beardMat);
      stache.position.set(0, -0.055, jawDepth / 2 + 0.035);
      faceGroup.add(stache);
    } else if (c.facialHair === 'chinstrap') {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.02, 0.08, jawDepth + 0.01), beardMat);
      strap.position.set(0, -0.14, 0.02);
      faceGroup.add(strap);
    }
  }

  // ----------------------------------------------------
  // 5. EYEWEAR & FACE ACCESSORIES
  // ----------------------------------------------------
  if (c.eyewear && c.eyewear !== 'none') {
    const eyeAccessoryGroup = new THREE.Group();
    headGroup.add(eyeAccessoryGroup);

    if (c.eyewear === 'cyber_shades') {
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.05,
        metalness: 0.95,
      });
      const shades = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.03, 0.08, 0.14), shadeMat);
      shades.position.set(0, 0.045, jawDepth / 2 + 0.03);
      eyeAccessoryGroup.add(shades);
    } else if (c.eyewear === 'aviators') {
      const goldFrameMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
      const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.6 });

      // Frame bar
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.04), goldFrameMat);
      bar.position.set(0, 0.07, jawDepth / 2 + 0.04);
      eyeAccessoryGroup.add(bar);

      // Left lens
      const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), darkGlassMat);
      lensL.position.set(-0.075, 0.035, jawDepth / 2 + 0.04);
      eyeAccessoryGroup.add(lensL);

      // Right lens
      const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), darkGlassMat);
      lensR.position.set(0.075, 0.035, jawDepth / 2 + 0.04);
      eyeAccessoryGroup.add(lensR);
    } else if (c.eyewear === 'hud_visor') {
      const visorColor = new THREE.Color(c.eyewearColor || '#00f0ff');
      const visorMat = new THREE.MeshStandardMaterial({
        color: visorColor,
        emissive: visorColor,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
      });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.04, 0.09, 0.16), visorMat);
      visor.position.set(0, 0.045, jawDepth / 2 + 0.04);
      eyeAccessoryGroup.add(visor);
    } else if (c.eyewear === 'cyber_eye') {
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.0,
      });
      const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.08, 16), eyeMat);
      eye.rotation.x = Math.PI / 2;
      eye.position.set(0.078, 0.045, jawDepth / 2 + 0.03);
      eyeAccessoryGroup.add(eye);
    } else if (c.eyewear === 'tactical_mask') {
      const maskMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.85 });
      const mask = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.02, 0.18, jawDepth * 0.7), maskMat);
      mask.position.set(0, -0.08, 0.08);
      eyeAccessoryGroup.add(mask);
    }
  }

  // ----------------------------------------------------
  // 6. HAIRSTYLES (12 DISTINCT STYLES)
  // ----------------------------------------------------
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  if (c.hairstyle === 'short_fade') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.02, 0.14, jawDepth + 0.02), hairMat);
    top.position.set(0, headHeight / 2 + 0.05, 0);
    hairGroup.add(top);

    const back = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.01, 0.18, 0.06), hairMat);
    back.position.set(0, 0.06, -jawDepth / 2 - 0.02);
    hairGroup.add(back);
  } else if (c.hairstyle === 'buzz') {
    const buzz = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.015, 0.08, jawDepth + 0.015), hairMat);
    buzz.position.set(0, headHeight / 2 + 0.03, 0);
    hairGroup.add(buzz);
  } else if (c.hairstyle === 'mohawk') {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, jawDepth + 0.06), hairMat);
    crest.position.set(0, headHeight / 2 + 0.14, 0.02);
    hairGroup.add(crest);
  } else if (c.hairstyle === 'pompadour') {
    const pomp = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.02, 0.24, jawDepth + 0.06), hairMat);
    pomp.position.set(0, headHeight / 2 + 0.1, -0.03);
    hairGroup.add(pomp);

    const frontRoll = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.12), hairMat);
    frontRoll.position.set(0, headHeight / 2 + 0.16, 0.14);
    hairGroup.add(frontRoll);
  } else if (c.hairstyle === 'cyber_ponytail') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.02, 0.12, jawDepth + 0.02), hairMat);
    cap.position.set(0, headHeight / 2 + 0.05, 0);
    hairGroup.add(cap);

    const pony = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.48, 12), hairMat);
    pony.position.set(0, 0.08, -jawDepth / 2 - 0.12);
    pony.rotation.x = -Math.PI / 5;
    hairGroup.add(pony);
  } else if (c.hairstyle === 'afro') {
    const afro = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.14, 0.36, jawDepth + 0.14), hairMat);
    afro.position.set(0, headHeight / 2 + 0.12, 0);
    hairGroup.add(afro);
  } else if (c.hairstyle === 'long_wavy') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.04, 0.16, jawDepth + 0.04), hairMat);
    top.position.set(0, headHeight / 2 + 0.06, 0);
    hairGroup.add(top);

    const leftStrand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.22), hairMat);
    leftStrand.position.set(-jawWidth / 2 - 0.03, -0.06, 0.02);
    hairGroup.add(leftStrand);

    const rightStrand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.22), hairMat);
    rightStrand.position.set(jawWidth / 2 + 0.03, -0.06, 0.02);
    hairGroup.add(rightStrand);
  } else if (c.hairstyle === 'dreadlocks') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.03, 0.14, jawDepth + 0.03), hairMat);
    top.position.set(0, headHeight / 2 + 0.05, 0);
    hairGroup.add(top);

    // Individual dread cylinder strands
    for (let d = -2; d <= 2; d++) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), hairMat);
      strand.position.set(d * 0.07, -0.04, -jawDepth / 2 - 0.06);
      strand.rotation.x = -Math.PI / 8;
      hairGroup.add(strand);
    }
  } else if (c.hairstyle === 'undercut') {
    const topSlick = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, jawDepth + 0.06), hairMat);
    topSlick.position.set(0, headHeight / 2 + 0.07, -0.02);
    hairGroup.add(topSlick);
  } else if (c.hairstyle === 'messy_spikes') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.03, 0.14, jawDepth + 0.03), hairMat);
    base.position.set(0, headHeight / 2 + 0.05, 0);
    hairGroup.add(base);

    // Spikes angled dynamically
    for (let s = -1; s <= 1; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), hairMat);
      spike.position.set(s * 0.1, headHeight / 2 + 0.18, 0.06);
      spike.rotation.x = 0.2;
      spike.rotation.z = -s * 0.25;
      hairGroup.add(spike);
    }
  } else if (c.hairstyle === 'cornrows') {
    // Braided rows
    for (let r = -2; r <= 2; r++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, jawDepth + 0.04), hairMat);
      row.position.set(r * 0.06, headHeight / 2 + 0.04, 0);
      hairGroup.add(row);
    }
  } else if (c.hairstyle === 'slick_back') {
    const slick = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.02, 0.12, jawDepth + 0.08), hairMat);
    slick.position.set(0, headHeight / 2 + 0.06, -0.04);
    hairGroup.add(slick);
  }

  // ----------------------------------------------------
  // 7. HEADWEAR & ACCESSORIES
  // ----------------------------------------------------
  if (c.headwear && c.headwear !== 'none') {
    const headwearGroup = new THREE.Group();
    headGroup.add(headwearGroup);
    const hatColor = new THREE.Color(c.headwearColor || '#0f172a');
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.7 });

    if (c.headwear === 'baseball_cap') {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.04, 0.14, jawDepth + 0.04), hatMat);
      crown.position.set(0, headHeight / 2 + 0.07, 0);
      headwearGroup.add(crown);

      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.18), hatMat);
      bill.position.set(0, headHeight / 2 + 0.03, jawDepth / 2 + 0.1);
      headwearGroup.add(bill);
    } else if (c.headwear === 'backwards_cap') {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.04, 0.14, jawDepth + 0.04), hatMat);
      crown.position.set(0, headHeight / 2 + 0.07, 0);
      headwearGroup.add(crown);

      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.18), hatMat);
      bill.position.set(0, headHeight / 2 + 0.03, -jawDepth / 2 - 0.1);
      headwearGroup.add(bill);
    } else if (c.headwear === 'beanie') {
      const beanie = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.05, 0.22, jawDepth + 0.05), hatMat);
      beanie.position.set(0, headHeight / 2 + 0.1, -0.02);
      headwearGroup.add(beanie);
    } else if (c.headwear === 'cyber_headphones') {
      const phoneMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.2,
        metalness: 0.8,
      });
      const neonRingMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.8,
      });

      // Headband
      const band = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.09, 0.03, 0.06), phoneMat);
      band.position.set(0, headHeight / 2 + 0.12, 0);
      headwearGroup.add(band);

      // Left earcup
      const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), phoneMat);
      cupL.rotation.z = Math.PI / 2;
      cupL.position.set(-jawWidth / 2 - 0.05, 0, 0);
      headwearGroup.add(cupL);

      const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), neonRingMat);
      ringL.rotation.y = Math.PI / 2;
      ringL.position.set(-jawWidth / 2 - 0.08, 0, 0);
      headwearGroup.add(ringL);

      // Right earcup
      const cupR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), phoneMat);
      cupR.rotation.z = Math.PI / 2;
      cupR.position.set(jawWidth / 2 + 0.05, 0, 0);
      headwearGroup.add(cupR);

      const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), neonRingMat);
      ringR.rotation.y = Math.PI / 2;
      ringR.position.set(jawWidth / 2 + 0.08, 0, 0);
      headwearGroup.add(ringR);
    } else if (c.headwear === 'tactical_helmet') {
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.4 });
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(jawWidth + 0.08, 0.22, jawDepth + 0.08), helmetMat);
      helmet.position.set(0, headHeight / 2 + 0.08, 0);
      headwearGroup.add(helmet);
    }
  }

  // ----------------------------------------------------
  // 8. LEGS & PANTS
  // ----------------------------------------------------
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.pantsColor),
    roughness: c.pantsType === 'cyber_armor' ? 0.35 : 0.8,
    metalness: c.pantsType === 'cyber_armor' ? 0.4 : 0.05,
  });

  const legGeo = new THREE.BoxGeometry(0.2 * bodyScale, 0.72, 0.22 * bodyScale);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14 * bodyScale, 0.42, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14 * bodyScale, 0.42, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Cargo / Cyber Armor attachments on legs
  if (c.pantsType === 'cargo_pants') {
    const pocketGeo = new THREE.BoxGeometry(0.05, 0.16, 0.14);
    const pL = new THREE.Mesh(pocketGeo, pantsMat);
    pL.position.set(-0.11 * bodyScale, 0, 0);
    leftLeg.add(pL);

    const pR = new THREE.Mesh(pocketGeo, pantsMat);
    pR.position.set(0.11 * bodyScale, 0, 0);
    rightLeg.add(pR);
  } else if (c.pantsType === 'cyber_armor') {
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.4 });
    const shinPlateL = new THREE.Mesh(new THREE.BoxGeometry(0.18 * bodyScale, 0.25, 0.04), plateMat);
    shinPlateL.position.set(0, -0.1, 0.12 * bodyScale);
    leftLeg.add(shinPlateL);

    const shinPlateR = new THREE.Mesh(new THREE.BoxGeometry(0.18 * bodyScale, 0.25, 0.04), plateMat);
    shinPlateR.position.set(0, -0.1, 0.12 * bodyScale);
    rightLeg.add(shinPlateR);
  }

  // ----------------------------------------------------
  // 9. SHOES / FOOTWEAR
  // ----------------------------------------------------
  const shoeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.shoesColor || '#09090b'),
    roughness: c.shoes === 'formal_oxfords' ? 0.2 : 0.7,
    metalness: c.shoes === 'formal_oxfords' ? 0.3 : 0.1,
  });

  const shoeGeo = new THREE.BoxGeometry(0.22 * bodyScale, 0.14, 0.32 * bodyScale);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.34, 0.04);
  leftShoe.castShadow = true;
  leftLeg.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.34, 0.04);
  rightShoe.castShadow = true;
  rightLeg.add(rightShoe);

  // ----------------------------------------------------
  // 10. ARMS
  // ----------------------------------------------------
  // For tank_top, upper arm matches skinTone, lower arm is bare skin!
  const armColor = c.outfit === 'tank_top' ? c.skinTone : c.jacketColor;
  const armMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(armColor),
    roughness: 0.7,
  });

  const armGeo = new THREE.BoxGeometry(0.16 * armScale, 0.65, 0.18 * armScale);
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.38 * bodyScale, 1.15, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.38 * bodyScale, 1.15, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Bare hands at ends of arms
  const handMat = skinMat;
  const handGeo = new THREE.BoxGeometry(0.12 * armScale, 0.14, 0.14 * armScale);
  const leftHand = new THREE.Mesh(handGeo, handMat);
  leftHand.position.set(0, -0.34, 0);
  leftArm.add(leftHand);

  const rightHand = new THREE.Mesh(handGeo, handMat);
  rightHand.position.set(0, -0.34, 0);
  rightArm.add(rightHand);

  return {
    group,
    torso,
    head: headGroup,
    headBase,
    faceGroup,
    eyes: {
      leftEye,
      rightEye,
      leftIris,
      rightIris,
    },
    eyebrows: {
      left: leftBrow,
      right: rightBrow,
    },
    nose,
    mouth,
    ears: {
      left: leftEar,
      right: rightEar,
    },
    legs: [leftLeg, rightLeg],
    shoes: [leftShoe, rightShoe],
    arms: [leftArm, rightArm],
    hairGroup,
  };
}

export interface RigAnimationState {
  isMoving: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isAiming: boolean;
  isAirborne?: boolean;
  walkCycle: number;
  time: number;
}

export function updateCharacterRigAnimation(rig: CharacterRig, state: RigAnimationState) {
  const { isMoving, isSprinting, isCrouching, isAiming, isAirborne, walkCycle, time } = state;

  // 1. Organic Idle Breathing Cycle
  const breath = Math.sin(time * 2.4);
  const microSway = Math.sin(time * 1.2) * 0.02;

  // 2. Eye Blinking (every 3.6 seconds)
  const blinkCycle = time % 3.6;
  const isBlinking = blinkCycle > 3.48;
  const eyeScaleY = isBlinking ? 0.12 : 1.0;
  rig.eyes.leftEye.scale.y = eyeScaleY;
  rig.eyes.rightEye.scale.y = eyeScaleY;
  rig.eyes.leftIris.scale.y = eyeScaleY;
  rig.eyes.rightIris.scale.y = eyeScaleY;

  // 3. Head micro-idle curiosity look
  if (!isAiming) {
    const headLookYaw = Math.sin(time * 0.45) * 0.06;
    const headLookPitch = Math.sin(time * 0.6) * 0.03;
    rig.head.rotation.y = headLookYaw;
    rig.head.rotation.x = headLookPitch;
  } else {
    rig.head.rotation.set(0, 0, 0);
  }

  // 4. Locomotion & Stances
  if (isAirborne) {
    // Jump / airborne balance pose
    rig.legs[0].rotation.x = -0.35;
    rig.legs[1].rotation.x = 0.45;
    if (!isAiming) {
      rig.arms[0].rotation.z = -0.45;
      rig.arms[1].rotation.z = 0.45;
      rig.arms[0].rotation.x = -0.3;
      rig.arms[1].rotation.x = -0.3;
    }
    rig.torso.position.y = 1.15;
  } else if (isMoving) {
    // Leg stride
    const cadence = isSprinting ? 0.85 : 0.58;
    const legAngle = Math.sin(walkCycle) * cadence;
    rig.legs[0].rotation.x = legAngle;
    rig.legs[1].rotation.x = -legAngle;

    // Torso dynamic bounce & forward lean
    const stepBob = Math.abs(Math.cos(walkCycle * 2)) * (isSprinting ? 0.06 : 0.03);
    const forwardLean = isSprinting ? 0.18 : 0.06;
    rig.torso.rotation.x = forwardLean;
    rig.torso.position.y = 1.15 + stepBob;

    // Arm swing (opposite to leg) when not aiming
    if (!isAiming) {
      const armSwing = Math.sin(walkCycle) * (isSprinting ? 1.0 : 0.65);
      rig.arms[0].rotation.x = -armSwing;
      rig.arms[1].rotation.x = armSwing;
      rig.arms[0].rotation.z = microSway - 0.08;
      rig.arms[1].rotation.z = -microSway + 0.08;
    }
  } else {
    // Standing Idle
    rig.legs[0].rotation.x = 0;
    rig.legs[1].rotation.x = 0;
    rig.torso.rotation.x = 0;

    // Breathing heave
    rig.torso.position.y = 1.15 + breath * 0.015;
    rig.torso.scale.y = 1.0 + breath * 0.012;

    if (!isAiming) {
      rig.arms[0].rotation.x = microSway;
      rig.arms[1].rotation.x = -microSway;
      rig.arms[0].rotation.z = -0.06 + breath * 0.01;
      rig.arms[1].rotation.z = 0.06 - breath * 0.01;
    }
  }

  // Crouch stance adjustment
  if (isCrouching) {
    rig.torso.position.y = 0.88;
    rig.head.position.y = 1.45;
  } else {
    rig.head.position.y = 1.72;
  }
}
