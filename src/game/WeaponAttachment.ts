import * as THREE from 'three';

export interface WeaponAttachmentConfig {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number; // In degrees (-180 to 180)
    y: number; // In degrees (-180 to 180)
    z: number; // In degrees (-180 to 180)
  };
  scale: number;
}

export const DEFAULT_WEAPON_ATTACHMENT: WeaponAttachmentConfig = {
  // Calibrated so barrel points forward along forearm/sightline,
  // grip rests naturally inside palm, trigger aligns with index finger
  position: { x: 0.015, y: -0.065, z: 0.025 },
  rotation: { x: 90, y: 180, z: 0 },
  scale: 1.0,
};

export const WEAPON_ATTACHMENT_PRESETS: Record<string, { label: string; config: WeaponAttachmentConfig }> = {
  pistol: {
    label: 'Standard Pistol Grip',
    config: {
      position: { x: 0.015, y: -0.065, z: 0.025 },
      rotation: { x: 90, y: 180, z: 0 },
      scale: 1.0,
    },
  },
  rifle: {
    label: 'Tactical Rifle Grip',
    config: {
      position: { x: 0.012, y: -0.075, z: 0.04 },
      rotation: { x: 90, y: 180, z: 0 },
      scale: 1.0,
    },
  },
  smg: {
    label: 'Compact SMG Grip',
    config: {
      position: { x: 0.015, y: -0.06, z: 0.02 },
      rotation: { x: 90, y: 180, z: 0 },
      scale: 1.0,
    },
  },
  shotgun: {
    label: 'Heavy Shotgun Grip',
    config: {
      position: { x: 0.015, y: -0.07, z: 0.035 },
      rotation: { x: 90, y: 180, z: 0 },
      scale: 1.0,
    },
  },
  sniper: {
    label: 'Sniper Chassis Grip',
    config: {
      position: { x: 0.015, y: -0.08, z: 0.045 },
      rotation: { x: 90, y: 180, z: 0 },
      scale: 1.0,
    },
  },
};

const STORAGE_KEY = 'cyberpunk_weapon_attachment_config';

/**
 * Loads weapon socket attachment config from localStorage, falling back to defaults
 */
export function loadWeaponAttachmentConfig(): WeaponAttachmentConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        parsed.position &&
        typeof parsed.position.x === 'number' &&
        parsed.rotation &&
        typeof parsed.rotation.x === 'number' &&
        typeof parsed.scale === 'number'
      ) {
        return {
          position: {
            x: Number(parsed.position.x),
            y: Number(parsed.position.y),
            z: Number(parsed.position.z),
          },
          rotation: {
            x: Number(parsed.rotation.x),
            y: Number(parsed.rotation.y),
            z: Number(parsed.rotation.z),
          },
          scale: Number(parsed.scale) || 1.0,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read weapon attachment from localStorage, using default:', err);
  }
  return { ...DEFAULT_WEAPON_ATTACHMENT };
}

/**
 * Persists weapon socket attachment config to localStorage
 */
export function saveWeaponAttachmentConfig(config: WeaponAttachmentConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to save weapon attachment to localStorage:', err);
  }
}

/**
 * Applies attachment configuration directly to a Three.js socket group
 */
export function applySocketTransform(socket: THREE.Object3D, config: WeaponAttachmentConfig): void {
  socket.position.set(config.position.x, config.position.y, config.position.z);
  socket.rotation.set(
    (config.rotation.x * Math.PI) / 180,
    (config.rotation.y * Math.PI) / 180,
    (config.rotation.z * Math.PI) / 180
  );
  socket.scale.set(config.scale, config.scale, config.scale);
  socket.updateMatrixWorld(true);
}
