/**
 * World Environment, Highway System, Syndicate 3D Models, and FX
 * Procedural neon-lit highway corridor, rain-slicked asphalt, city skyline,
 * syndicate pursuit vehicles, and pooled particle systems.
 */

import * as THREE from 'three';
import { EnemyEntity, DroneStrikeTelegraph, HazardEntity } from '../rules';

export interface WorldObjects {
  scene: THREE.Scene;
  roadSegments: THREE.Group[];
  skylineGroup: THREE.Group;
  rainSystem: THREE.Points;
  enemyMeshMap: Map<string, THREE.Group>;
  hazardMeshMap: Map<string, THREE.Mesh>;
  strikeMeshMap: Map<string, THREE.Group>;
  empRingMesh: THREE.Mesh;
  empRingMaterial: THREE.MeshBasicMaterial;
  skidmarkLines: THREE.LineSegments[];
  updateWorld: (playerZ: number, playerSpeed: number, dt: number) => void;
  syncEnemies: (enemies: EnemyEntity[], dt: number) => void;
  syncHazards: (hazards: HazardEntity[]) => void;
  syncDroneStrikes: (strikes: DroneStrikeTelegraph[]) => void;
  triggerEMPVisual: (x: number, z: number) => void;
  addSkidmark: (flX: number, flZ: number, frX: number, frZ: number) => void;
}

