import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Add subtle fog to blend distant objects into the background
        scene.fog = new THREE.FogExp2('#050505', 0.02);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        const group = new THREE.Group();
        scene.add(group);

        // --- ANTIGRAVITY GEOMETRY EFFECT ---
        // Instead of dots, we use floating abstract 3D objects that tumble weightlessly
        const shapes = [
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.TorusGeometry(0.8, 0.2, 16, 32),
            new THREE.OctahedronGeometry(1, 0),
            new THREE.TetrahedronGeometry(1, 0),
            new THREE.BoxGeometry(1.2, 1.2, 1.2)
        ];

        // Material with wireframe or subtle gloss
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x3b82f6, // Electric blue base
            metalness: 0.1,
            roughness: 0.8,
            transparent: true,
            opacity: 0.15, // Very subtle, ghostly floating shapes
            wireframe: true,
            side: THREE.DoubleSide
        });

        // We will store individual mesh data to animate them uniquely
        interface FloatingObject {
            mesh: THREE.Mesh;
            basePos: THREE.Vector3;
            rotSpeed: THREE.Vector3;
            floatSpeed: number;
            phase: number;
        }

        const floatingObjects: FloatingObject[] = [];
        const objectCount = 35; // Fewer objects, but larger and more detailed

        for (let i = 0; i < objectCount; i++) {
            const geometry = shapes[Math.floor(Math.random() * shapes.length)];
            const mesh = new THREE.Mesh(geometry, material);
            
            // Randomly position in a wide 3D space
            const x = (Math.random() - 0.5) * 40;
            const y = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 30;
            
            // Randomize scale
            const scale = 0.5 + Math.random() * 1.5;
            mesh.scale.set(scale, scale, scale);
            
            // Random initial rotation
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            mesh.position.set(x, y, z);
            group.add(mesh);

            floatingObjects.push({
                mesh,
                basePos: new THREE.Vector3(x, y, z),
                rotSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                ),
                floatSpeed: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Lighting to highlight the wireframes slightly
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0x3b82f6, 2, 50);
        pointLight.position.set(0, 0, 10);
        scene.add(pointLight);

        camera.position.z = 20;

        // Interaction State - Smooth Mouse Parallax
        let targetX = 0;
        let targetY = 0;
        let mouseX = 0;
        let mouseY = 0;

        const handleMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
        };

        const handleMouseLeave = () => {
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

            // Smooth interpolation for mouse target
            targetX += (mouseX - targetX) * 0.02;
            targetY += (mouseY - targetY) * 0.02;

            // Parallax effect on the camera
            camera.position.x += (targetX * 3 - camera.position.x) * 0.02;
            camera.position.y += (-targetY * 3 - camera.position.y) * 0.02;
            camera.lookAt(scene.position);

            // Move the point light with the mouse for dynamic reflections
            pointLight.position.x = targetX * 10;
            pointLight.position.y = -targetY * 10;

            // Antigravity tumble for each object
            floatingObjects.forEach((obj) => {
                // Continuous slow rotation (tumbling in space)
                obj.mesh.rotation.x += obj.rotSpeed.x;
                obj.mesh.rotation.y += obj.rotSpeed.y;
                obj.mesh.rotation.z += obj.rotSpeed.z;

                // Weightless floating drift (sine wave displacement)
                const floatY = Math.sin(time * obj.floatSpeed + obj.phase) * 3;
                const floatX = Math.cos(time * (obj.floatSpeed * 0.8) + obj.phase) * 2;
                const floatZ = Math.sin(time * (obj.floatSpeed * 1.2) + obj.phase) * 1.5;

                obj.mesh.position.x = obj.basePos.x + floatX;
                obj.mesh.position.y = obj.basePos.y + floatY;
                obj.mesh.position.z = obj.basePos.z + floatZ;
            });
            
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

            if (frameId) cancelAnimationFrame(frameId);
            
            if (containerRef.current && renderer.domElement.parentNode) {
                containerRef.current.removeChild(renderer.domElement);
            }
            
            // Cleanup geometries and materials
            shapes.forEach(shape => shape.dispose());
            material.dispose();
            renderer.dispose();
        };
    }, []);

    return <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen" />;
}
