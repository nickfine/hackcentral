import type { DemoExampleItem } from '../../demo/examples';

interface DemoStateProps {
  title: string;
  description?: string;
  items: DemoExampleItem[];
  className?: string;
  compact?: boolean;
}

export function DemoState({
  title,
  description,
  items,
  className = '',
  compact = false,
}: DemoStateProps): JSX.Element {
  return (
    <section className={`demo-state${compact ? ' demo-state-compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="demo-state-head">
        <span className="demo-state-kicker">Demo examples</span>
        <h3>{title}</h3>
        {description ? <p className="demo-state-description">{description}</p> : null}
      </div>
      <div className="demo-state-list">
        {items.map((item) => (
          <article key={`${item.title}-${item.meta ?? item.description}`} className="demo-state-item">
            {item.eyebrow ? <span className="demo-state-item-kicker">{item.eyebrow}</span> : null}
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            {item.meta ? <small>{item.meta}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
