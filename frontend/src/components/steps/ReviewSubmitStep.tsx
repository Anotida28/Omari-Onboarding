import React, { ChangeEvent } from "react";

export interface DeclarationFormState {
  signerName: string;
  signerTitle: string;
  acceptedTerms: boolean;
  certifiedInformation: boolean;
  authorizedToAct: boolean;
}

interface ReviewSubmitStepProps {
  formData: DeclarationFormState;
  onChange: (field: keyof DeclarationFormState, value: string | boolean) => void;
  applicationSummary?: {
    applicationType: string;
    organizationName: string;
    sectionsCompleted: number;
    totalSections: number;
    status: string;
  };
  documentsCount?: number;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isAgent?: boolean;
  isPayer?: boolean;
}

export const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({
  formData,
  onChange,
  applicationSummary,
  documentsCount = 0,
  onSubmit,
  isSubmitting = false,
  isAgent = false,
  isPayer = false
}) => {
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onChange(
      name as keyof DeclarationFormState,
      type === "checkbox" ? checked : value
    );
  };

  const allRequiredChecked =
    formData.acceptedTerms &&
    formData.certifiedInformation &&
    formData.authorizedToAct;

  return (
    <div className="form-field-group">
      {/* Application Summary */}
      {applicationSummary && (
        <div className="status-hero" style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <h2 style={{ margin: "0 0 var(--space-2) 0" }}>
              {applicationSummary.applicationType}
            </h2>
            <p style={{ margin: 0, color: "var(--text-700)" }}>
              {applicationSummary.organizationName}
            </p>
          </div>

          <div className="status-hero-meta">
            <div className="status-meta-item">
              <div className="status-meta-label">Progress</div>
              <div className="status-meta-value">
                {applicationSummary.sectionsCompleted}/{applicationSummary.totalSections} sections
              </div>
            </div>
            <div className="status-meta-item">
              <div className="status-meta-label">Documents</div>
              <div className="status-meta-value">{documentsCount} uploaded</div>
            </div>
            <div className="status-meta-item">
              <div className="status-meta-label">Status</div>
              <div className="status-meta-value">
                {applicationSummary.status === "draft" ? "Ready to Submit" : applicationSummary.status}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signer Information */}
      <div className="form-section-card">
        <div className="form-section-card__header">
          <div className="form-section-card__title">Declaration & Submission</div>
          <div className="form-section-card__description">
            Certify the accuracy of information and authorize submission of your application.
          </div>
        </div>

        <div className="form-field-group">
          <div className="form-field-group--inline">
            <div className="form-field">
              <label className="required">Authorized Signer Name</label>
              <input
                name="signerName"
                type="text"
                value={formData.signerName}
                onChange={handleFieldChange}
                placeholder="Full name of authorized person"
                required
              />
            </div>
            <div className="form-field">
              <label className="required">Title/Designation</label>
              <input
                name="signerTitle"
                type="text"
                value={formData.signerTitle}
                onChange={handleFieldChange}
                placeholder="e.g., Director, CEO, Manager"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Declarations & Agreements */}
      <div className="form-section-card">
        <div className="form-section-card__header">
          <div className="form-section-card__title">Required Declarations</div>
        </div>

        <div className="form-field-group">
          <label
            style={{
              display: "flex",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              background: "var(--surface-soft)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              alignItems: "flex-start"
            }}
          >
            <input
              name="certifiedInformation"
              type="checkbox"
              checked={formData.certifiedInformation}
              onChange={handleFieldChange}
              style={{ marginTop: "4px", width: "20px", height: "20px" }}
              required
            />
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-900)" }}>
                I certify that the information provided is accurate
              </div>
              <p style={{ margin: "var(--space-1) 0 0 0", color: "var(--text-700)", fontSize: "0.875rem" }}>
                I confirm that all information in this application is true, accurate, and complete to the best of my knowledge and belief.
              </p>
            </div>
          </label>

          <label
            style={{
              display: "flex",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              background: "var(--surface-soft)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              alignItems: "flex-start"
            }}
          >
            <input
              name="authorizedToAct"
              type="checkbox"
              checked={formData.authorizedToAct}
              onChange={handleFieldChange}
              style={{ marginTop: "4px", width: "20px", height: "20px" }}
              required
            />
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-900)" }}>
                I am authorized to submit this application
              </div>
              <p style={{ margin: "var(--space-1) 0 0 0", color: "var(--text-700)", fontSize: "0.875rem" }}>
                I have the authority to act on behalf of {isAgent ? "this agent" : isPayer ? "this payer/biller" : "this merchant"} and to bind the organization to this agreement.
              </p>
            </div>
          </label>

          <label
            style={{
              display: "flex",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              background: "var(--surface-soft)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              alignItems: "flex-start"
            }}
          >
            <input
              name="acceptedTerms"
              type="checkbox"
              checked={formData.acceptedTerms}
              onChange={handleFieldChange}
              style={{ marginTop: "4px", width: "20px", height: "20px" }}
              required
            />
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-900)" }}>
                I accept the Terms & Conditions
              </div>
              <p style={{ margin: "var(--space-1) 0 0 0", color: "var(--text-700)", fontSize: "0.875rem" }}>
                I have read and agree to the Omari Onboarding Terms & Conditions and Privacy Policy. I understand the requirements and obligations outlined.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Important Notes */}
      <div
        style={{
          padding: "var(--space-4)",
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "var(--radius-md)"
        }}
      >
        <strong style={{ color: "var(--warning-600)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          ⚠️ Before You Submit
        </strong>
        <ul
          style={{
            margin: "var(--space-3) 0 0 0",
            paddingLeft: "var(--space-5)",
            color: "var(--text-700)",
            fontSize: "0.875rem"
          }}
        >
          <li>Ensure all required fields are filled and all documents are uploaded</li>
          <li>Review all information for accuracy and completeness</li>
          <li>Once submitted, you cannot edit the application until reviewed</li>
          <li>Our review process typically takes 5-7 business days</li>
          <li>We will contact you at the email and phone provided if we need clarification</li>
        </ul>
      </div>

      {/* Submission Button */}
      <button
        type="button"
        className="btn btn--primary btn--lg"
        onClick={onSubmit}
        disabled={!allRequiredChecked || isSubmitting || !formData.signerName || !formData.signerTitle}
        style={{
          width: "100%",
          marginTop: "var(--space-6)"
        }}
      >
        {isSubmitting ? "Submitting Application..." : "Submit Application for Review"}
      </button>

      {!allRequiredChecked && (
        <p
          style={{
            textAlign: "center",
            color: "var(--error-500)",
            fontSize: "0.875rem",
            marginTop: "var(--space-3)"
          }}
        >
          Please accept all declarations before submitting
        </p>
      )}
    </div>
  );
};

export default ReviewSubmitStep;
