"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

function ShaderPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock, pointer }) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    materialRef.current.uniforms.uMouse.value.set(
      pointer.x * 0.5 + 0.5,
      pointer.y * 0.5 + 0.5,
    );
  });

  return (
    <mesh>
    <planeGeometry args={[4, 4, 64, 64]} />
     <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={{
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;

            float dist = distance(uv, uMouse);
            float glow = smoothstep(0.35, 0.0, dist);

            float noise = sin((uv.y + uTime * 0.05) * 80.0) * 0.02;
            float scanline = sin(uv.y * 900.0) * 0.04;

            vec3 base = vec3(0.03, 0.03, 0.05);
            vec3 accent = vec3(0.0, 1.0, 0.0);

            vec3 color = base + accent * glow * 0.15;
            color += scanline;
            color += noise;

            gl_FragColor = vec4(color, glow * 0.25);
          }
        `}
      />
    </mesh>
  );
}

export function MenuWebGLBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <ShaderPlane />
      </Canvas>
    </div>
  );
}


// "use client";

// import { Canvas, useFrame } from "@react-three/fiber";
// import { useEffect, useRef } from "react";
// import * as THREE from "three";

// function ShaderPlane({
//   mouseRef,
// }: {
//   mouseRef: React.MutableRefObject<THREE.Vector2>;
// }) {
//   const materialRef = useRef<THREE.ShaderMaterial>(null);

//   useFrame(({ clock }) => {
//     if (!materialRef.current) return;

//     materialRef.current.uniforms.uTime.value = clock.elapsedTime;
//     materialRef.current.uniforms.uMouse.value.lerp(mouseRef.current, 0.12);
//   });

//   return (
//     <mesh>
//       <planeGeometry args={[2, 2]} />

//       <shaderMaterial
//         ref={materialRef}
//         transparent
//         uniforms={{
//           uTime: { value: 0 },
//           uMouse: { value: new THREE.Vector2(0.5, 0.5) },
//         }}
//         vertexShader={`
//           varying vec2 vUv;

//           void main() {
//             vUv = uv;
//             gl_Position = vec4(position, 1.0);
//           }
//         `}
//         fragmentShader={`
//           uniform float uTime;
//           uniform vec2 uMouse;
//           varying vec2 vUv;

//           void main() {
//             vec2 uv = vUv;

//             float dist = distance(uv, uMouse);
//             float glow = smoothstep(0.32, 0.0, dist);

//             float scanline = sin(uv.y * 900.0) * 0.025;

//             vec3 accent = vec3(1.0, 0.65, 0.15);
//             vec3 color = accent * glow;
//             color += scanline;

//             gl_FragColor = vec4(color, glow * 0.45);
//           }
//         `}
//       />
//     </mesh>
//   );
// }

// export function MenuWebGLBackground() {
//   const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));

//   useEffect(() => {
//     function handlePointerMove(event: PointerEvent) {
//       mouseRef.current.set(
//         event.clientX / window.innerWidth,
//         1.0 - event.clientY / window.innerHeight,
//       );
//     }

//     window.addEventListener("pointermove", handlePointerMove);

//     return () => {
//       window.removeEventListener("pointermove", handlePointerMove);
//     };
//   }, []);

//   return (
//     <div className="pointer-events-none absolute inset-0 z-[1]">
//       <Canvas camera={{ position: [0, 0, 1] }}>
//         <ShaderPlane mouseRef={mouseRef} />
//       </Canvas>
//     </div>
//   );
// }