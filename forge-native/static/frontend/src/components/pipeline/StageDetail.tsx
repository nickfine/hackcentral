import type { PipelineBoardItem, PipelineStage, PipelineStageCriteria } from '../../types';
import { getInitials } from '../../utils/format';

const AVATAR_PALETTE = [
  'hsl(215, 40%, 45%)',
  'hsl(30, 20%, 50%)',
  'hsl(350, 35%, 50%)',
  'hsl(150, 30%, 45%)',
  'hsl(40, 40%, 48%)',
];

function hashName(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function avatarColor(ownerName: string): string {
  return AVATAR_PALETTE[hashName(ownerName) % AVATAR_PALETTE.length];
}

interface StageDetailProps {
  stage: PipelineStageCriteria;
  items: PipelineBoardItem[];
  stages: PipelineStageCriteria[];
  canManage: boolean;
  pipelineMovePendingProjectId: string | null;
  pipelineMoveStageByProjectId: Record<string, PipelineStage>;
  pipelineMoveNoteByProjectId: Record<string, string>;
  onPipelineMoveStageChange: (projectId: string, stage: PipelineStage) => void;
  onPipelineMoveNoteChange: (projectId: string, note: string) => void;
  onMoveItem: (item: PipelineBoardItem) => void;
}

export function StageDetail({
  stage,
  items,
  stages,
  canManage,
  pipelineMovePendingProjectId,
  pipelineMoveStageByProjectId,
  pipelineMoveNoteByProjectId,
  onPipelineMoveStageChange,
  onPipelineMoveNoteChange,
  onMoveItem,
}: StageDetailProps): JSX.Element {
  const visibleItems = items.slice(0, 3);
  const overflowCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <article className="pipeline-detail-panel" aria-label={`${stage.label} details`}>
      <header className="pipeline-detail-header">
        <div>
          <h3>{stage.label}</h3>
          <p>{stage.description}</p>
        </div>
        <span className="pipeline-detail-count">{items.length} items in stage</span>
      </header>

      <section className="pipeline-detail-section">
        <h4>Gate criteria</h4>
        <ul className="pipeline-detail-criteria-list">
          {stage.criteria.map((criterion) => (
            <li key={criterion}>
              <span className="pipeline-detail-check" aria-hidden>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="pipeline-detail-section">
        <h4>Items</h4>
        {visibleItems.length === 0 ? (
          <p className="empty-copy">No items in this stage.</p>
        ) : (
          <div className="pipeline-detail-items">
            {visibleItems.map((item) => {
              const targetOptions = stages.filter((candidate) => candidate.stage !== item.stage);
              const selectedTarget = pipelineMoveStageByProjectId[item.projectId] ?? '';
              const isPending = pipelineMovePendingProjectId === item.projectId;

              return (
                <article key={item.projectId} className="pipeline-detail-item">
                  <div className="pipeline-detail-item-main">
                    <span className="pipeline-item-avatar" style={{ backgroundColor: avatarColor(item.ownerName) }} aria-hidden>
                      {getInitials(item.ownerName)}
                    </span>
                    <div>
                      <p className="pipeline-item-title">{item.title}</p>
                      <p className="pipeline-item-meta">{item.ownerName} • {item.daysInStage} days in stage</p>
                    </div>
                  </div>
                  {canManage ? (
                    <div className="pipeline-item-move-row">
                      <label>
                        <span className="sr-only">Target stage</span>
                        <select
                          value={selectedTarget}
                          onChange={(event) => {
                            if (!event.target.value) return;
                            onPipelineMoveStageChange(item.projectId, event.target.value as PipelineStage);
                          }}
                          disabled={isPending}
                        >
                          <option value="">Select target stage</option>
                          {targetOptions.map((option) => (
                            <option key={`${item.projectId}-${option.stage}`} value={option.stage}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="sr-only">Move note</span>
                        <input
                          type="text"
                          value={pipelineMoveNoteByProjectId[item.projectId] ?? ''}
                          onChange={(event) => onPipelineMoveNoteChange(item.projectId, event.target.value)}
                          placeholder="Add a note"
                          disabled={isPending}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onMoveItem(item)}
                        disabled={isPending}
                      >
                        {isPending ? 'Moving…' : 'Move'}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {overflowCount > 0 ? <p className="pipeline-more-items">+{overflowCount} more items</p> : null}
          </div>
        )}
      </section>
    </article>
  );
}
