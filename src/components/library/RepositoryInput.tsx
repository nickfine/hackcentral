/**
 * RepositoryInput — URL input for GitHub, GitLab, Bitbucket repository links.
 * Used in Submit Hack form. Validates and auto-detects platform.
 */

import { parseRepoUrl } from './repositoryInputUtils';

export interface RepositoryInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RepositoryInput({
  value,
    onChange,
    id = 'submit-repository',
    placeholder = 'https://github.com/org/repo',
    className = '',
    disabled = false,
}: RepositoryInputProps) {
  const trimmed = value.trim();
  const isValid = !trimmed || parseRepoUrl(value) !== null;
  const showError = trimmed.length > 0 && !isValid;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        Project Repository (optional)
      </label>
      <input
        id={id}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`input w-full ${showError ? 'border-destructive' : ''}`}
        aria-invalid={showError}
        aria-describedby={showError ? `${id}-error` : undefined}
      />
      {showError && (
        <p
          id={`${id}-error`}
          className="text-sm text-destructive mt-1"
          role="alert"
        >
          Enter a valid GitHub, GitLab, or Bitbucket URL (e.g.
          https://github.com/org/repo)
        </p>
      )}
    </div>
  );
}
