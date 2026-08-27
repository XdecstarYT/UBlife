import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { QUALITY_CONTACT_SHADOW_RESOLUTION, QUALITY_ENV_RESOLUTION, useQualityStore } from '../game/quality';

interface SceneEffectsProps {
  contactShadowScale?: number;
  contactShadowOpacity?: number;
  contactShadowFar?: number;
}

/**
 * Shared image-based lighting + grounding shadows + light post-processing,
 * dropped into both the city and store-interior scenes. A drei
 * PerformanceMonitor nudges the shared quality tier up or down to hold
 * roughly 50-60fps — the ceiling this game targets on phones.
 */
export function SceneEffects({
  contactShadowScale = 24,
  contactShadowOpacity = 0.45,
  contactShadowFar = 6,
}: SceneEffectsProps) {
  const tier = useQualityStore((s) => s.tier);
  const bump = useQualityStore((s) => s.bump);

  return (
    <>
      <PerformanceMonitor bounds={() => [50, 58]} flipflops={3} onIncline={() => bump(1)} onDecline={() => bump(-1)} />

      <Environment resolution={QUALITY_ENV_RESOLUTION[tier]}>
        <Lightformer intensity={2.4} color="#fff3dc" position={[10, 12, 6]} scale={[8, 8, 1]} />
        <Lightformer intensity={0.7} color="#bcdcec" rotation-x={Math.PI / 2} position={[0, 10, 0]} scale={[30, 30, 1]} />
        <Lightformer intensity={0.5} color="#dff0ff" position={[-10, 4, -6]} scale={[10, 4, 1]} />
      </Environment>

      {tier !== 'low' && (
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={contactShadowOpacity}
          scale={contactShadowScale}
          blur={2.4}
          far={contactShadowFar}
          resolution={QUALITY_CONTACT_SHADOW_RESOLUTION[tier]}
        />
      )}

      {tier === 'high' && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.75} luminanceSmoothing={0.2} />
          <Vignette eskil={false} offset={0.15} darkness={0.5} />
        </EffectComposer>
      )}
    </>
  );
}
