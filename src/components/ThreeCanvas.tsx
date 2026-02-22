import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField() {
    const ref = useRef<THREE.Points>(null!);

    // Create random points in space
    const sphere = useMemo(() => {
        const points = new Float32Array(3000);
        for (let i = 0; i < 3000; i++) {
            points[i] = (Math.random() - 0.5) * 10;
        }
        return points;
    }, []);

    useFrame((state, delta) => {
        ref.current.rotation.x -= delta / 10;
        ref.current.rotation.y -= delta / 15;
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color="#3b82f6"
                    size={0.02}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
        </group>
    );
}

function DataCore() {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state, delta) => {
        meshRef.current.rotation.y += delta * 0.5;
        meshRef.current.rotation.z += delta * 0.2;
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <mesh ref={meshRef}>
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                    color="#3b82f6"
                    wireframe
                    transparent
                    opacity={0.3}
                />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.5, 0.02, 16, 100]} />
                <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={2} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[1.8, 0.01, 16, 100]} />
                <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
            </mesh>
        </Float>
    );
}

export default function ThreeCanvas() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
            <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <ParticleField />
                <DataCore />
            </Canvas>
        </div>
    );
}
