import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Library, GraduationCap, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Action {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const actions: Action[] = [
  {
    id: 'submit-asset',
    label: 'Submit your first hack',
    sublabel: 'AI-assisted form',
    icon: <Upload className="h-5 w-5" />,
    href: '/hacks?tab=completed&action=new',
    color: 'bg-teal-500',
  },
  {
    id: 'request-mentor',
    label: 'Request a 15-min mentor',
    sublabel: 'Get unstuck fast',
    icon: <GraduationCap className="h-5 w-5" />,
    href: '/people?tab=mentors',
    color: 'bg-teal-500',
  },
  {
    id: 'browse-arsenal',
    label: 'Browse Featured Hacks',
    sublabel: 'Copy top hack',
    icon: <Library className="h-5 w-5" />,
    href: '/hacks?tab=completed&arsenal=true',
    color: 'bg-teal-500',
  },
];

export function QuickActionsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-white shadow-md transition-transform duration-200 ease-out hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:bottom-8 sm:right-8 sm:h-16 sm:w-16"
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <Plus className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 left-4 z-50 w-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl sm:left-auto sm:bottom-28 sm:right-8 sm:w-80"
            role="dialog"
            aria-label="Quick actions menu"
          >
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Quick Actions
            </h3>

            <div className="space-y-2">
              {actions.map((action) => (
                <Link
                  key={action.id}
                  to={action.href}
                  onClick={() => setIsOpen(false)}
                  className="group flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white shadow-md transition-transform group-hover:scale-105`}
                  >
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.sublabel}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            aria-hidden
          />
        )}
      </AnimatePresence>
    </>
  );
}
