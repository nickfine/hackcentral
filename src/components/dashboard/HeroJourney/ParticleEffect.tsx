import { motion, useReducedMotion } from 'framer-motion';

interface ParticleEffectProps {
  progress: number;
}

export function ParticleEffect({ progress }: ParticleEffectProps) {
  const shouldReduceMotion = useReducedMotion();
  const particleCount = shouldReduceMotion
    ? 0
    : Math.min(Math.max(1, Math.floor(progress / 10)), 10);

  if (particleCount === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: `${(i / particleCount) * 100}%`,
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: '-10%',
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3 + (i % 3) * 0.5,
            repeat: Infinity,
            delay: (i % particleCount) * 0.4,
          }}
          className="absolute w-1 h-1 bg-cyan-400/50 rounded-full"
        />
      ))}
    </div>
  );
}
