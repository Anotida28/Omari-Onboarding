import React, { ReactNode } from "react";

interface SplitPaneProps {
  leftPane: {
    header: string;
    content: ReactNode;
  };
  rightPane: {
    header: string;
    content: ReactNode;
    isSticky?: boolean;
  };
}

export const ReviewSplitPane: React.FC<SplitPaneProps> = ({
  leftPane,
  rightPane
}) => {
  return (
    <div className="split-layout">
      {/* Left Pane: Application Data */}
      <div className="split-pane">
        <div className="split-pane-header">{leftPane.header}</div>
        <div>{leftPane.content}</div>
      </div>

      {/* Right Pane: Documents, Actions, Notes */}
      <div className="split-pane">
        <div
          className={rightPane.isSticky ? "split-pane-sticky" : ""}
          style={{
            display: "grid",
            gap: "var(--space-5)"
          }}
        >
          <div>
            <div className="split-pane-header">{rightPane.header}</div>
            <div>{rightPane.content}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSplitPane;
