import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateSyndicateAI,
  EnemyEntity,
  DroneStrikeTelegraph,
  HazardEntity,
  STAGES,
} from './rules';

test('syndicate AI steps interceptor with pursuit movement toward player lane', () => {
  const initialInterceptor: EnemyEntity = {
    id: 'test_interceptor',
    type: 'interceptor',
    x: 10,
    z: -30,
    lane: 2,
    targetLane: 0,
    speed: 30,
    health: 100,
    maxHealth: 100,
    telegraphTimer: 0,
    telegraphDuration: 0.7,
    isAttacking: false,
    attackCooldown: 0,
    stunTimer: 0,
    width: 2.2,
    length: 4.8,
  };

  const { updatedEnemies } = updateSyndicateAI(
    [initialInterceptor],
    [],
    [],
    0, // player is at x=0
    0, // player is at z=0
    35,
    0.1
  );

  assert.equal(updatedEnemies.length, 1);
  assert.ok(
    updatedEnemies[0].x < 10,
    `Interceptor should steer left toward player at x=0, got ${updatedEnemies[0].x}`
  );
  assert.ok(
    updatedEnemies[0].speed > 35,
    `Interceptor behind player should surge faster than player speed (35), got ${updatedEnemies[0].speed}`
  );
});

test('syndicate drone strikes detonate and trigger detonation callback', () => {
  let detonated = false;
  const strike: DroneStrikeTelegraph = {
    id: 'test_strike',
    x: 0,
    z: 20,
    radius: 3.8,
    timer: 0.05,
    duration: 0.85,
    hasExploded: false,
  };

  const { updatedStrikes } = updateSyndicateAI(
    [],
    [strike],
    [],
    0,
    0,
    30,
    0.1,
    undefined,
    () => {
      detonated = true;
    }
  );

  assert.ok(detonated, 'Drone strike should trigger detonation callback upon timer expiration');
  assert.ok(updatedStrikes[0].hasExploded, 'Strike should be marked hasExploded');
});

test('stages configuration defines 4 distinct escalating challenges', () => {
  assert.equal(STAGES.length, 4);
  assert.ok(STAGES[0].targetDistance > 0);
  assert.ok(STAGES[2].targetDistance > STAGES[0].targetDistance);
  assert.equal(STAGES[3].targetDistance, 0, 'Stage 4 should be Endless mode');
});
