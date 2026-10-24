/**
 * Tesla Roadster: Apex Pursuit - Encounter Rules & Syndicate AI
 * Encounters, 3 distinct enemy policies with visible attack telegraphs,
 * level objectives, and scoring metrics.
 */

export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type EnemyType = 'interceptor' | 'enforcer' | 'drone';

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  x: number;
  z: number;
  lane: number; // -2, -1, 0, 1, 2 (corridor lanes)
  targetLane: number;
  speed: number; // m/s
  health: number; // 0 to 100
  maxHealth: number;
  telegraphTimer: number; // >0 indicates active telegraph warning
  telegraphDuration: number;
  isAttacking: boolean;
  attackCooldown: number;
  stunTimer: number; // Disrupted by player's EMP shockwave
  width: number;
  length: number;
}

export interface HazardEntity {
  id: string;
  type: 'shock_barrier' | 'debris' | 'spike_strip';
  x: number;
  z: number;
  width: number;
  length: number;
  active: boolean;
}

export interface DroneStrikeTelegraph {
  id: string;
  x: number;
  z: number;
  radius: number;
  timer: number; // Count down from duration (e.g. 0.65s)
  duration: number;
  hasExploded: boolean;
}

export interface StageConfig {
  id: number;
  name: string;
  subtitle: string;
  targetDistance: number; // in meters (0 for endless)
  skylineTheme: 'neon_city' | 'ocean_causeway' | 'storm_apex';
  enemySpawnRate: number; // Every X seconds
  maxEnemies: number;
  allowedTypes: EnemyType[];
  hazardFrequency: number;
  target0to60Time: number; // Target benchmark (e.g. < 1.9s)
}

export const STAGES: StageConfig[] = [
  {
    id: 1,
    name: 'Sector 7: Neon Highway',
    subtitle: 'Evade initial Syndicate Interceptors and hit 200 mph',
    targetDistance: 2500,
    skylineTheme: 'neon_city',
    enemySpawnRate: 4.5,
    maxEnemies: 4,
    allowedTypes: ['interceptor'],
    hazardFrequency: 0.15,
    target0to60Time: 1.95,
  },
  {
    id: 2,
    name: 'Coastal Causeway Blockade',
    subtitle: 'Overcome Armored Enforcers and Skyline Drone strikes',
    targetDistance: 4000,
    skylineTheme: 'ocean_causeway',
    enemySpawnRate: 3.5,
    maxEnemies: 6,
    allowedTypes: ['interceptor', 'enforcer', 'drone'],
    hazardFrequency: 0.35,
    target0to60Time: 1.65,
  },
  {
    id: 3,
    name: 'Midnight Apex Extraction',
    subtitle: 'Full syndicate pursuit wing. Reach the extraction dropship',
    targetDistance: 6000,
    skylineTheme: 'storm_apex',
    enemySpawnRate: 2.8,
    maxEnemies: 8,
    allowedTypes: ['interceptor', 'enforcer', 'drone'],
    hazardFrequency: 0.55,
    target0to60Time: 1.45,
  },
  {
    id: 4,
    name: 'Endless Protocol',
    subtitle: 'Infinite high-speed survival with dynamic threat escalation',
    targetDistance: 0,
    skylineTheme: 'neon_city',
    enemySpawnRate: 2.5,
    maxEnemies: 10,
    allowedTypes: ['interceptor', 'enforcer', 'drone'],
    hazardFrequency: 0.65,
    target0to60Time: 1.5,
  },
];

export interface GameRunStats {
  score: number;
  distanceTraveled: number;
  topSpeedMph: number;
  best0to60: number | null;
  syndicateNeutralized: number;
  nearMissCount: number;
  thrusterTimeUsed: number;
  damageTaken: number;
  timeElapsed: number;
}

export function createInitialRunStats(): GameRunStats {
  return {
    score: 0,
    distanceTraveled: 0,
    topSpeedMph: 0,
    best0to60: null,
    syndicateNeutralized: 0,
    nearMissCount: 0,
    thrusterTimeUsed: 0,
    damageTaken: 0,
    timeElapsed: 0,
  };
}

/**
 * Step Syndicate AI entities with distinct movement policies
 */
