import { motion } from 'framer-motion';

interface MicroStoryTooltipProps {
  content: string;
}

export function MicroStoryTooltip({ content }: MicroStoryTooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-lg border border-border bg-card p-3 text-xs shadow-lg"
    >
      <p className="text-muted-foreground">{content}</p>
      <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 border-b border-r border-border bg-card" />
    </motion.div>
  );
}
