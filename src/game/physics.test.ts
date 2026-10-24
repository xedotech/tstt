import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialVehicleState,
  stepVehiclePhysics,
  applyCollisionImpulse,
  ROADSTER_CONSTANTS,
  VehicleInputs,
} from './physics';

const emptyInputs: VehicleInputs = {
  throttle: 0,
  brake: 0,
  steer: 0,
  thruster: false,
  handbrake: false,
  emp: false,
};

test('initial vehicle state starts at zero speed with full thruster gas', () => {
  const state = createInitialVehicleState();
  assert.equal(state.speed, 0);
  assert.equal(state.thrusterGas, 100);
  assert.equal(state.hullIntegrity, 100);
  assert.equal(state.sprint0to60, null);
});

test('applying throttle accelerates vehicle forward', () => {
  let state = createInitialVehicleState();
  const throttleInput: VehicleInputs = { ...emptyInputs, throttle: 1.0 };

  for (let i = 0; i < 20; i++) {
    state = stepVehiclePhysics(state, throttleInput, 0.05);
  }

  assert.ok(state.speed > 5, `Expected speed > 5 m/s, got ${state.speed}`);
  assert.ok(state.sprintActive, 'Sprint timer should be active during launch');
});

test('SpaceX cold-gas thruster dramatically increases acceleration over pure motors', () => {
  let stateNormal = createInitialVehicleState();
  let stateThruster = createInitialVehicleState();

  const throttleOnly: VehicleInputs = { ...emptyInputs, throttle: 1.0 };
  const throttleAndThruster: VehicleInputs = { ...emptyInputs, throttle: 1.0, thruster: true };

  for (let i = 0; i < 30; i++) {
    stateNormal = stepVehiclePhysics(stateNormal, throttleOnly, 0.05);
    stateThruster = stepVehiclePhysics(stateThruster, throttleAndThruster, 0.05);
  }

  assert.ok(
    stateThruster.speed > stateNormal.speed * 1.25,
    `Thruster speed (${stateThruster.speed}) should be significantly faster than normal (${stateNormal.speed})`
  );
  assert.ok(stateThruster.thrusterGas < 100, 'Thruster gas should be consumed');
});

test('braking force reduces vehicle speed smoothly', () => {
  let state = createInitialVehicleState();
  state.speed = 30; // ~67 mph

  const brakeInput: VehicleInputs = { ...emptyInputs, brake: 1.0 };
  for (let i = 0; i < 25; i++) {
    state = stepVehiclePhysics(state, brakeInput, 0.05);
  }

  assert.ok(state.speed < 15, `Expected speed < 15 m/s after braking, got ${state.speed}`);
});

test('handbrake cut rear grip and triggers drift state', () => {
  let state = createInitialVehicleState();
  state.speed = 25; // Good cruising speed

  const driftInput: VehicleInputs = { ...emptyInputs, steer: 0.8, handbrake: true };
  for (let i = 0; i < 10; i++) {
    state = stepVehiclePhysics(state, driftInput, 0.05);
  }

  assert.ok(state.isDrifting, 'Expected vehicle to enter drifting state with handbrake and steering');
});

test('collision impulse applies knockback and reduces hull integrity', () => {
  const state = createInitialVehicleState();
  state.speed = 20;
  applyCollisionImpulse(state, 1, 0, 2.0);

  assert.ok(state.speed < 20, 'Collision should reduce forward speed');
  assert.ok(state.hullIntegrity < 100, 'Collision should reduce hull integrity');
  assert.ok(Math.abs(state.lateralVelocity) > 0, 'Collision should impart lateral velocity');
});
