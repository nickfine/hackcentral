import { motion } from 'framer-motion';

interface Stage {
  name: string;
  icon: React.ReactNode;
  threshold: number;
  color: string;
  gradient: string;
}

interface MilestoneMarkerProps {
  stage: Stage;
  isActive: boolean;
  isCurrent: boolean;
  position: number;
}

export function MilestoneMarker({
  stage,
  isActive,
  isCurrent,
}: MilestoneMarkerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center gap-1 transition-opacity ${
        isActive ? 'opacity-100' : 'opacity-40'
      }`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          isCurrent
            ? 'bg-cyan-400/30 ring-2 ring-cyan-400 scale-110'
            : isActive
              ? 'bg-white/10'
              : 'bg-slate-700/50'
        }`}
      >
        <span
          className={
            isActive
              ? 'text-cyan-300'
              : 'text-slate-500'
          }
        >
          {stage.icon}
        </span>
      </div>
      <span
        className={`text-xs font-medium ${
          isCurrent ? 'text-cyan-300' : isActive ? 'text-slate-300' : 'text-slate-500'
        }`}
      >
        {stage.name}
      </span>
    </motion.div>
  );
}