export function createWorld(scene: THREE.Scene): WorldObjects {
  // 1. Procedural Road Texture (Dark midnight rain-slicked asphalt with cyan/amber markings)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const ctx = roadCanvas.getContext('2d')!;

  // Deep dark asphalt base
  ctx.fillStyle = '#060911';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt texture grain
  for (let i = 0; i < 3500; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const alpha = Math.random() * 0.06;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }

  // Outer solid neon cyan shoulder lines
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(28, 512);
  ctx.moveTo(484, 0);
  ctx.lineTo(484, 512);
  ctx.stroke();

  // Dashed lane dividers
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.setLineDash([54, 46]);

  // 4 divider lines across 5 lanes
  [119, 210, 302, 393].forEach((xPos) => {
    ctx.beginPath();
    ctx.moveTo(xPos, 0);
    ctx.lineTo(xPos, 512);
    ctx.stroke();
  });

  const roadTexture = new THREE.CanvasTexture(roadCanvas);
  roadTexture.colorSpace = THREE.SRGBColorSpace;
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(1, 4);

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.52, // Soft wet road specular response, prevents blinding glare
    metalness: 0.08,
  });

  // Guardrail materials
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.6,
    metalness: 0.4,
  });

  const neonCyanMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
  });

  // 2. Looping Road Segments
  const SEGMENT_LENGTH = 120;
  const NUM_SEGMENTS = 7;
  const ROAD_WIDTH = 24;
  const roadSegments: THREE.Group[] = [];

  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const segment = new THREE.Group();
    segment.position.z = i * SEGMENT_LENGTH - SEGMENT_LENGTH;

    // Road plane
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
    roadMesh.receiveShadow = true;
    segment.add(roadMesh);

    // Left Barrier & Neon Line
    const leftBarrierGeo = new THREE.BoxGeometry(0.8, 1.2, SEGMENT_LENGTH);
    const leftBarrier = new THREE.Mesh(leftBarrierGeo, barrierMat);
    leftBarrier.position.set(-ROAD_WIDTH / 2 - 0.4, 0.6, 0);
    const leftNeonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, SEGMENT_LENGTH), neonCyanMat);
    leftNeonStrip.position.set(-ROAD_WIDTH / 2 + 0.06, 0.9, 0);

    // Right Barrier & Neon Line
    const rightBarrier = leftBarrier.clone();
    rightBarrier.position.x = ROAD_WIDTH / 2 + 0.4;
    const rightNeonStrip = leftNeonStrip.clone();
    rightNeonStrip.position.x = ROAD_WIDTH / 2 - 0.06;

    segment.add(leftBarrier, rightBarrier, leftNeonStrip, rightNeonStrip);

    // Highway Streetlamp Poles every segment
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 9.0, 8);
    const leftPole = new THREE.Mesh(poleGeo, barrierMat);
    leftPole.position.set(-ROAD_WIDTH / 2 - 1.2, 4.5, 0);

    const armGeo = new THREE.BoxGeometry(3.5, 0.15, 0.15);
    const leftArm = new THREE.Mesh(armGeo, barrierMat);
    leftArm.position.set(-ROAD_WIDTH / 2 + 0.4, 8.8, 0);

    const lampBulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.1, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    lampBulb.position.set(-ROAD_WIDTH / 2 + 1.8, 8.7, 0);

    segment.add(leftPole, leftArm, lampBulb);

    // Overhead Gantry on alternate segments
    if (i % 2 === 0) {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.z = SEGMENT_LENGTH / 2;

      const postGeo = new THREE.BoxGeometry(0.6, 8.0, 0.6);
      const leftPost = new THREE.Mesh(postGeo, barrierMat);
      leftPost.position.set(-ROAD_WIDTH / 2 - 0.6, 4.0, 0);
      const rightPost = leftPost.clone();
      rightPost.position.x = ROAD_WIDTH / 2 + 0.6;

      const beamGeo = new THREE.BoxGeometry(ROAD_WIDTH + 2.4, 0.9, 0.9);
      const beam = new THREE.Mesh(beamGeo, barrierMat);
      beam.position.set(0, 7.8, 0);

      // Digital sign board
      const signGeo = new THREE.PlaneGeometry(14, 2.0);
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = '#020617';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.fillStyle = '#38bdf8';
      sCtx.font = 'bold 34px monospace';
      sCtx.textAlign = 'center';
      sCtx.fillText('SECTOR CORRIDOR // APEX SPRINT', 256, 50);
      sCtx.fillStyle = '#ef4444';
      sCtx.font = 'bold 26px monospace';
      sCtx.fillText('ALERT: SYNDICATE INTERCEPT ACTIVE', 256, 96);

      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 7.7, -0.5);

      gantryGroup.add(leftPost, rightPost, beam, signMesh);
      segment.add(gantryGroup);
    }

    scene.add(segment);
    roadSegments.push(segment);
  }

  // 3. Cyberpunk Horizon Skyline (Atmospheric backdrop)
  const skylineGroup = new THREE.Group();
  const towerGeo = new THREE.BoxGeometry(18, 140, 18);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x050811,
    roughness: 0.7,
    metalness: 0.6,
  });

  const windowMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const windowGeo = new THREE.BoxGeometry(18.2, 2.2, 18.2);

  for (let b = 0; b < 22; b++) {
    const side = b % 2 === 0 ? -1 : 1;
    const distSide = side * (40 + Math.random() * 65);
    const zPos = (b - 11) * 60;
    const height = 70 + Math.random() * 90;

    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.scale.set(1.0 + Math.random() * 0.7, height / 140, 1.0 + Math.random() * 0.7);
    tower.position.set(distSide, height / 2, zPos);

    const winMesh = new THREE.Mesh(windowGeo, windowMat);
    winMesh.position.set(distSide, height * 0.7, zPos);
    winMesh.scale.set(tower.scale.x, 1, tower.scale.z);

    skylineGroup.add(tower, winMesh);
  }
  scene.add(skylineGroup);

  // 4. Rain Particles (Delicate, sleek vertical streaks)
  const RAIN_COUNT = 2500;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT * 3; i += 3) {
    rainPositions[i] = (Math.random() - 0.5) * 60;
    rainPositions[i + 1] = Math.random() * 35;
    rainPositions[i + 2] = (Math.random() - 0.5) * 140;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

  const rainMat = new THREE.PointsMaterial({
    color: 0x7dd3fc,
    size: 0.08, // Subtle thin droplet size
    transparent: true,
    opacity: 0.45,
  });
  const rainSystem = new THREE.Points(rainGeo, rainMat);
  scene.add(rainSystem);

  // 5. EMP Shockwave Ring
  const empRingGeo = new THREE.RingGeometry(0.5, 1.6, 32);
  empRingGeo.rotateX(-Math.PI / 2);
  const empRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const empRingMesh = new THREE.Mesh(empRingGeo, empRingMaterial);
  empRingMesh.position.set(0, 0.08, 0);
  scene.add(empRingMesh);

  let empRingActive = false;
  let empRingScale = 1.0;

  // 6. Syndicate Pursuit Meshes
  const enemyMeshMap = new Map<string, THREE.Group>();
  const hazardMeshMap = new Map<string, THREE.Mesh>();
  const strikeMeshMap = new Map<string, THREE.Group>();

  function createEnemyMesh(type: 'interceptor' | 'enforcer' | 'drone'): THREE.Group {
    const group = new THREE.Group();

    if (type === 'interceptor') {
      // Aggressive stealth black pursuit wedge with red headlights & targeting laser
      const bodyGeo = new THREE.BoxGeometry(2.1, 0.55, 4.5);
      const chaserMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.35,
        metalness: 0.8,
      });
      const body = new THREE.Mesh(bodyGeo, chaserMat);
      body.position.y = 0.4;

      const canopyGeo = new THREE.BoxGeometry(1.4, 0.4, 1.8);
      const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0x18181b, roughness: 0.1 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 0.7, -0.2);

      const redLightGeo = new THREE.BoxGeometry(1.8, 0.08, 0.1);
      const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const light = new THREE.Mesh(redLightGeo, redLightMat);
      light.position.set(0, 0.4, 2.26);

      // Red laser sight aiming line
      const laserGeo = new THREE.CylinderGeometry(0.03, 0.03, 30, 8);
      laserGeo.rotateX(Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.0,
      });
      const laser = new THREE.Mesh(laserGeo, laserMat);
      laser.position.set(0, 0.4, 16);
      laser.name = 'laserSight';

      group.add(body, canopy, light, laser);
    } else if (type === 'enforcer') {
      // Armored blockade rig
      const cabGeo = new THREE.BoxGeometry(3.0, 2.2, 5.8);
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7, metalness: 0.4 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.y = 1.3;

      const ramGeo = new THREE.BoxGeometry(3.2, 0.8, 0.5);
      const ramMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.4, metalness: 0.85 });
      const ram = new THREE.Mesh(ramGeo, ramMat);
      ram.position.set(0, 0.55, -3.0);

      const strobeGeo = new THREE.BoxGeometry(2.2, 0.2, 0.2);
      const strobeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const strobe = new THREE.Mesh(strobeGeo, strobeMat);
      strobe.position.set(0, 2.5, 0);

      group.add(cab, ram, strobe);
    } else if (type === 'drone') {
      // Quad hover drone
      const centerGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.35, 8);
      const droneMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2, metalness: 0.9 });
      const center = new THREE.Mesh(centerGeo, droneMat);

      const eyeGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.y = -0.2;

      group.add(center, eye);
      group.position.y = 5.2;
    }

    scene.add(group);
    return group;
  }

  // 7. Hazard Mesh Factory (Shock barriers)
  function createHazardMesh(): THREE.Mesh {
    const geo = new THREE.BoxGeometry(3.6, 1.2, 0.35);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
  }

  // 8. Drone Strike Reticle on Asphalt
  function createStrikeMesh(): THREE.Group {
    const grp = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(3.2, 3.8, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.05;

    const lineGeo = new THREE.PlaneGeometry(0.12, 7.6);
    lineGeo.rotateX(-Math.PI / 2);
    const lineH = new THREE.Mesh(lineGeo, ringMat);
    lineH.position.y = 0.06;
    const lineV = lineH.clone();
    lineV.rotation.y = Math.PI / 2;

    grp.add(ring, lineH, lineV);
    scene.add(grp);
    return grp;
  }

  const skidmarkLines: THREE.LineSegments[] = [];

  return {
    scene,
    roadSegments,
    skylineGroup,
    rainSystem,
    enemyMeshMap,
    hazardMeshMap,
    strikeMeshMap,
    empRingMesh,
    empRingMaterial,
    skidmarkLines,

    updateWorld: (playerZ: number, _playerSpeed: number, dt: number) => {
      // 1. Recycle road segments
      for (const seg of roadSegments) {
        if (seg.position.z < playerZ - SEGMENT_LENGTH * 1.5) {
          seg.position.z += SEGMENT_LENGTH * NUM_SEGMENTS;
        }
      }

      // 2. Animate skyline parallax
      skylineGroup.position.z = playerZ * 0.45;

      // 3. Animate rain
      const positions = rainGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < RAIN_COUNT * 3; i += 3) {
        positions[i + 1] -= (26 + Math.random() * 12) * dt;
        if (positions[i + 1] < 0) {
          positions[i + 1] = 35;
          positions[i] = (Math.random() - 0.5) * 60;
          positions[i + 2] = playerZ + (Math.random() - 0.5) * 120;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      // 4. Animate EMP shockwave
      if (empRingActive) {
        empRingScale += 28 * dt;
        empRingMesh.scale.set(empRingScale, 1, empRingScale);
        const opacity = Math.max(0, 0.9 - empRingScale / 25);
        empRingMaterial.opacity = opacity;
        if (empRingScale > 24) {
          empRingActive = false;
          empRingMaterial.opacity = 0;
        }
      }
    },

    syncEnemies: (enemies: EnemyEntity[], _dt: number) => {
      const currentIds = new Set(enemies.map((e) => e.id));

      for (const [id, mesh] of enemyMeshMap.entries()) {
        if (!currentIds.has(id)) {
          scene.remove(mesh);
          enemyMeshMap.delete(id);
        }
      }

      for (const enemy of enemies) {
        let mesh = enemyMeshMap.get(enemy.id);
        if (!mesh) {
          mesh = createEnemyMesh(enemy.type);
          enemyMeshMap.set(enemy.id, mesh);
        }

        mesh.position.set(enemy.x, enemy.type === 'drone' ? 5.2 : 0, enemy.z);

        if (enemy.type === 'interceptor') {
          const laser = mesh.getObjectByName('laserSight') as THREE.Mesh;
          if (laser) {
            const mat = laser.material as THREE.MeshBasicMaterial;
            mat.opacity = enemy.telegraphTimer > 0 ? 0.85 : 0.0;
          }
        }
      }
    },

    syncHazards: (hazards: HazardEntity[]) => {
      const currentIds = new Set(hazards.map((h) => h.id));

      for (const [id, mesh] of hazardMeshMap.entries()) {
        if (!currentIds.has(id)) {
          scene.remove(mesh);
          hazardMeshMap.delete(id);
        }
      }

      for (const hazard of hazards) {
        let mesh = hazardMeshMap.get(hazard.id);
        if (!mesh) {
          mesh = createHazardMesh();
          hazardMeshMap.set(hazard.id, mesh);
        }
        mesh.position.set(hazard.x, 0.6, hazard.z);
      }
    },

    syncDroneStrikes: (strikes: DroneStrikeTelegraph[]) => {
      const currentIds = new Set(strikes.map((s) => s.id));

      for (const [id, grp] of strikeMeshMap.entries()) {
        if (!currentIds.has(id)) {
          scene.remove(grp);
          strikeMeshMap.delete(id);
        }
      }

      for (const strike of strikes) {
        let grp = strikeMeshMap.get(strike.id);
        if (!grp) {
          grp = createStrikeMesh();
          strikeMeshMap.set(strike.id, grp);
        }
        grp.position.set(strike.x, 0.05, strike.z);

        const progress = Math.max(0, strike.timer / strike.duration);
        const scale = 0.5 + progress * 0.7;
        grp.scale.set(scale, 1, scale);
      }
    },

    triggerEMPVisual: (x: number, z: number) => {
      empRingActive = true;
      empRingScale = 1.0;
      empRingMesh.position.set(x, 0.08, z);
      empRingMaterial.opacity = 0.9;
    },

    addSkidmark: (flX: number, flZ: number, frX: number, frZ: number) => {
      const lineGeo = new THREE.BufferGeometry();
      const points = new Float32Array([flX, 0.03, flZ, frX, 0.03, frZ]);
      lineGeo.setAttribute('position', new THREE.BufferAttribute(points, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x09090b,
        transparent: true,
        opacity: 0.6,
      });
      const line = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(line);
      skidmarkLines.push(line);

      if (skidmarkLines.length > 80) {
        const oldest = skidmarkLines.shift();
        if (oldest) {
          scene.remove(oldest);
          oldest.geometry.dispose();
        }
      }
    },
  };
}
