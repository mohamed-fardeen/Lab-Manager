import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        // Wider FOV for a grander scale
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        const group = new THREE.Group();
        scene.add(group);

        // --- ANTIGRAVITY SPHERE (Fibonacci Distribution) ---
        const count = 1500;
        const radius = 6;

        // Geometry for the dash/particles
        const geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6);
        geometry.rotateX(Math.PI / 2); // Align with Z axis for lookAt()

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

        const basePositions: THREE.Vector3[] = [];
        const directions: THREE.Vector3[] = [];

        for (let i = 0; i < count; i++) {
            // Distribute points evenly on a sphere
            const y = 1 - (i / (count - 1)) * 2;
            const r = Math.sqrt(1 - y * y);

            const theta = phi * i;

            const x = Math.cos(theta) * r;
            const z = Math.sin(theta) * r;

            const dir = new THREE.Vector3(x, y, z);
            directions.push(dir.clone());

            const pos = dir.clone().multiplyScalar(radius);
            basePositions.push(pos.clone());

            dummy.position.copy(pos);
            dummy.lookAt(new THREE.Vector3(0, 0, 0));
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);

            // Gradient from Blue (left) to Orange/Red (right)
            const mixRatio = (x + 1) / 2; // Normalize X from [-1, 1] to [0, 1]
            color.lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#f97316'), mixRatio);
            instancedMesh.setColorAt(i, color);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

        group.add(instancedMesh);

        camera.position.z = 15;

        // Interaction State
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;
        let isHovering = false;
        let hoverProgress = 0;

        const handleMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
            isHovering = true;
        };

        const handleMouseLeave = () => {
            isHovering = false;
            mouseX = 0;
            mouseY = 0;
        };

        window.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseleave', handleMouseLeave);

        const clock = new THREE.Clock();

        let frameId: number;

        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            // Mouse smoothing
            targetX += (mouseX - targetX) * 0.05;
            targetY += (mouseY - targetY) * 0.05;

            // Global Rotation (Only rotate based on hover velocity)
            group.rotation.y += 0.002 * hoverProgress;
            group.rotation.x += 0.001 * hoverProgress;

            // Parallax offset
            group.position.x = targetX * 1.5;
            group.position.y = -targetY * 1.5;

            // Hover Animation Logic (Expand and vibrate dots)
            if (isHovering && (Math.abs(mouseX) > 0.05 || Math.abs(mouseY) > 0.05)) {
                hoverProgress += (1 - hoverProgress) * 0.05; // Ease towards 1
            } else {
                hoverProgress += (0 - hoverProgress) * 0.05; // Ease back to 0 faster
            }

            for (let i = 0; i < count; i++) {
                const dir = directions[i];

                // Subtle breathing noise only when hovered
                const breathing = Math.sin(time * 1.5 + i) * 0.1 * hoverProgress;

                // On hover: particles expand radially and jitter
                const expansion = radius + breathing + (hoverProgress * 2.5);

                dummy.position.copy(dir).multiplyScalar(expansion);
                dummy.lookAt(new THREE.Vector3(0, 0, 0));

                // Add "liftoff" darting motion on hover
                const dartOffset = (Math.sin(time * 8 + i * 44) * hoverProgress * 0.6);
                dummy.translateZ(dartOffset);

                dummy.updateMatrix();
                instancedMesh.setMatrixAt(i, dummy.matrix);
            }
            instancedMesh.instanceMatrix.needsUpdate = true;

            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            document.body.removeEventListener('mouseleave', handleMouseLeave);

            if (frameId) {
                cancelAnimationFrame(frameId);
            }

            if (containerRef.current && renderer.domElement.parentNode) {
                containerRef.current.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    return <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none opacity-90" />;
}
