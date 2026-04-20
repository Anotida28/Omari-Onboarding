import React from "react";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  isCompleted: boolean;
  isActive?: boolean;
  icon?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  return (
    <div className="timeline">
      {events.map((event) => (
        <div
          key={event.id}
          className={`timeline-item ${
            event.isCompleted ? "timeline-item--completed" : ""
          } ${event.isActive ? "timeline-item--active" : ""}`}
        >
          <div className="timeline-dot">
            {event.isCompleted ? "✓" : event.isActive ? "◉" : "○"}
          </div>
          <div className="timeline-content">
            <div className="timeline-title">{event.title}</div>
            <div className="timeline-time">{event.timestamp}</div>
            {event.description && (
              <div className="timeline-description">{event.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
