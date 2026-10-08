import { Mission, Vector3D } from '../types/game';
import { soundManager } from './SoundManager';

export class MissionManager {
  public missions: Mission[] = [];
  public activeMission: Mission | null = null;
  public completedMissionIds: Set<string> = new Set();
  public onMissionStateChange?: (mission: Mission | null, event: 'started' | 'step_completed' | 'completed' | 'failed') => void;

  constructor() {
    this.initMissions();
  }

  private initMissions() {
    this.missions = [
      {
        id: 'mission_1',
        title: 'THE FIRST RUN',
        subtitle: 'Urban Transit & Logistics',
        type: 'Delivery',
        timeLimit: 120, // 2 minutes to complete delivery run
        briefing: 'Travel to the marked location at Industrial Warehouse 07, enter the marked area to secure the supply crate, and deliver it to Solis Corporate Tower downtown before the delivery window closes.',
        reward: 500,
        currentStepIndex: 0,
        status: 'available',
        icon: 'Package',
        steps: [
          {
            id: 'm1_s1',
            description: 'Travel to marked location at Industrial Warehouse 07',
            targetPos: { x: 40, y: 0, z: 115 },
            targetRadius: 10,
            type: 'goto',
            completed: false,
          },
          {
            id: 'm1_s2',
            description: 'Enter the designated sector and secure the cargo',
            targetPos: { x: 40, y: 0, z: 115 },
            targetRadius: 4,
            type: 'collect',
            completed: false,
          },
          {
            id: 'm1_s3',
            description: 'Deliver the cargo to Solis Corporate Tower downtown',
            targetPos: { x: 120, y: 0, z: -40 },
            targetRadius: 10,
            type: 'goto',
            completed: false,
          },
        ],
      },
      {
        id: 'mission_2',
        title: 'HIGHWAY VELOCITY',
        subtitle: 'Time Trial Sprint',
        type: 'Race',
        timeLimit: 90, // 90 seconds speed trial
        briefing: 'Test the Vortex GT sport vehicle by racing through high-speed radar checkpoints along the AGAT boulevard ring before the timer expires.',
        reward: 950,
        currentStepIndex: 0,
        status: 'available',
        icon: 'Gauge',
        steps: [
          {
            id: 'm2_s1',
            description: 'Pass Checkpoint Alpha on East Boulevard',
            targetPos: { x: 80, y: 0, z: -160 },
            targetRadius: 12,
            type: 'goto',
            completed: false,
          },
          {
            id: 'm2_s2',
            description: 'Pass Checkpoint Bravo near Central Civic Park',
            targetPos: { x: -80, y: 0, z: -80 },
            targetRadius: 12,
            type: 'goto',
            completed: false,
          },
          {
            id: 'm2_s3',
            description: 'Reach Final Waypoint at AGAT Safehouse',
            targetPos: { x: -120, y: 0, z: 40 },
            targetRadius: 10,
            type: 'goto',
            completed: false,
          },
        ],
      },
      {
        id: 'mission_3',
        title: 'SYNDICATE SHOWDOWN',
        subtitle: 'Port Security Infiltration',
        type: 'Assault',
        briefing: 'Hostile syndicate operatives have barricaded the southern shipping container yard. Neutralize hostile units and secure the district.',
        reward: 1600,
        currentStepIndex: 0,
        status: 'available',
        icon: 'Crosshair',
        steps: [
          {
            id: 'm3_s1',
            description: 'Infiltrate the Southern Cargo Container Bay',
            targetPos: { x: -40, y: 0, z: 125 },
            targetRadius: 12,
            type: 'goto',
            completed: false,
          },
          {
            id: 'm3_s2',
            description: 'Neutralize the hostile syndicate operatives in the area',
            targetPos: { x: -40, y: 0, z: 125 },
            targetRadius: 20,
            type: 'defeat',
            completed: false,
          },
          {
            id: 'm3_s3',
            description: 'Retrieve the syndicate encryption terminal',
            targetPos: { x: -40, y: 0, z: 125 },
            targetRadius: 5,
            type: 'collect',
            completed: false,
          },
        ],
      },
      {
        id: 'mission_4',
        title: 'CENTRAL AGAT HEIST',
        subtitle: 'High-Stakes Infiltration',
        type: 'Heist',
        timeLimit: 150, // 2.5 minutes heist window
        briefing: 'Infiltrate Central AGAT Bank downtown, extract the digital reserve cipher, and shake off any law enforcement pursuit back to the safehouse.',
        reward: 3800,
        currentStepIndex: 0,
        status: 'available',
        icon: 'Landmark',
        steps: [
          {
            id: 'm4_s1',
            description: 'Drive to Central AGAT Bank entrance',
            targetPos: { x: 40, y: 0, z: -40 },
            targetRadius: 10,
            type: 'goto',
            completed: false,
          },
          {
            id: 'm4_s2',
            description: 'Access the main vault cipher system',
            targetPos: { x: 40, y: 0, z: -40 },
            targetRadius: 4,
            type: 'collect',
            completed: false,
          },
          {
            id: 'm4_s3',
            description: 'Lose the Police Wanted Heat and return to Safehouse',
            targetPos: { x: -120, y: 0, z: 40 },
            targetRadius: 12,
            type: 'escape_police',
            completed: false,
          },
        ],
      },
    ];
  }

