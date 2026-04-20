import React from "react";

export interface StepperStep {
  id: string;
  label: string;
  number: number;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick
}) => {
  return (
    <div className="stepper" aria-label="Application progress">
      <div className="stepper-track">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <button
              type="button"
              key={step.id}
              className={`stepper-item ${
                isCompleted ? "stepper-item--completed" : ""
              } ${isActive ? "stepper-item--active" : ""}`}
              onClick={() => onStepClick?.(step.number)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${step.number}: ${step.label}`}
            >
              <div className="stepper-dot" aria-hidden="true">
                {isCompleted ? "✓" : step.number}
              </div>
              <div className="stepper-copy">
                <div className="stepper-kicker">
                  {isCompleted ? "Completed" : isActive ? "In Progress" : `Step ${step.number}`}
                </div>
                <div className="stepper-label">{step.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
