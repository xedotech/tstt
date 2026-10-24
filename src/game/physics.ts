/**
 * Tesla Roadster Vehicle Dynamics & Physics Engine
 * Real physics with electric tri-motor torque, aerodynamic drag,
 * SpaceX cold-gas thruster acceleration, tire slip angle friction,
 * regenerative braking, and dynamic weight transfer.
 */

export interface VehicleInputs {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1 (hydraulic + regen)
  steer: number; // -1 (left) to 1 (right)
  thruster: boolean; // SpaceX Cold-Gas Thruster
  handbrake: boolean; // Drift initiation
  emp: boolean; // EMP Shockwave activation trigger
}

export interface VehicleState {
  // World transforms
  x: number;
  y: number;
  z: number;
  yaw: number; // Rotation around Y in radians
  pitch: number; // Forward/backward pitch from weight transfer
  roll: number; // Left/right roll from cornering

  // Velocities
  speed: number; // Forward velocity in m/s (1 m/s = ~2.237 mph = 3.6 km/h)
  lateralVelocity: number; // Side slip velocity
  yawRate: number; // Turn rate in rad/s
  steerAngle: number; // Current front wheel angle in radians

  // Systems
  thrusterGas: number; // 0 to 100 (%)
  thrusterActive: boolean;
  batteryThermal: number; // 0 to 100 (%)
  batteryCharge: number; // 0 to 100 (%)
  hullIntegrity: number; // 0 to 100 (%)
  empCharge: number; // 0 to 100 (%)
  activeAeroAngle: number; // Active spoiler tilt in radians
  isDrifting: boolean;
  slipRatio: number;

  // Performance Benchmarks
  sprintTimer: number; // Timer for 0-60 mph (0 - 26.82 m/s)
  sprint0to60: number | null; // Final recorded time in seconds
  sprintActive: boolean;
  topSpeedReached: number; // m/s
  totalDistance: number; // meters
}

export const ROADSTER_CONSTANTS = {
  MASS: 2000, // kg (curb weight with 200kWh structural pack)
  WHEELBASE: 2.75, // meters
  TRACK_WIDTH: 1.85, // meters
  DRAG_COEFF: 0.22, // Cd ultra-streamlined aero
  FRONTAL_AREA: 2.05, // m^2
  AIR_DENSITY: 1.225, // kg/m^3
  ROLLING_RESISTANCE: 0.012,
  MAX_STEER_ANGLE: 0.58, // ~33 degrees at low speed
  STEER_SPEED: 4.2, // Rad/s steering response
  PLAID_TORQUE: 10000, // Nm wheel torque combined
  MAX_FORWARD_SPEED: 115, // m/s (~257 mph / 414 km/h)
  THRUSTER_FORCE: 24000, // Newtons from SpaceX cold-gas thrusters
  THRUSTER_CONSUMPTION_RATE: 28, // % per second
  THRUSTER_RECHARGE_RATE: 6.5, // % per second when not firing
  REGEN_BRAKE_FORCE: 9500, // Newtons
  MECHANICAL_BRAKE_FORCE: 28000, // Newtons (carbon-ceramic brakes)
  EMP_RECHARGE_RATE: 12, // % per second
};

export function createInitialVehicleState(spawnX = 0, spawnZ = 0): VehicleState {
  return {
    x: spawnX,
    y: 0,
    z: spawnZ,
    yaw: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    lateralVelocity: 0,
    yawRate: 0,
    steerAngle: 0,
    thrusterGas: 100,
    thrusterActive: false,
    batteryThermal: 24, // 24 deg C ambient
    batteryCharge: 100,
    hullIntegrity: 100,
    empCharge: 100,
    activeAeroAngle: 0,
    isDrifting: false,
    slipRatio: 0,
    sprintTimer: 0,
    sprint0to60: null,
    sprintActive: false,
    topSpeedReached: 0,
    totalDistance: 0,
  };
}

/**
 * Step vehicle physics simulation by delta time (clamped dt).
 */