export function updateSyndicateAI(
  enemies: EnemyEntity[],
  droneStrikes: DroneStrikeTelegraph[],
  hazards: HazardEntity[],
  playerX: number,
  playerZ: number,
  playerSpeed: number,
  dt: number,
  onTelegraphSound?: (type: EnemyType) => void,
  onDroneStrikeDetonate?: (strike: DroneStrikeTelegraph) => void
): { updatedEnemies: EnemyEntity[]; updatedStrikes: DroneStrikeTelegraph[]; updatedHazards: HazardEntity[] } {
  const activeEnemies: EnemyEntity[] = [];

  for (const enemy of enemies) {
    // If stunned by EMP, slide forward with deceleration and skip attacks
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      enemy.speed *= 0.96;
      enemy.z += enemy.speed * dt;
      activeEnemies.push(enemy);
      continue;
    }

    const distToPlayerZ = enemy.z - playerZ;
    const lateralDist = Math.abs(enemy.x - playerX);

    // Archetype 1: Interceptor (High-speed ramming pursuit from behind or side)
    if (enemy.type === 'interceptor') {
      // Seek player's lane
      const laneDelta = playerX - enemy.x;
      enemy.x += Math.sign(laneDelta) * Math.min(Math.abs(laneDelta), 7.5 * dt);

      // If behind player, surge forward with high speed
      if (distToPlayerZ < 0) {
        enemy.speed = Math.min(100, playerSpeed + 8.0);
      } else {
        // Matched pacing near player
        enemy.speed = playerSpeed * 0.98;
      }

      // Attack telegraph: Laser ramming warning when close behind
      if (distToPlayerZ > -45 && distToPlayerZ < -8 && lateralDist < 4.0) {
        if (enemy.telegraphTimer <= 0 && enemy.attackCooldown <= 0) {
          enemy.telegraphTimer = 0.7; // 700ms telegraph warning
          enemy.telegraphDuration = 0.7;
          onTelegraphSound?.('interceptor');
        }
      }

      if (enemy.telegraphTimer > 0) {
        enemy.telegraphTimer -= dt;
        if (enemy.telegraphTimer <= 0) {
          // Surge attack forward!
          enemy.speed = playerSpeed + 24;
          enemy.attackCooldown = 3.0;
        }
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= dt;
      }
    }

    // Archetype 2: Armored Enforcer (Heavy road blocker cruising in front)
    else if (enemy.type === 'enforcer') {
      // Cruises ahead of player at steady or defensive speed
      if (distToPlayerZ > 0 && distToPlayerZ < 90) {
        enemy.speed = Math.max(25, playerSpeed * 0.82);
      } else if (distToPlayerZ <= 0) {
        enemy.speed = playerSpeed * 1.05; // Catch back up
      }

      // Lane blocking behavior: slowly shift into player's lane
      const targetLaneX = Math.round(playerX / 4.0) * 4.0;
      const laneDiff = targetLaneX - enemy.x;
      enemy.x += Math.sign(laneDiff) * Math.min(Math.abs(laneDiff), 3.2 * dt);

      // Drops shock barriers when player gets close from behind
      if (distToPlayerZ > 5 && distToPlayerZ < 35 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 4.5;
        // Deploy shock barrier hazard behind
        hazards.push({
          id: `hazard_${Date.now()}_${Math.random()}`,
          type: 'shock_barrier',
          x: enemy.x,
          z: enemy.z - 8,
          width: 3.5,
          length: 1.5,
          active: true,
        });
        onTelegraphSound?.('enforcer');
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= dt;
      }
    }

    // Archetype 3: Skyline Drone (High-altitude pursuit calling orbital pulse strikes)
    else if (enemy.type === 'drone') {
      // Hover at constant distance ahead/above
      enemy.speed = playerSpeed + 2.0;
      enemy.x += (playerX - enemy.x) * 2.0 * dt;

      if (enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 3.8;
        // Paint laser strike on asphalt ahead of player
        const leadDistance = Math.max(18, playerSpeed * 0.95);
        droneStrikes.push({
          id: `strike_${Date.now()}`,
          x: playerX + (Math.random() - 0.5) * 3,
          z: playerZ + leadDistance,
          radius: 3.8,
          timer: 0.85, // 850ms windup telegraph
          duration: 0.85,
          hasExploded: false,
        });
        onTelegraphSound?.('drone');
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= dt;
      }
    }

    enemy.z += enemy.speed * dt;

    // Cull enemies that fall too far behind (> 160m) or ahead (> 220m)
    if (distToPlayerZ > -160 && distToPlayerZ < 220 && enemy.health > 0) {
      activeEnemies.push(enemy);
    }
  }

  // Update drone strikes
  const activeStrikes: DroneStrikeTelegraph[] = [];
  for (const strike of droneStrikes) {
    strike.timer -= dt;
    if (strike.timer <= 0 && !strike.hasExploded) {
      strike.hasExploded = true;
      onDroneStrikeDetonate?.(strike);
    }
    // Keep for another 0.25s for explosion visual
    if (strike.timer > -0.25) {
      activeStrikes.push(strike);
    }
  }

  // Update hazards
  const activeHazards = hazards.filter((h) => Math.abs(h.z - playerZ) < 140 && h.active);

  return { updatedEnemies: activeEnemies, updatedStrikes: activeStrikes, updatedHazards: activeHazards };
}
