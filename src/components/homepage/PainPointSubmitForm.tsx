import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import toast from 'react-hot-toast';

interface PainPointSubmitFormProps {
  onSuccess?: () => void;
}

export function PainPointSubmitForm({ onSuccess }: PainPointSubmitFormProps) {
  const [submitterName, setSubmitterName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [effortEstimate, setEffortEstimate] = useState<'low' | 'medium' | 'high' | ''>('');
  const [impactEstimate, setImpactEstimate] = useState<'low' | 'medium' | 'high' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const submitPainPoint = useMutation(api.painPoints.submit);

  const canSubmit = submitterName.trim().length > 0 && title.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitPainPoint({
        title: title.trim(),
        submitterName: submitterName.trim(),
        description: description.trim() || undefined,
        effortEstimate: effortEstimate || undefined,
        impactEstimate: impactEstimate || undefined,
      });
      toast.success('Pain point submitted!');
      setTitle('');
      setDescription('');
      setEffortEstimate('');
      setImpactEstimate('');
      setShowDetails(false);
      onSuccess?.();
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={submitterName}
        onChange={(e) => setSubmitterName(e.target.value)}
        placeholder="Your name *"
        className="input"
        style={{ borderRadius: '9999px' }}
        aria-label="Your name"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Describe a recurring work problem... *"
          className="input flex-1"
          style={{ borderRadius: '9999px' }}
          aria-label="Pain point title"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn btn-accent shrink-0 disabled:opacity-50"
        >
          {submitting ? '…' : 'Submit'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="self-start text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {showDetails ? '▲ Less detail' : '▼ Add more detail'}
      </button>

      {showDetails && (
        <div className="flex flex-col gap-2 pl-1">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="More context (optional)..."
            rows={3}
            className="input resize-none"
            style={{ borderRadius: '0.75rem' }}
          />
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Effort
              </label>
              <select
                value={effortEstimate}
                onChange={(e) => setEffortEstimate(e.target.value as typeof effortEstimate)}
                className="input"
                style={{ borderRadius: '9999px' }}
              >
                <option value="">–</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Impact
              </label>
              <select
                value={impactEstimate}
                onChange={(e) => setImpactEstimate(e.target.value as typeof impactEstimate)}
                className="input"
                style={{ borderRadius: '9999px' }}
              >
                <option value="">–</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
