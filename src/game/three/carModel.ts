/**
 * Procedural 3D Tesla Roadster Vehicle Model (SpaceX Package)
 * High-fidelity aerodynamic sports car with sculpted curvaceous lines,
 * glass fastback canopy, active aero wing, LED blade lighting, and cold-gas thruster ports.
 */

import * as THREE from 'three';

export interface RoadsterMeshes {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  paintMaterial: THREE.MeshPhysicalMaterial;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  spoilerGroup: THREE.Group;
  tailLightMesh: THREE.Mesh;
  tailLightMaterial: THREE.MeshBasicMaterial;
  headlightsMaterial: THREE.MeshBasicMaterial;
  thrusterPlumes: THREE.Mesh[];
  thrusterLight: THREE.PointLight;
}

export const CAR_COLORS: Record<string, number> = {
  midnightCherry: 0x820b18, // Signature Roadster Deep Red Metallic
  apexSilver: 0xb5bcc4, // Liquid Quicksilver
  stealthMatte: 0x18181c, // Cyber Stealth Black
  electricBlue: 0x0052cc, // Deep Metallic Blue
  speedYellow: 0xebb305, // Concept Prototype Gold
};

export function createTeslaRoadster(colorHex: number = CAR_COLORS.midnightCherry): RoadsterMeshes {
  const root = new THREE.Group();

  // 1. PBR Materials
  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.55,
    metalness: 0.25,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0a101d,
    metalness: 0.15,
    roughness: 0.08,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.95,
    roughness: 0.18,
  });

  const rubberMaterial = new THREE.MeshStandardMaterial({
    color: 0x17171a,
    roughness: 0.9,
    metalness: 0.05,
  });

  const caliperMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Tesla Performance Red Calipers
    roughness: 0.35,
    metalness: 0.6,
  });

  // 2. Sculpted Aerodynamic Body Assembly
  const bodyGroup = new THREE.Group();

  // Main Chassis Tub (Sleek aerodynamic base)
  const chassisGeo = new THREE.BoxGeometry(1.88, 0.42, 4.3);
  const mainHull = new THREE.Mesh(chassisGeo, paintMaterial);
  mainHull.position.set(0, 0.38, 0.0);
  mainHull.castShadow = true;
  bodyGroup.add(mainHull);

  // Sloping Front Hood (Tapered wedge toward front splitter)
  const hoodGeo = new THREE.BoxGeometry(1.82, 0.22, 1.4);
  const hood = new THREE.Mesh(hoodGeo, paintMaterial);
  hood.position.set(0, 0.42, 1.25);
  hood.rotation.x = 0.08;
  bodyGroup.add(hood);

  // Sleek Aerodynamic Nose Cone
  const noseGeo = new THREE.BoxGeometry(1.74, 0.18, 0.85);
  const nose = new THREE.Mesh(noseGeo, paintMaterial);
  nose.position.set(0, 0.31, 2.05);
  nose.rotation.x = 0.14;
  bodyGroup.add(nose);

  // Carbon Front Splitter
  const splitterGeo = new THREE.BoxGeometry(1.86, 0.05, 0.65);
  const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitter.position.set(0, 0.16, 2.15);
  bodyGroup.add(splitter);

  // Sculpted Front Wheel Arches (Left & Right)
  const frontArchGeo = new THREE.BoxGeometry(0.18, 0.36, 1.2);
  const leftFrontArch = new THREE.Mesh(frontArchGeo, paintMaterial);
  leftFrontArch.position.set(-0.95, 0.44, 1.15);
  const rightFrontArch = leftFrontArch.clone();
  rightFrontArch.position.x = 0.95;
  bodyGroup.add(leftFrontArch, rightFrontArch);

  // Muscular Rear Haunches / Side Intakes
  const rearHaunchGeo = new THREE.BoxGeometry(0.24, 0.45, 1.5);
  const leftRearHaunch = new THREE.Mesh(rearHaunchGeo, paintMaterial);
  leftRearHaunch.position.set(-0.98, 0.48, -0.95);
  const rightRearHaunch = leftRearHaunch.clone();
  rightRearHaunch.position.x = 0.98;
  bodyGroup.add(leftRearHaunch, rightRearHaunch);

  // Side Rocker Panels (Aerodynamic ground effects)
  const rockerGeo = new THREE.BoxGeometry(1.94, 0.08, 1.7);
  const rocker = new THREE.Mesh(rockerGeo, carbonMaterial);
  rocker.position.set(0, 0.18, 0.05);
  bodyGroup.add(rocker);

  // Rear Venturi Diffuser
  const diffuserGeo = new THREE.BoxGeometry(1.82, 0.22, 0.95);
  const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
  diffuser.position.set(0, 0.24, -1.9);
  diffuser.rotation.x = -0.16;
  bodyGroup.add(diffuser);

  // 3. Panoramic Glass Fastback Canopy
  // Aerodynamic teardrop glass roof
  const canopyGeo = new THREE.CylinderGeometry(0.68, 0.88, 2.05, 14);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1.0, 0.45, 1.0);
  const canopy = new THREE.Mesh(canopyGeo, glassMaterial);
  canopy.position.set(0, 0.68, -0.18);
  bodyGroup.add(canopy);

  // Interior: Minimalist Sport Seats & Center Console
  const seatGeo = new THREE.BoxGeometry(0.36, 0.48, 0.38);
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const leftSeat = new THREE.Mesh(seatGeo, interiorMat);
  leftSeat.position.set(-0.35, 0.52, -0.22);
  const rightSeat = leftSeat.clone();
  rightSeat.position.x = 0.35;

  const dashGeo = new THREE.BoxGeometry(1.15, 0.12, 0.38);
  const dash = new THREE.Mesh(dashGeo, carbonMaterial);
  dash.position.set(0, 0.56, 0.48);

  // Central Tablet Display Screen (Cyan glowing Roadster interface)
  const tabletGeo = new THREE.PlaneGeometry(0.26, 0.18);
  const tabletMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const tablet = new THREE.Mesh(tabletGeo, tabletMat);
  tablet.position.set(0, 0.6, 0.26);
  tablet.rotation.x = -0.42;

  bodyGroup.add(leftSeat, rightSeat, dash, tablet);

  // 4. Lighting Systems
  // Twin Slim LED Headlight Slits with DRL glow
  const headlightGeo = new THREE.BoxGeometry(0.38, 0.05, 0.22);
  const headlightsMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftHeadlight = new THREE.Mesh(headlightGeo, headlightsMaterial);
  leftHeadlight.position.set(-0.68, 0.38, 2.12);
  leftHeadlight.rotation.y = -0.22;
  const rightHeadlight = leftHeadlight.clone();
  rightHeadlight.position.x = 0.68;
  rightHeadlight.rotation.y = 0.22;
  bodyGroup.add(leftHeadlight, rightHeadlight);

  // Full-Width Continuous Rear OLED Blade Tail Light
  const tailLightGeo = new THREE.BoxGeometry(1.72, 0.06, 0.06);
  const tailLightMaterial = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  const tailLightMesh = new THREE.Mesh(tailLightGeo, tailLightMaterial);
  tailLightMesh.position.set(0, 0.55, -2.12);
  bodyGroup.add(tailLightMesh);

  // 5. Active Aero Rear Spoiler (Motorized stanchions)
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, 0.64, -1.88);

  const wingGeo = new THREE.BoxGeometry(1.68, 0.035, 0.34);
  const wingMesh = new THREE.Mesh(wingGeo, carbonMaterial);
  wingMesh.position.set(0, 0.12, 0);

  const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), carbonMaterial);
  leftPylon.position.set(-0.52, 0, 0);
  const rightPylon = leftPylon.clone();
  rightPylon.position.x = 0.52;

  spoilerGroup.add(wingMesh, leftPylon, rightPylon);
  bodyGroup.add(spoilerGroup);

  // 6. SpaceX Cold-Gas Thruster Nozzles (Dual rear ports)
  const nozzleGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.22, 16);
  nozzleGeo.rotateX(Math.PI / 2);
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.95,
    roughness: 0.2,
  });

  const leftNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  leftNozzle.position.set(-0.28, 0.38, -2.14);
  const rightNozzle = leftNozzle.clone();
  rightNozzle.position.x = 0.28;
  bodyGroup.add(leftNozzle, rightNozzle);

  // Cold-Gas Jet Flames / Exhaust Plumes
  const plumeGeo = new THREE.ConeGeometry(0.14, 1.2, 16);
  plumeGeo.rotateX(Math.PI / 2);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  const leftPlume = new THREE.Mesh(plumeGeo, plumeMat);
  leftPlume.position.set(-0.28, 0.38, -2.8);
  const rightPlume = leftPlume.clone();
  rightPlume.position.x = 0.28;
  bodyGroup.add(leftPlume, rightPlume);

  // Thruster blue illumination
  const thrusterLight = new THREE.PointLight(0x0284c7, 0, 10);
  thrusterLight.position.set(0, 0.38, -2.4);
  bodyGroup.add(thrusterLight);

  root.add(bodyGroup);

  // 7. Turbine Aero Wheels with Brembo Calipers
  function createAeroWheel(): THREE.Group {
    const wheelGroup = new THREE.Group();

    // Tire tread
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, rubberMaterial);
    wheelGroup.add(tire);

    // Dark Alloy Rim Face
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.27, 20);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, chromeMaterial);
    wheelGroup.add(rim);

    // Spoke blades
    for (let s = 0; s < 5; s++) {
      const spokeGeo = new THREE.BoxGeometry(0.04, 0.22, 0.05);
      const spoke = new THREE.Mesh(spokeGeo, carbonMaterial);
      spoke.position.x = 0.13;
      spoke.rotation.x = (s * Math.PI * 2) / 5;
      wheelGroup.add(spoke);
    }

    // Ventilated Ceramic Rotor
    const rotorGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.03, 16);
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, carbonMaterial);
    rotor.position.x = 0.02;
    wheelGroup.add(rotor);

    // Red Brembo Caliper
    const caliperGeo = new THREE.BoxGeometry(0.09, 0.13, 0.09);
    const caliper = new THREE.Mesh(caliperGeo, caliperMaterial);
    caliper.position.set(0.02, 0.16, 0.03);
    wheelGroup.add(caliper);

    return wheelGroup;
  }

  // Wheel placement: Wheelbase 2.75m (+-1.375m), Track 1.88m (+-0.94m)
  const frontLeftWheel = createAeroWheel();
  frontLeftWheel.position.set(-0.94, 0.35, 1.35);

  const frontRightWheel = createAeroWheel();
  frontRightWheel.position.set(0.94, 0.35, 1.35);
  frontRightWheel.rotation.y = Math.PI;

  const rearLeftWheel = createAeroWheel();
  rearLeftWheel.position.set(-0.96, 0.35, -1.35);

  const rearRightWheel = createAeroWheel();
  rearRightWheel.position.set(0.96, 0.35, -1.35);
  rearRightWheel.rotation.y = Math.PI;

  root.add(frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel);

  // 8. Contact Shadow Grounding Disc (Pure dark soft shadow)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  sCtx.clearRect(0, 0, 128, 256);
  const radGrad = sCtx.createRadialGradient(64, 128, 10, 64, 128, 64);
  radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = radGrad;
  sCtx.fillRect(0, 0, 128, 256);

  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.8), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.02, 0);
  root.add(shadowMesh);

  return {
    root,
    bodyMesh: mainHull,
    paintMaterial,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    spoilerGroup,
    tailLightMesh,
    tailLightMaterial,
    headlightsMaterial,
    thrusterPlumes: [leftPlume, rightPlume],
    thrusterLight,
  };
}