  public startMission(missionId: string): boolean {
    const m = this.missions.find((x) => x.id === missionId);
    if (!m || m.status === 'completed') return false;

    // Reset steps & timers
    m.currentStepIndex = 0;
    m.steps.forEach((s) => (s.completed = false));
    m.status = 'active';
    m.elapsedTime = 0;
    if (m.timeLimit) {
      m.timeRemaining = m.timeLimit;
    } else {
      m.timeRemaining = undefined;
    }
    this.activeMission = m;

    soundManager.playUIClick();
    if (this.onMissionStateChange) {
      this.onMissionStateChange(m, 'started');
    }
    return true;
  }

  public getCurrentStep(): { mission: Mission; step: Mission['steps'][0] } | null {
    if (!this.activeMission) return null;
    const step = this.activeMission.steps[this.activeMission.currentStepIndex];
    if (!step) return null;
    return { mission: this.activeMission, step };
  }

  public update(delta: number) {
    if (!this.activeMission || this.activeMission.status !== 'active') return;

    // Increment elapsed time
    this.activeMission.elapsedTime = (this.activeMission.elapsedTime || 0) + delta;

    // Countdown if mission has a time limit
    if (this.activeMission.timeLimit !== undefined && this.activeMission.timeRemaining !== undefined) {
      this.activeMission.timeRemaining = Math.max(0, this.activeMission.timeRemaining - delta);

      // Check if time expired
      if (this.activeMission.timeRemaining <= 0) {
        this.failActiveMission('TIME EXPIRED');
      }
    }
  }

  public checkPlayerProgress(
    playerPos: Vector3D,
    wantedLevel: number,
    onReward: (amount: number) => void
  ) {
    if (!this.activeMission || this.activeMission.status !== 'active') return;
    const current = this.getCurrentStep();
    if (!current) return;

    const { mission, step } = current;

    if (step.type === 'goto' || step.type === 'collect') {
      if (step.targetPos) {
        const dx = playerPos.x - step.targetPos.x;
        const dz = playerPos.z - step.targetPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const radius = step.targetRadius || 8;

        if (dist <= radius) {
          this.advanceStep(mission, onReward);
        }
      }
    } else if (step.type === 'escape_police') {
      if (wantedLevel === 0 && step.targetPos) {
        const dx = playerPos.x - step.targetPos.x;
        const dz = playerPos.z - step.targetPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= (step.targetRadius || 10)) {
          this.advanceStep(mission, onReward);
        }
      }
    }
  }

  public advanceStep(mission: Mission, onReward: (amount: number) => void) {
    const currentStep = mission.steps[mission.currentStepIndex];
    if (currentStep) {
      currentStep.completed = true;
    }

    mission.currentStepIndex++;

    if (mission.currentStepIndex >= mission.steps.length) {
      // Mission Finished
      mission.status = 'completed';
      this.completedMissionIds.add(mission.id);
      this.activeMission = null;

      soundManager.playMissionComplete();
      onReward(mission.reward);

      if (this.onMissionStateChange) {
        this.onMissionStateChange(mission, 'completed');
      }
    } else {
      soundManager.playUIClick();
      if (this.onMissionStateChange) {
        this.onMissionStateChange(mission, 'step_completed');
      }
    }
  }

  public failActiveMission(reason: string = 'MISSION FAILED') {
    if (this.activeMission) {
      const m = this.activeMission;
      m.status = 'failed';
      this.activeMission = null;
      soundManager.playMissionFailed();
      if (this.onMissionStateChange) {
        this.onMissionStateChange(m, 'failed');
      }
    }
  }

  public cancelActiveMission() {
    if (this.activeMission) {
      this.activeMission.status = 'available';
      const m = this.activeMission;
      this.activeMission = null;
      if (this.onMissionStateChange) {
        this.onMissionStateChange(m, 'failed');
      }
    }
  }
}
