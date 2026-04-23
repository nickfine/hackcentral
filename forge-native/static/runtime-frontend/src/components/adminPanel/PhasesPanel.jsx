/**
 * PhasesPanel
 * Admin panel tab for managing event phases.
 */

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/design-system';
import { Card, Badge, Alert, Modal, Button } from '../ui';
import { VStack } from '../layout';
import { EVENT_PHASES, EVENT_PHASE_ORDER } from '../../data/constants';

/** Doc: standard card - white/gray-800, gray border, rounded-xl, shadow-sm light only */
const ADMIN_CARD_CLASS =
  'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-card)]';

function PhasesPanel({ eventPhase, onPhaseChange }) {
  const [pendingPhase, setPendingPhase] = useState(null);

  const handlePhaseClick = (phaseKey) => {
    setPendingPhase(phaseKey);
  };

  const confirmPhaseChange = () => {
    if (pendingPhase) {
      onPhaseChange?.(pendingPhase);
      setPendingPhase(null);
    }
  };

  const cancelPhaseChange = () => {
    setPendingPhase(null);
  };

  const pendingPhaseData = pendingPhase ? EVENT_PHASES[pendingPhase] : null;

  return (
    <>
      <Card padding="md" className={ADMIN_CARD_CLASS}>
      <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Event Phases</Card.Title>
      <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
        Move the event forward deliberately. Phase updates apply to all participants immediately.
      </p>
      <Alert variant="warning" className="mb-4">
        Changing the event phase affects all participants. Make sure you&apos;re ready before proceeding.
      </Alert>

      <VStack gap="3">
        {EVENT_PHASE_ORDER.map((phaseKey, index) => {
          const phase = EVENT_PHASES[phaseKey];
          const isCurrent = eventPhase === phaseKey;
          const isPast = EVENT_PHASE_ORDER.indexOf(eventPhase) > index;

          return (
            <button
              key={phaseKey}
              onClick={() => handlePhaseClick(phaseKey)}
              className={cn(
                'w-full flex items-center gap-4 p-5 rounded-lg border transition-all text-left',
                isCurrent
                  ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[var(--accent)]'
                  : isPast
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-base',
                isCurrent
                  ? 'bg-[var(--accent)] text-[var(--accent-on)]'
                  : isPast
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              )}>
                {isPast ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <p className={cn(
                  'font-bold',
                  isCurrent ? 'text-[var(--accent)]' : 'text-gray-900 dark:text-white'
                )}>
                  {phase.label}
                </p>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{phase.description}</p>
              </div>
              {isCurrent && (
                <Badge className="!bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] !text-[var(--accent)] border-0">Current</Badge>
              )}
            </button>
          );
        })}
      </VStack>
    </Card>

      {/* Phase change confirmation modal */}
      <Modal
        isOpen={!!pendingPhase}
        onClose={cancelPhaseChange}
        title="Confirm Phase Change"
        size="sm"
      >
        {pendingPhaseData && (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Move event to <span className="font-semibold text-gray-900 dark:text-white">{pendingPhaseData.label}</span>?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pendingPhaseData.description}
            </p>
            <Alert variant="warning">
              This change will apply to all participants immediately.
            </Alert>
          </div>
        )}
        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={cancelPhaseChange}
          >
            Cancel
          </Button>
          <Button
            className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            onClick={confirmPhaseChange}
          >
            Confirm Change
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PhasesPanel;
