import { useMemo, useRef, useEffect } from 'react';
import { ScheduleEventType } from '../types';
import { SCHEDULE_EVENT_DEFINITIONS, getEventsByCategory } from '../data/scheduleEvents';

interface EventSelectionPanelProps {
  selectedEvents: ScheduleEventType[];
  onChange: (selected: ScheduleEventType[]) => void;
}

export function EventSelectionPanel({ selectedEvents, onChange }: EventSelectionPanelProps) {
  const categories = useMemo(() => {
    return [
      { id: 'pre-event', label: 'Pre-Event', color: 'blue' },
      { id: 'core', label: 'Core Event', color: 'green' },
      { id: 'activities', label: 'Activities', color: 'purple' },
      { id: 'closing', label: 'Closing', color: 'orange' },
    ];
  }, []);

  const toggleEvent = (eventId: ScheduleEventType) => {
    if (selectedEvents.includes(eventId)) {
      onChange(selectedEvents.filter(id => id !== eventId));
    } else {
      onChange([...selectedEvents, eventId]);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const categoryEvents = getEventsByCategory(categoryId).map(e => e.id);
    const allSelected = categoryEvents.every(id => selectedEvents.includes(id));

    if (allSelected) {
      // Deselect all in category
      onChange(selectedEvents.filter(id => !categoryEvents.includes(id)));
    } else {
      // Select all in category
      const newSelected = [...selectedEvents];
      categoryEvents.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      onChange(newSelected);
    }
  };

  return (
    <div className="event-selection-panel">
      {categories.map(category => {
        const events = getEventsByCategory(category.id);
        const categoryEvents = events.map(e => e.id);
        const allSelected = categoryEvents.every(id => selectedEvents.includes(id));
        const someSelected = categoryEvents.some(id => selectedEvents.includes(id));

        return (
          <div key={category.id} className={`event-category category-${category.color}`}>
            <div className="category-header">
              <CategoryToggle
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={() => toggleCategory(category.id)}
                label={category.label}
              />
            </div>

            <div className="category-events">
              {events.map(event => (
                <label key={event.id} className="event-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                  />
                  <span className="event-icon">{event.icon}</span>
                  <div className="event-info">
                    <span className="event-label">{event.label}</span>
                    <span className="event-description">{event.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CategoryToggleProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}

function CategoryToggle({ checked, indeterminate, onChange, label }: CategoryToggleProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className="category-toggle">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="category-label">{label}</span>
    </label>
  );
}
