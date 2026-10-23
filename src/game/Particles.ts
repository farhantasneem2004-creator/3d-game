import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleStart: number;
  scaleEnd: number;
  color: THREE.Color;
  rotSpeed?: THREE.Vector3;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private sphereGeo: THREE.BufferGeometry;
  private starGeo: THREE.BufferGeometry;
  private ringGeo: THREE.BufferGeometry;

  constructor() {
    this.group = new THREE.Group();
    this.sphereGeo = new THREE.SphereGeometry(0.1, 6, 6);
    this.starGeo = new THREE.OctahedronGeometry(0.12);
    this.ringGeo = new THREE.RingGeometry(0.2, 0.35, 16);
  }

  public emitDust(pos: THREE.Vector3, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.0 + Math.random() * 1.5;
      const mat = new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sphereGeo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.05, (Math.random() - 0.5) * 0.2));

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 0.3 + Math.random() * 0.6, Math.sin(angle) * speed),
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        scaleStart: 0.8,
        scaleEnd: 2.0,
        color: new THREE.Color(0xeeeeee),
      });
    }
  }

  public emitCoinSparkles(pos: THREE.Vector3, count = 12) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe033,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.starGeo, mat);
      mesh.position.copy(pos);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2.5 + Math.random() * 2.0;

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed + 1.0,
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.2,
        scaleStart: 1.2,
        scaleEnd: 0.1,
        color: new THREE.Color(0xffe033),
        rotSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
      });
    }
  }

  public emitAttackSlash(pos: THREE.Vector3, forwardDir: THREE.Vector3) {
    // Crescent shockwave ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(this.ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.copy(pos).add(forwardDir.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 0.8, 0));

    this.group.add(ringMesh);
    this.particles.push({
      mesh: ringMesh,
      velocity: forwardDir.clone().multiplyScalar(4.0),
      life: 0,
      maxLife: 0.25,
      scaleStart: 1.0,
      scaleEnd: 3.5,
      color: new THREE.Color(0x38bdf8),
    });

    // Sparks
    for (let i = 0; i < 8; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const spark = new THREE.Mesh(this.sphereGeo, sparkMat);
      spark.position.copy(pos).add(forwardDir.clone().multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.8, 0));

      this.group.add(spark);
      this.particles.push({
        mesh: spark,
        velocity: new THREE.Vector3(
          forwardDir.x * 3 + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          forwardDir.z * 3 + (Math.random() - 0.5) * 2
        ),
        life: 0,
        maxLife: 0.28,
        scaleStart: 0.9,
        scaleEnd: 0.2,
        color: new THREE.Color(0x7dd3fc),
      });
    }
  }

  public emitCheckpointActivation(pos: THREE.Vector3) {
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.starGeo, mat);
      const angle = (i / 20) * Math.PI * 2;
      mesh.position.set(pos.x + Math.cos(angle) * 0.4, pos.y + 0.1, pos.z + Math.sin(angle) * 0.4);

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * 1.5, 3.5 + Math.random() * 2, Math.sin(angle) * 1.5),
        life: 0,
        maxLife: 0.7 + Math.random() * 0.3,
        scaleStart: 1.0,
        scaleEnd: 0.2,
        color: new THREE.Color(0x10b981),
      });
    }
  }

  public emitDamageSparks(pos: THREE.Vector3) {
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sphereGeo, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0));

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          2.0 + Math.random() * 2.5,
          (Math.random() - 0.5) * 4
        ),
        life: 0,
        maxLife: 0.4,
        scaleStart: 1.2,
        scaleEnd: 0.1,
        color: new THREE.Color(0xef4444),
      });
    }
  }

  public emitVictoryFireworks(pos: THREE.Vector3) {
    const colors = [0xff4444, 0x33ff66, 0x3399ff, 0xffcc00, 0xff33cc];
    for (let f = 0; f < 3; f++) {
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      const blastCenter = pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        4.0 + Math.random() * 3,
        (Math.random() - 0.5) * 4
      ));

      for (let i = 0; i < 16; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: chosenColor,
          transparent: true,
          opacity: 1.0,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(this.starGeo, mat);
        mesh.position.copy(blastCenter);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 2.0 + Math.random() * 3.5;

        this.group.add(mesh);
        this.particles.push({
          mesh,
          velocity: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed,
            Math.sin(phi) * Math.sin(theta) * speed
          ),
          life: 0,
          maxLife: 0.8 + Math.random() * 0.4,
          scaleStart: 1.5,
          scaleEnd: 0.1,
          color: new THREE.Color(chosenColor),
        });
      }
    }
  }

  public update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        if (p.mesh.material instanceof THREE.Material) {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 7.5 * dt; // gravity for particles

      // Scale & Opacity
      const progress = p.life / p.maxLife;
      const s = THREE.MathUtils.lerp(p.scaleStart, p.scaleEnd, progress);
      p.mesh.scale.setScalar(s);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 1.0 - progress;
      }

      if (p.rotSpeed) {
        p.mesh.rotation.x += p.rotSpeed.x * dt;
        p.mesh.rotation.y += p.rotSpeed.y * dt;
        p.mesh.rotation.z += p.rotSpeed.z * dt;
      }
    }
  }

  public clear() {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      if (p.mesh.material instanceof THREE.Material) {
        p.mesh.material.dispose();
      }
    }
    this.particles = [];
  }
}
