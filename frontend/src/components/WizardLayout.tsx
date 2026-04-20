import React, { ReactNode, useMemo } from "react";
import Stepper, { StepperStep } from "./Stepper";

interface WizardStep {
  id: string;
  label: string;
  content: ReactNode;
  isValid?: boolean;
  onSave?: () => Promise<void>;
}

interface WizardLayoutProps {
  steps: WizardStep[];
  currentStepIndex: number;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onSaveDraft?: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  isLoading?: boolean;
  canSubmit?: boolean;
  showSubmitButton?: boolean;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  steps,
  currentStepIndex,
  onNextStep,
  onPreviousStep,
  onSaveDraft,
  onSubmit,
  isLoading = false,
  canSubmit = true,
  showSubmitButton = false
}) => {
  const stepperSteps = useMemo<StepperStep[]>(
    () =>
      steps.map((step, index) => ({
        id: step.id,
        label: step.label,
        number: index + 1
      })),
    [steps]
  );

  const currentStep = steps[currentStepIndex];
  const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100);
  const isLastStep = currentStepIndex === steps.length - 1;
  const canGoNext =
    currentStep.isValid !== false && !isLoading && currentStepIndex < steps.length - 1;
  const canGoPrevious = currentStepIndex > 0 && !isLoading;

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <div className="wizard-header__panel">
          <div className="wizard-header__copy">
            <p className="wizard-header__eyebrow">Application flow</p>
            <h2 className="wizard-header__title">Complete your application in order</h2>
            <p className="wizard-header__description">
              Save progress as you go. The current step stays highlighted and completed steps stay
              marked for quick review.
            </p>
          </div>

          <div className="wizard-progress">
            <div className="wizard-progress__meta">
              <span className="wizard-progress__label">Progress</span>
              <strong>{progress}%</strong>
            </div>
            <div className="wizard-progress-bar" aria-hidden="true">
              <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="wizard-progress__step-count">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
        </div>

        <Stepper steps={stepperSteps} currentStep={currentStepIndex + 1} />
      </div>

      <div className="wizard-content">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`wizard-step ${index === currentStepIndex ? "wizard-step--active" : ""}`}
          >
            <div className="wizard-step-title">{step.label}</div>
            {step.content}
          </div>
        ))}
      </div>

      <div className={`wizard-actions ${isLastStep ? "wizard-actions--end" : ""}`}>
        {!isLastStep && (
          <button
            className="btn btn--ghost"
            onClick={onPreviousStep}
            disabled={!canGoPrevious}
            type="button"
          >
            Back
          </button>
        )}

        <div className="wizard-actions__group">
          <button
            className="btn btn--secondary"
            disabled={isLoading || !onSaveDraft}
            onClick={onSaveDraft}
            type="button"
          >
            Save draft
          </button>

          {!showSubmitButton && (
            <button
              className="btn btn--primary"
              onClick={onNextStep}
              disabled={!canGoNext}
              type="button"
            >
              {isLoading ? "Saving..." : "Next"}
            </button>
          )}

          {showSubmitButton && (
            <button
              className="btn btn--primary"
              onClick={onSubmit}
              disabled={!canSubmit || isLoading}
              type="button"
            >
              {isLoading ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardLayout;
