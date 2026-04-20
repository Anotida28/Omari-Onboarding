import React from "react";

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  fieldPath?: string;
  isResolved?: boolean;
}

interface ActionRequiredPanelProps {
  actions: ActionItem[];
  onActionClick?: (actionId: string) => void;
}

export const ActionRequiredPanel: React.FC<ActionRequiredPanelProps> = ({
  actions,
  onActionClick
}) => {
  if (actions.length === 0) {
    return null;
  }

  const unresolvedActions = actions.filter((a) => !a.isResolved);

  if (unresolvedActions.length === 0) {
    return null;
  }

  return (
    <div className="action-required-panel">
      <h3>
        ⚠️ Action Required ({unresolvedActions.length} item
        {unresolvedActions.length !== 1 ? "s" : ""})
      </h3>
      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        {unresolvedActions.map((action) => (
          <div
            key={action.id}
            className="action-item"
            onClick={() => onActionClick?.(action.id)}
            style={{
              cursor: onActionClick ? "pointer" : "default",
              transition: "all var(--transition-base)"
            }}
            onMouseEnter={(e) => {
              if (onActionClick) {
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="action-item-title">{action.title}</div>
            <div className="action-item-description">{action.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionRequiredPanel;
