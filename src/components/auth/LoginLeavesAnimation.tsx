'use client';

import { useEffect, useRef } from 'react';
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';

const LEAF_COUNT = 60;
const LEAF_COLORS = [0x2d5a27, 0x4a7c44, 0x8fb339, 0xd4e09b];

type LeafMesh = Mesh<PlaneGeometry, MeshBasicMaterial> & {
  userData: {
    velocity: Vector3;
    rotationSpeed: Vector3;
  };
};

export function LoginLeavesAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const geometry = new PlaneGeometry(0.22, 0.3);
    const leaves: LeafMesh[] = [];

    for (let i = 0; i < LEAF_COUNT; i += 1) {
      const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
      const material = new MeshBasicMaterial({
        color,
        side: DoubleSide,
        transparent: true,
        opacity: 0.85,
      });

      const leaf = new Mesh(geometry, material) as LeafMesh;
      leaf.position.set((Math.random() - 1.2) * 6, Math.random() * 8 - 2, (Math.random() - 0.5) * 2);
      leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      leaf.userData = {
        velocity: new Vector3(
          Math.random() * 0.02 + 0.01,
          -(Math.random() * 0.03 + 0.01),
          (Math.random() - 0.5) * 0.01
        ),
        rotationSpeed: new Vector3(Math.random() * 0.05, Math.random() * 0.05, Math.random() * 0.05),
      };

      scene.add(leaf);
      leaves.push(leaf);
    }

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      if (width < 2 || height < 2) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      leaves.forEach((leaf) => {
        leaf.position.add(leaf.userData.velocity);
        leaf.rotation.x += leaf.userData.rotationSpeed.x;
        leaf.rotation.y += leaf.userData.rotationSpeed.y;
        leaf.rotation.z += leaf.userData.rotationSpeed.z;

        if (leaf.position.y < -5) {
          leaf.position.y = 5;
          leaf.position.x = (Math.random() - 1.2) * 6;
        }
        if (leaf.position.x > 5) {
          leaf.position.x = -5;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      leaves.forEach((leaf) => {
        leaf.material.dispose();
      });
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full bg-transparent"
      aria-hidden
    />
  );
}
