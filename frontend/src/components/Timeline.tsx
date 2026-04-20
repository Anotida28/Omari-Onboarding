import React from "react";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  isCompleted: boolean;
  isActive?: boolean;
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
          <div className="timeline-item__rail" aria-hidden="true">
            <span className="timeline-dot" />
          </div>
          <div className="timeline-content">
            <div className="timeline-time">{event.timestamp}</div>
            <div className="timeline-title">{event.title}</div>
            {event.description ? (
              <div className="timeline-description">{event.description}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
