"use client";

import React, { useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { useScroll, MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { DissolveMuseumOverlay } from "./dissolve-museum-overlay";

const coverVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Front Layer Shader — Authentic Painting Dissolve:
 * Preserves the rich, authentic colors and brushwork of Jan van der Heyden's oil painting.
 * Uses organic continuous FBM noise along the dissolve perimeter with a delicate, warm
 * golden-amber luminous dissipation aura, avoiding harsh digital Sobel wireframe lines.
 */
const coverFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform vec2 uCenter;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.05;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    // 1. Precise cover-fit aspect ratio calculation
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );

    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 texColor = texture2D(uTexture, uv);

    // 2. Continuous organic dissolve perimeter
    vec2 centeredUv = vUv - uCenter;
    float aspect = uResolution.x / uResolution.y;
    centeredUv.x *= aspect;
    float dist = length(centeredUv);

    // Organic continuous parchment dissipation
    float organicNoise = fbm(centeredUv * 3.4 + vec2(0.0, uTime * 0.03)) * 0.20;
    float noisyDist = dist + organicNoise;

    float maxDist = length(vec2(aspect * 0.5, 0.5));
    float normalizedDist = noisyDist / maxDist;

    // Dissolve threshold expands outwards with scroll
    float threshold = uDissolve * 1.38;
    float edgeWidth = 0.045;

    // Smooth edge alpha
    float alpha = smoothstep(threshold - edgeWidth, threshold + edgeWidth, normalizedDist);

    // 3. Delicate museum-grade warm luminous dissipation at the tear wavefront
    float edgeDist = abs(normalizedDist - threshold);
    float edgeAura = smoothstep(0.07, 0.0, edgeDist) * (1.0 - smoothstep(0.85, 1.0, uDissolve));
    vec3 warmAura = vec3(0.96, 0.90, 0.78) * edgeAura * 0.32;

    vec3 finalColor = texColor.rgb + warmAura;

    gl_FragColor = vec4(finalColor, alpha * texColor.a);
  }
`;

/**
 * Back Layer Shader — The Archive Emergence:
 * Preserves the genuine watercolor & gouache pigments of Edward Lamson Henry's 1900 painting.
 * Renders cleanly underneath the dissolving front layer with zero artificial wireframes.
 */
const coverFragmentShaderReverse = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );

    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    vec4 texColor = texture2D(uTexture, uv);

    // Gentle luminous clarity as the scene comes into focus
    float illumination = 0.90 + 0.10 * smoothstep(0.0, 0.75, uProgress);
    vec3 finalColor = texColor.rgb * illumination;

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

interface SceneProps {
  imageFront: string;
  imageBack: string;
  scrollYProgress: MotionValue<number>;
}

const Scene = ({ imageFront, imageBack, scrollYProgress }: SceneProps) => {
  const [texture1, texture2] = useTexture([imageFront, imageBack]);
  const material1Ref = useRef<THREE.ShaderMaterial>(null);
  const material2Ref = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", () => invalidate());
    return () => unsubscribe();
  }, [invalidate, scrollYProgress]);

  const uniforms1 = useMemo(
    () => ({
      uTexture: { value: texture1 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uImageResolution: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: new THREE.Vector2((texture1.image as any)?.width || 1600, (texture1.image as any)?.height || 1112),
      },
      uDissolve: { value: 0.0 },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0.0 },
    }),
    [texture1, size]
  );

  const uniforms2 = useMemo(
    () => ({
      uTexture: { value: texture2 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uImageResolution: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: new THREE.Vector2((texture2.image as any)?.width || 1600, (texture2.image as any)?.height || 1112),
      },
      uProgress: { value: 0.0 },
    }),
    [texture2, size]
  );

  useFrame((state) => {
    const timeInSeconds = state.clock.getElapsedTime();
    const progress = scrollYProgress.get();

    if (material1Ref.current) {
      material1Ref.current.uniforms.uTime.value = timeInSeconds;
      material1Ref.current.uniforms.uResolution.value.set(size.width, size.height);
      material1Ref.current.uniforms.uDissolve.value = progress;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img1 = texture1.image as any;
      if (img1?.width && img1?.height) {
        material1Ref.current.uniforms.uImageResolution.value.set(img1.width, img1.height);
      }
    }

    if (material2Ref.current) {
      material2Ref.current.uniforms.uResolution.value.set(size.width, size.height);
      material2Ref.current.uniforms.uProgress.value = progress;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img2 = texture2.image as any;
      if (img2?.width && img2?.height) {
        material2Ref.current.uniforms.uImageResolution.value.set(img2.width, img2.height);
      }
    }
  });

  return (
    <>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={material2Ref}
          vertexShader={coverVertexShader}
          fragmentShader={coverFragmentShaderReverse}
          uniforms={uniforms2}
          transparent={true}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={material1Ref}
          vertexShader={coverVertexShader}
          fragmentShader={coverFragmentShader}
          uniforms={uniforms1}
          transparent={true}
        />
      </mesh>
    </>
  );
};

export interface ScrollDissolveRevealProps {
  imageFront: string;
  imageBack: string;
  frontAlt?: string;
  backAlt?: string;
  className?: string;
  containerClassName?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  showMuseumOverlay?: boolean;
  children?:
    | React.ReactNode
    | ((props: { scrollYProgress: MotionValue<number> }) => React.ReactNode);
}

function subscribeNoop() {
  return () => {};
}

function checkWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testCanvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScrollDissolveReveal({
  imageFront,
  imageBack,
  frontAlt = "Johann Hamza, The Library — a scholar reading in a book-lined study.",
  className,
  containerClassName,
  scrollContainerRef,
  showMuseumOverlay = true,
  children,
}: ScrollDissolveRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const hasWebGL = useSyncExternalStore(subscribeNoop, checkWebGL, () => false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  // Preload textures when mounted to avoid loading flickers
  useEffect(() => {
    if (isMounted && hasWebGL) {
      try {
        useTexture.preload(imageFront);
        useTexture.preload(imageBack);
      } catch {
        // Safe ignore preload failure
      }
    }
  }, [isMounted, hasWebGL, imageFront, imageBack]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
    ...(scrollContainerRef && { container: scrollContainerRef }),
  });

  return (
    <div
      ref={containerRef}
      className={cn("relative h-[240vh] w-full", containerClassName)}
    >
      <div className={cn("sticky top-0 h-screen w-full overflow-hidden", className)}>
        {isMounted && hasWebGL && !prefersReducedMotion ? (
          <Canvas
            dpr={1}
            frameloop="demand"
            gl={{ antialias: false, alpha: false }}
          >
            <OrthographicCamera
              makeDefault
              manual
              left={-1}
              right={1}
              top={1}
              bottom={-1}
              near={0.1}
              far={10}
              position={[0, 0, 1]}
            />
            <React.Suspense fallback={null}>
              <Scene
                imageFront={imageFront}
                imageBack={imageBack}
                scrollYProgress={scrollYProgress}
              />
            </React.Suspense>
          </Canvas>
        ) : (
          <div className="relative w-full h-full bg-[#121110]">
            {/* Fallback for SSR or non-WebGL/reduced-motion environments */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageFront}
              alt={frontAlt}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}
        {showMuseumOverlay && !children && (
          <DissolveMuseumOverlay scrollYProgress={scrollYProgress} />
        )}
        {typeof children === "function" ? children({ scrollYProgress }) : children}
      </div>
    </div>
  );
}