export function stepVehiclePhysics(
  state: VehicleState,
  input: VehicleInputs,
  dt: number
): VehicleState {
  const c = ROADSTER_CONSTANTS;
  const clampedDt = Math.min(dt, 0.05);

  // 1. Steering dynamics with speed-sensitive steering angle decay
  const speedKph = Math.abs(state.speed) * 3.6;
  const steerSpeedScale = Math.max(0.22, 1 - (speedKph / 350) * 0.75);
  const targetSteer = input.steer * c.MAX_STEER_ANGLE * steerSpeedScale;
  const steerDelta = (targetSteer - state.steerAngle) * c.STEER_SPEED * clampedDt;
  state.steerAngle += steerDelta;

  // 2. Thruster logic
  let thrusterThrust = 0;
  if (input.thruster && state.thrusterGas > 1.0) {
    state.thrusterActive = true;
    state.thrusterGas = Math.max(0, state.thrusterGas - c.THRUSTER_CONSUMPTION_RATE * clampedDt);
    thrusterThrust = c.THRUSTER_FORCE;
  } else {
    state.thrusterActive = false;
    state.thrusterGas = Math.min(100, state.thrusterGas + c.THRUSTER_RECHARGE_RATE * clampedDt);
  }

  // 3. Electric motor powertrain curve
  // Plaid motors produce instant maximum torque at low RPM with a flat power curve at top speed
  let motorForce = 0;
  if (input.throttle > 0) {
    const powerLimiter = Math.max(0.15, 1 - (state.speed / c.MAX_FORWARD_SPEED) ** 1.8);
    motorForce = input.throttle * (c.PLAID_TORQUE / 0.35) * powerLimiter;
  } else if (input.brake > 0 && state.speed < 0.5 && state.speed >= -10) {
    // Reverse gear when stopped
    motorForce = -input.brake * 4000;
  }

  // 4. Braking forces (Regen + Friction)
  let brakingForce = 0;
  if (input.brake > 0 && state.speed > 0) {
    brakingForce = input.brake * c.MECHANICAL_BRAKE_FORCE;
  } else if (input.throttle === 0 && state.speed > 1.0) {
    // Lift-off one-pedal regenerative braking
    brakingForce = c.REGEN_BRAKE_FORCE;
  }

  // 5. Aerodynamic drag & active aero airbrake
  // Drag = 0.5 * rho * v^2 * Cd * A
  const airbrakeBonus = input.brake > 0.4 && state.speed > 25 ? 1.8 : 1.0;
  const aeroDragForce =
    0.5 * c.AIR_DENSITY * state.speed * Math.abs(state.speed) * (c.DRAG_COEFF * airbrakeBonus) * c.FRONTAL_AREA;

  // Rolling resistance
  const rollingResistance = c.ROLLING_RESISTANCE * c.MASS * 9.81 * Math.sign(state.speed);

  // Net longitudinal force
  const netLongitudinalForce = motorForce + thrusterThrust - brakingForce * Math.sign(state.speed) - aeroDragForce - rollingResistance;
  const longitudinalAcc = netLongitudinalForce / c.MASS;

  // Update speed
  state.speed += longitudinalAcc * clampedDt;

  // Prevent endless slow oscillation around zero
  if (Math.abs(state.speed) < 0.05 && input.throttle === 0 && input.brake === 0) {
    state.speed = 0;
  }

  // 6. 0-60 mph (0 to 26.8224 m/s) sprint timing
  const SPEED_60_MPH = 26.8224;
  if (input.throttle > 0 && state.speed > 0.1 && !state.sprintActive && state.sprint0to60 === null) {
    state.sprintActive = true;
    state.sprintTimer = 0;
  }
  if (state.sprintActive) {
    state.sprintTimer += clampedDt;
    if (state.speed >= SPEED_60_MPH) {
      state.sprint0to60 = state.sprintTimer;
      state.sprintActive = false;
    }
  }

  // 7. Lateral physics & Drift slip angle
  // Bicycle model with tire cornering stiffness
  const corneringStiffnessFront = 65000;
  const corneringStiffnessRear = input.handbrake ? 18000 : 75000; // Handbrake cuts rear grip!

  const frontSlipAngle = state.steerAngle - Math.atan2(state.lateralVelocity + state.yawRate * (c.WHEELBASE / 2), Math.max(2.0, Math.abs(state.speed)));
  const rearSlipAngle = -Math.atan2(state.lateralVelocity - state.yawRate * (c.WHEELBASE / 2), Math.max(2.0, Math.abs(state.speed)));

  const lateralForceFront = Math.max(-14000, Math.min(14000, corneringStiffnessFront * frontSlipAngle));
  const lateralForceRear = Math.max(-14000, Math.min(14000, corneringStiffnessRear * rearSlipAngle));

  const netLateralForce = lateralForceFront + lateralForceRear;
  const lateralAcc = netLateralForce / c.MASS - state.yawRate * state.speed;

  state.lateralVelocity += lateralAcc * clampedDt;

  // Damping lateral velocity when traveling straight
  if (Math.abs(state.steerAngle) < 0.02 && !input.handbrake) {
    state.lateralVelocity *= 0.92;
  }

  // Yaw torque & rate
  const yawTorque = lateralForceFront * (c.WHEELBASE / 2) - lateralForceRear * (c.WHEELBASE / 2);
  const yawInertia = (c.MASS * (c.WHEELBASE ** 2 + c.TRACK_WIDTH ** 2)) / 12;
  const yawAcc = yawTorque / yawInertia;

  state.yawRate += yawAcc * clampedDt;
  state.yawRate *= 0.95; // Angular damping

  // Yaw angle integration
  state.yaw += state.yawRate * clampedDt;

  // Drift detection
  const slipAngleAbs = Math.abs(rearSlipAngle);
  state.slipRatio = slipAngleAbs;
  state.isDrifting = (slipAngleAbs > 0.16 || input.handbrake) && Math.abs(state.speed) > 12;

  // 8. Dynamic weight transfer (Pitch & Roll for visual chassis lean)
  const targetPitch = (-longitudinalAcc / 9.81) * 0.08; // Squat under accel, dive under braking
  const targetRoll = (state.yawRate * state.speed / 9.81) * 0.09; // Body roll into turns
  state.pitch += (targetPitch - state.pitch) * Math.min(1, 10 * clampedDt);
  state.roll += (targetRoll - state.roll) * Math.min(1, 10 * clampedDt);

  // 9. Active Aero Wing calculation
  if (input.brake > 0.5 && state.speed > 20) {
    state.activeAeroAngle += (0.65 - state.activeAeroAngle) * 8 * clampedDt; // Airbrake 37 deg
  } else if (state.speed > 35) {
    state.activeAeroAngle += (0.28 - state.activeAeroAngle) * 6 * clampedDt; // Downforce 16 deg
  } else {
    state.activeAeroAngle += (0 - state.activeAeroAngle) * 6 * clampedDt; // Retracted
  }

  // 10. Thermal & Battery Management
  // Heavy thruster and high speed generate heat; wind cooling cools it
  const heatGeneration = (Math.abs(motorForce) / 30000 + (state.thrusterActive ? 6.5 : 0)) * clampedDt;
  const aeroCooling = (Math.abs(state.speed) / 50 + 0.5) * 1.2 * clampedDt;
  state.batteryThermal = Math.max(22, Math.min(100, state.batteryThermal + heatGeneration - aeroCooling));

  // EMP countermeasure recharge
  state.empCharge = Math.min(100, state.empCharge + c.EMP_RECHARGE_RATE * clampedDt);

  // 11. World position integration (in meters)
  const cosYaw = Math.cos(state.yaw);
  const sinYaw = Math.sin(state.yaw);
  const vx = state.speed * sinYaw + state.lateralVelocity * cosYaw;
  const vz = state.speed * cosYaw - state.lateralVelocity * sinYaw;

  state.x += vx * clampedDt;
  state.z += vz * clampedDt;

  // Statistics
  const distanceMoved = Math.sqrt(vx * vx + vz * vz) * clampedDt;
  state.totalDistance += distanceMoved;
  if (state.speed > state.topSpeedReached) {
    state.topSpeedReached = state.speed;
  }

  return state;
}

/**
 * Apply collision impulse from obstacles or enemy ramming
 */
export function applyCollisionImpulse(
  state: VehicleState,
  impactVectorX: number,
  impactVectorZ: number,
  intensity: number
): void {
  // Push back speed and lateral velocity
  state.speed = Math.max(-5, state.speed - intensity * 6);
  state.lateralVelocity += impactVectorX * intensity * 8;
  state.yawRate += (Math.random() - 0.5) * intensity * 2.5;

  // Damage hull integrity
  const damage = intensity * 15;
  state.hullIntegrity = Math.max(0, state.hullIntegrity - damage);
}
