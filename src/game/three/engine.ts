/**
 * Three.js Game Engine & Render Loop for Tesla Roadster: Apex Pursuit
 * Adheres strictly to the Three.js skill & 3D games craft directives:
 * - isSoftwareGl detection & software pacing
 * - ACESFilmicToneMapping & RoomEnvironment
 * - Zero GC in animation loop (pre-allocated math objects)
 * - Dynamic chase camera with speed lag & FOV warp
 * - Hitstop freeze frames on impacts
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  VehicleState,
  VehicleInputs,
  createInitialVehicleState,
  stepVehiclePhysics,
  applyCollisionImpulse,
} from '../physics';
import {
  GameState,
  EnemyEntity,
  DroneStrikeTelegraph,
  HazardEntity,
  StageConfig,
  STAGES,
  updateSyndicateAI,
  createInitialRunStats,
  GameRunStats,
} from '../rules';
import { createTeslaRoadster, RoadsterMeshes, CAR_COLORS } from './carModel';
import { createWorld, WorldObjects } from './world';
import { soundEngine } from '../audio';

export type CameraViewMode = 'chase' | 'hood' | 'cockpit' | 'cinematic';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onHUDUpdate: (data: {
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
  }) => void;
  onGameOver: (stats: GameRunStats, won: boolean) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean = false;

  private lastTime: number = performance.now();
  private frameId: number = 0;
  private isDestroyed: boolean = false;

  // Game & Vehicle State
  public gameState: GameState = 'title';
  public vehicleState: VehicleState;
  public runStats: GameRunStats = createInitialRunStats();
  public currentStage: StageConfig = STAGES[0];
  public selectedColorHex: number = CAR_COLORS.midnightCherry;

  private roadster!: RoadsterMeshes;
  private world!: WorldObjects;

  // Entities
  private enemies: EnemyEntity[] = [];
  private droneStrikes: DroneStrikeTelegraph[] = [];
  private hazards: HazardEntity[] = [];
  private enemySpawnTimer: number = 0;

  // Camera & Juice
  public cameraMode: CameraViewMode = 'cinematic';
  private cameraTrauma: number = 0;
  private hitstopTimer: number = 0;
  private cinematicAngle: number = 0.8;

  // Reusable Scratch Objects (Zero GC in loop)
  private readonly _camTarget = new THREE.Vector3();
  private readonly _camDesired = new THREE.Vector3();

  // Inputs Hub
  private inputs: VehicleInputs = {
    throttle: 0,
    brake: 0,
    steer: 0,
    thruster: false,
    handbrake: false,
    emp: false,
  };
  private keysHeld = new Set<string>();

  // HUD Throttle
  private lastHUDTick: number = 0;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.vehicleState = createInitialVehicleState();

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060d);
    this.scene.fog = new THREE.FogExp2(0x04060d, 0.007);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 800);

    // 3. Renderer with ACES Filmic & SRGB
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment & Lighting Rig
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm Key Light + Cool Fill Light
    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    keyLight.position.set(12, 28, 16);
    keyLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 100;
      keyLight.shadow.bias = -0.0005;
      const d = 25;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.9);
    this.scene.add(hemiLight);

    // 5. Build Sub-Components
    this.roadster = createTeslaRoadster(this.selectedColorHex);
    this.scene.add(this.roadster.root);

    this.world = createWorld(this.scene);

    // 6. Listeners
    this.setupEventListeners();

    // 7. Start Render Loop
    this.tick();
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent scrolling with arrows/space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    this.keysHeld.add(e.code);

    if (this.gameState === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        this.startGame();
      }
      return;
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      this.togglePause();
    } else if (e.code === 'KeyC') {
      this.cycleCameraView();
    } else if (e.code === 'KeyM') {
      const isMuted = soundEngine.toggleMute();
      this.syncHUD(true, isMuted);
    } else if (e.code === 'KeyE') {
      this.triggerEMP();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = () => {
    this.keysHeld.clear();
  };

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setCarColor(colorHex: number) {
    this.selectedColorHex = colorHex;
    this.roadster.paintMaterial.color.setHex(colorHex);
  }

  public setStage(stageId: number) {
    const stage = STAGES.find((s) => s.id === stageId);
    if (stage) {
      this.currentStage = stage;
    }
  }

  public startGame() {
    soundEngine.init();
    soundEngine.startThrillerMusic();

    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.callbacks.onStateChange('playing');

    this.vehicleState = createInitialVehicleState(0, 0);
    this.runStats = createInitialRunStats();
    this.enemies = [];
    this.droneStrikes = [];
    this.hazards = [];
    this.enemySpawnTimer = 1.5;
    this.cameraMode = 'chase';
  }

  public togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      document.body.dataset.state = 'paused';
      this.callbacks.onStateChange('paused');
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      document.body.dataset.state = 'playing';
      this.callbacks.onStateChange('playing');
    }
  }

  public returnToTitle() {
    this.gameState = 'title';
    document.body.dataset.state = 'title';
    this.callbacks.onStateChange('title');
    this.cameraMode = 'cinematic';
    this.vehicleState = createInitialVehicleState(0, 0);
    this.enemies = [];
    this.droneStrikes = [];
    this.hazards = [];
    soundEngine.stopThrillerMusic();
  }

  public cycleCameraView(): CameraViewMode {
    if (this.cameraMode === 'chase') this.cameraMode = 'hood';
    else if (this.cameraMode === 'hood') this.cameraMode = 'cockpit';
    else this.cameraMode = 'chase';
    return this.cameraMode;
  }

  public triggerEMP() {
    if (this.vehicleState.empCharge < 95) return;
    this.vehicleState.empCharge = 0;
    this.world.triggerEMPVisual(this.vehicleState.x, this.vehicleState.z);
    soundEngine.playEMP();
    this.addTrauma(0.5);

    // Stun and damage all syndicate enemies within 35 meters
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.vehicleState.x, enemy.z - this.vehicleState.z);
      if (dist < 35) {
        enemy.stunTimer = 3.5;
        enemy.health -= 60;
        if (enemy.health <= 0) {
          this.runStats.syndicateNeutralized++;
          this.runStats.score += 750;
        }
      }
    }
  }

  public addTrauma(amount: number) {
    this.cameraTrauma = Math.min(1.0, this.cameraTrauma + amount);
  }

  private pollInputs() {
    // W/Up for throttle, S/Down for brake/regen, A/D or Left/Right for steer
    const throttle = (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) ? 1.0 : 0.0;
    const brake = (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) ? 1.0 : 0.0;
    let steer = 0;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) steer -= 1.0;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) steer += 1.0;

    const thruster = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight');
    const handbrake = this.keysHeld.has('Space');

    this.inputs.throttle = throttle;
    this.inputs.brake = brake;
    this.inputs.steer = steer;
    this.inputs.thruster = thruster;
    this.inputs.handbrake = handbrake;
  }

  private updateSimulation(dt: number) {
    if (this.gameState !== 'playing') return;

    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.pollInputs();

    // 1. Vehicle Physics Step
    stepVehiclePhysics(this.vehicleState, this.inputs, dt);

    // Constrain car inside highway boundaries (-11m to +11m)
    if (this.vehicleState.x < -10.5) {
      this.vehicleState.x = -10.5;
      this.vehicleState.lateralVelocity = Math.abs(this.vehicleState.lateralVelocity) * 0.4;
      applyCollisionImpulse(this.vehicleState, 1, 0, 0.4);
      soundEngine.playCollision(0.4);
      this.addTrauma(0.3);
    } else if (this.vehicleState.x > 10.5) {
      this.vehicleState.x = 10.5;
      this.vehicleState.lateralVelocity = -Math.abs(this.vehicleState.lateralVelocity) * 0.4;
      applyCollisionImpulse(this.vehicleState, -1, 0, 0.4);
      soundEngine.playCollision(0.4);
      this.addTrauma(0.3);
    }

    // 2. Sound Updates
    soundEngine.updateMotorAudio(
      this.vehicleState.speed,
      this.inputs.throttle,
      this.vehicleState.thrusterActive,
      this.vehicleState.isDrifting
    );

    // 3. Spawning Syndicate Enemies
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0 && this.enemies.length < this.currentStage.maxEnemies) {
      this.enemySpawnTimer = this.currentStage.enemySpawnRate;
      this.spawnSyndicateEnemy();
    }

    // 4. Update Syndicate AI and Encounters
    const { updatedEnemies, updatedStrikes, updatedHazards } = updateSyndicateAI(
      this.enemies,
      this.droneStrikes,
      this.hazards,
      this.vehicleState.x,
      this.vehicleState.z,
      this.vehicleState.speed,
      dt,
      (type) => soundEngine.playTelegraphSound(type),
      (strike) => this.handleDroneDetonation(strike)
    );
    this.enemies = updatedEnemies;
    this.droneStrikes = updatedStrikes;
    this.hazards = updatedHazards;

    // 5. Collisions with Enemies & Hazards
    this.checkCollisions();

    // 6. Skidmarks when drifting
    if (this.vehicleState.isDrifting) {
      this.world.addSkidmark(
        this.vehicleState.x - 0.8,
        this.vehicleState.z - 1.2,
        this.vehicleState.x + 0.8,
        this.vehicleState.z - 1.2
      );
    }

    // 7. Track Run Stats & Scoring
    this.runStats.timeElapsed += dt;
    this.runStats.distanceTraveled = this.vehicleState.totalDistance;
    const speedMph = this.vehicleState.speed * 2.23694;
    if (speedMph > this.runStats.topSpeedMph) {
      this.runStats.topSpeedMph = speedMph;
    }
    if (this.vehicleState.sprint0to60 && (!this.runStats.best0to60 || this.vehicleState.sprint0to60 < this.runStats.best0to60)) {
      this.runStats.best0to60 = this.vehicleState.sprint0to60;
    }
    if (this.vehicleState.thrusterActive) {
      this.runStats.thrusterTimeUsed += dt;
    }
    this.runStats.score += Math.round(this.vehicleState.speed * dt * 2.5);

    // 8. Win / Loss Check
    if (this.vehicleState.hullIntegrity <= 0) {
      this.handleGameOver(false);
    } else if (
      this.currentStage.targetDistance > 0 &&
      this.vehicleState.totalDistance >= this.currentStage.targetDistance
    ) {
      this.handleGameOver(true);
    }
  }

  private spawnSyndicateEnemy() {
    const types = this.currentStage.allowedTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `enemy_${Date.now()}_${Math.random()}`;

    // Spawn ahead or behind
    const spawnBehind = type === 'interceptor' && Math.random() > 0.35;
    const spawnZ = spawnBehind ? this.vehicleState.z - 65 : this.vehicleState.z + 120;
    const spawnX = (Math.floor(Math.random() * 5) - 2) * 4.0;

    this.enemies.push({
      id,
      type,
      x: spawnX,
      z: spawnZ,
      lane: Math.round(spawnX / 4),
      targetLane: Math.round(spawnX / 4),
      speed: spawnBehind ? this.vehicleState.speed + 12 : Math.max(20, this.vehicleState.speed * 0.8),
      health: type === 'enforcer' ? 200 : 100,
      maxHealth: type === 'enforcer' ? 200 : 100,
      telegraphTimer: 0,
      telegraphDuration: 0.7,
      isAttacking: false,
      attackCooldown: 1.0,
      stunTimer: 0,
      width: type === 'enforcer' ? 3.2 : 2.2,
      length: type === 'enforcer' ? 6.2 : 4.6,
    });
  }

  private handleDroneDetonation(strike: DroneStrikeTelegraph) {
    soundEngine.playCollision(1.5);
    const dist = Math.hypot(strike.x - this.vehicleState.x, strike.z - this.vehicleState.z);
    if (dist < strike.radius) {
      applyCollisionImpulse(this.vehicleState, 0, -1, 1.8);
      this.addTrauma(0.65);
      this.hitstopTimer = 0.05;
      this.runStats.damageTaken += 20;
    }
  }

  private checkCollisions() {
    const pX = this.vehicleState.x;
    const pZ = this.vehicleState.z;

    // Check Enemies
    for (const enemy of this.enemies) {
      const dx = Math.abs(enemy.x - pX);
      const dz = Math.abs(enemy.z - pZ);
      const hitW = (enemy.width + 1.9) / 2;
      const hitL = (enemy.length + 4.4) / 2;

      if (dx < hitW && dz < hitL) {
        // Collision!
        const relativeSpeed = Math.abs(this.vehicleState.speed - enemy.speed);
        const intensity = Math.min(2.0, 0.5 + relativeSpeed / 20);
        applyCollisionImpulse(this.vehicleState, Math.sign(pX - enemy.x), 1, intensity);
        soundEngine.playCollision(intensity);
        this.addTrauma(0.4 * intensity);
        this.hitstopTimer = 0.04;
        this.runStats.damageTaken += intensity * 15;

        // Displace enemy
        enemy.x += Math.sign(enemy.x - pX) * 4.0;
        enemy.health -= 35;
        if (enemy.health <= 0) {
          this.runStats.syndicateNeutralized++;
          this.runStats.score += 500;
        }
      } else if (dx < hitW + 1.2 && dz < hitL + 2.0) {
        // Near miss bonus!
        this.runStats.nearMissCount++;
        this.runStats.score += 25;
      }
    }

    // Check Hazards (Shock barriers)
    for (const hazard of this.hazards) {
      if (!hazard.active) continue;
      const dx = Math.abs(hazard.x - pX);
      const dz = Math.abs(hazard.z - pZ);
      if (dx < (hazard.width + 1.8) / 2 && dz < (hazard.length + 4.0) / 2) {
        hazard.active = false;
        applyCollisionImpulse(this.vehicleState, 0, -1, 1.2);
        soundEngine.playCollision(1.2);
        this.addTrauma(0.5);
        this.runStats.damageTaken += 15;
      }
    }
  }

  private handleGameOver(won: boolean) {
    this.gameState = won ? 'victory' : 'gameover';
    document.body.dataset.state = 'gameover';
    this.callbacks.onStateChange(this.gameState);
    this.callbacks.onGameOver({ ...this.runStats }, won);
    soundEngine.stopThrillerMusic();
  }

  private updateRoadsterVisuals() {
    const s = this.vehicleState;

    // Position and orientation
    this.roadster.root.position.set(s.x, s.y, s.z);
    this.roadster.root.rotation.set(s.pitch, s.yaw, s.roll);

    // Front wheels steering
    this.roadster.frontLeftWheel.rotation.y = s.steerAngle;
    this.roadster.frontRightWheel.rotation.y = Math.PI + s.steerAngle;

    // Wheel spin rotation based on distance/speed
    const wheelRot = s.speed * 0.12;
    this.roadster.frontLeftWheel.rotation.x += wheelRot;
    this.roadster.frontRightWheel.rotation.x -= wheelRot;
    this.roadster.rearLeftWheel.rotation.x += wheelRot;
    this.roadster.rearRightWheel.rotation.x -= wheelRot;

    // Active aero spoiler elevation & angle
    this.roadster.spoilerGroup.position.y = 0.66 + s.activeAeroAngle * 0.35;
    this.roadster.spoilerGroup.rotation.x = -s.activeAeroAngle;

    // Taillight glow on braking
    if (this.inputs.brake > 0.1) {
      this.roadster.tailLightMaterial.color.setHex(0xff0000);
    } else {
      this.roadster.tailLightMaterial.color.setHex(0x991b1b);
    }

    // Cold-gas thruster plumes
    for (const plume of this.roadster.thrusterPlumes) {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = s.thrusterActive ? 0.95 : 0.0;
    }
    this.roadster.thrusterLight.intensity = s.thrusterActive ? 4.5 : 0;
  }

  private updateCamera(dt: number) {
    const s = this.vehicleState;

    if (this.gameState === 'title') {
      // Cinematic slow turntable orbit around hero car at dramatic 3/4 angle
      this.cinematicAngle += 0.35 * dt;
      const radius = 6.4;
      this.camera.position.set(
        Math.sin(this.cinematicAngle) * radius,
        1.75 + Math.sin(this.cinematicAngle * 0.4) * 0.3,
        Math.cos(this.cinematicAngle) * radius
      );
      this._camTarget.set(0, 0.45, 0.2);
      this.camera.lookAt(this._camTarget);
      this.camera.fov = 48;
      this.camera.updateProjectionMatrix();
      return;
    }

    // Camera follow modes
    if (this.cameraMode === 'chase') {
      const speedRatio = Math.min(1.2, s.speed / 80);
      const followDist = 8.0 + speedRatio * 3.5;
      const followHeight = 3.2 + speedRatio * 0.8;

      // Desired camera position behind vehicle yaw
      const cosYaw = Math.cos(s.yaw);
      const sinYaw = Math.sin(s.yaw);
      this._camDesired.set(
        s.x - sinYaw * followDist,
        s.y + followHeight,
        s.z - cosYaw * followDist
      );

      // Smooth exponential damping
      const dampFactor = 1 - Math.exp(-12 * dt);
      this.camera.position.lerp(this._camDesired, dampFactor);

      // Look slightly ahead of car
      this._camTarget.set(s.x + sinYaw * 6, s.y + 1.2, s.z + cosYaw * 6);
      this.camera.lookAt(this._camTarget);

      // FOV speed warp (60 -> 78 deg at hyper speed)
      this.camera.fov = 60 + speedRatio * 18;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'hood') {
      const cosYaw = Math.cos(s.yaw);
      const sinYaw = Math.sin(s.yaw);
      this.camera.position.set(s.x + sinYaw * 1.6, s.y + 0.95, s.z + cosYaw * 1.6);
      this._camTarget.set(s.x + sinYaw * 30, s.y + 0.9, s.z + cosYaw * 30);
      this.camera.lookAt(this._camTarget);
      this.camera.fov = 72;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'cockpit') {
      const cosYaw = Math.cos(s.yaw);
      const sinYaw = Math.sin(s.yaw);
      this.camera.position.set(s.x - 0.35 + sinYaw * 0.2, s.y + 0.9, s.z + cosYaw * 0.2);
      this._camTarget.set(s.x + sinYaw * 20, s.y + 0.8, s.z + cosYaw * 20);
      this.camera.lookAt(this._camTarget);
      this.camera.fov = 65;
      this.camera.updateProjectionMatrix();
    }

    // Camera Trauma Shake
    if (this.cameraTrauma > 0) {
      const shake = this.cameraTrauma * this.cameraTrauma;
      this.camera.position.x += (Math.random() - 0.5) * shake * 0.6;
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - 2.5 * dt);
    }
  }

  private syncHUD(force: boolean = false, isMuted: boolean = false) {
    const now = performance.now();
    if (!force && now - this.lastHUDTick < 80) return; // ~12Hz throttling to decouple React
    this.lastHUDTick = now;

    const speedMps = this.vehicleState.speed;
    const speedMph = Math.max(0, Math.round(speedMps * 2.23694));
    const speedKph = Math.max(0, Math.round(speedMps * 3.6));

    this.callbacks.onHUDUpdate({
      speedMph,
      speedKph,
      thrusterGas: Math.round(this.vehicleState.thrusterGas),
      thrusterActive: this.vehicleState.thrusterActive,
      batteryThermal: Math.round(this.vehicleState.batteryThermal),
      hullIntegrity: Math.round(this.vehicleState.hullIntegrity),
      empCharge: Math.round(this.vehicleState.empCharge),
      distance: Math.round(this.vehicleState.totalDistance),
      targetDistance: this.currentStage.targetDistance,
      sprint0to60: this.vehicleState.sprint0to60,
      sprintTimer: this.vehicleState.sprintTimer,
      score: this.runStats.score,
      cameraMode: this.cameraMode,
      isMuted,
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.isDestroyed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    // 1. Simulation Step
    this.updateSimulation(dt);

    // 2. 3D World & Vehicle Mesh Updates
    this.updateRoadsterVisuals();
    this.world.updateWorld(this.vehicleState.z, this.vehicleState.speed, dt);
    this.world.syncEnemies(this.enemies, dt);
    this.world.syncHazards(this.hazards);
    this.world.syncDroneStrikes(this.droneStrikes);

    // 3. Camera Rig Step
    this.updateCamera(dt);

    // 4. Render Frame
    this.renderer.render(this.scene, this.camera);

    // 5. HUD Sync
    if (this.gameState === 'playing') {
      this.syncHUD();
    }

    // 6. Next frame scheduling with Software WebGL safeguard
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.isSoftwareGl) {
      clearTimeout(this.frameId);
    } else {
      cancelAnimationFrame(this.frameId);
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('blur', this.handleBlur);

    soundEngine.stopThrillerMusic();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
