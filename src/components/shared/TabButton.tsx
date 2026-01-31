/**
 * Shared tab button for use in Projects, Profile, and other tabbed UIs.
 */

interface TabButtonProps {
  children: React.ReactNode;
  active?: boolean;
}

export function TabButton({ children, active }: TabButtonProps) {
  return (
    <button
      type="button"
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
