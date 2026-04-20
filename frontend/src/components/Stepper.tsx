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
    <div className="stepper">
      <div className="stepper-track">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <div
              key={step.id}
              className={`stepper-item ${
                isCompleted ? "stepper-item--completed" : ""
              } ${isActive ? "stepper-item--active" : ""}`}
              onClick={() => onStepClick?.(step.number)}
            >
              <div className="stepper-dot">
                {isCompleted ? "✓" : step.number}
              </div>
              <div className="stepper-label">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
