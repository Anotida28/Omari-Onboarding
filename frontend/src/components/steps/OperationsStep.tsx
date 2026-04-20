import React, { ChangeEvent } from "react";

export interface Outlet {
  name: string;
  location: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
}

export interface OperationsFormState {
  outlets: Outlet[];
  complianceContact?: string;
  operationalDetails?: string;
  settlementMethod?: string;
  reconciliationEmail?: string;
  integrationNotes?: string;
}

interface OperationsStepProps {
  formData: OperationsFormState;
  onOutletChange?: (index: number, field: keyof Outlet, value: string) => void;
  onAddOutlet?: () => void;
  onRemoveOutlet?: (index: number) => void;
  onChange?: (field: keyof OperationsFormState, value: string) => void;
  isAgent?: boolean;
  isPayer?: boolean;
}

const OutletForm: React.FC<{
  outlet: Outlet;
  onFieldChange: (field: keyof Outlet, value: string) => void;
  index: number;
  onRemove: () => void;
}> = ({ outlet, onFieldChange, index, onRemove }) => {
  return (
    <div className="form-section-card" style={{ marginBottom: "var(--space-4)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-4)"
        }}
      >
        <h4 style={{ margin: 0 }}>Outlet {index + 1}</h4>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={onRemove}
        >
          Remove Outlet
        </button>
      </div>

      <div className="form-field-group">
        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Outlet Name</label>
            <input
              value={outlet.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="e.g., Downtown Branch"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Location/Address</label>
            <input
              value={outlet.location}
              onChange={(e) => onFieldChange("location", e.target.value)}
              placeholder="Physical location"
              required
            />
          </div>
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Contact Person</label>
            <input
              value={outlet.contactPerson}
              onChange={(e) => onFieldChange("contactPerson", e.target.value)}
              placeholder="Manager or contact name"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Phone Number</label>
            <input
              value={outlet.phoneNumber}
              onChange={(e) => onFieldChange("phoneNumber", e.target.value)}
              placeholder="Contact phone"
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label className="required">Email</label>
          <input
            type="email"
            value={outlet.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="Outlet email address"
            required
          />
        </div>
      </div>
    </div>
  );
};

export const OperationsStep: React.FC<OperationsStepProps> = ({
  formData,
  onOutletChange,
  onAddOutlet,
  onRemoveOutlet,
  onChange,
  isAgent = false,
  isPayer = false
}) => {
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange?.(name as keyof OperationsFormState, value);
  };

  if (isAgent && formData.outlets && formData.outlets.length > 0) {
    return (
      <div className="form-field-group">
        <div className="form-section-card">
          <div className="form-section-card__header">
            <div className="form-section-card__title">Agent Outlets</div>
            <div className="form-section-card__description">
              Add all service outlets and locations where transactions will occur.
            </div>
          </div>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={onAddOutlet}
            style={{ marginBottom: "var(--space-4)" }}
          >
            + Add Outlet
          </button>

          {formData.outlets.map((outlet, index) => (
            <OutletForm
              key={`outlet-${index}`}
              outlet={outlet}
              onFieldChange={(field, value) => onOutletChange?.(index, field, value)}
              index={index}
              onRemove={() => onRemoveOutlet?.(index)}
            />
          ))}
        </div>

        <div className="form-section-card">
          <div className="form-section-card__header">
            <div className="form-section-card__title">Operations Information</div>
          </div>

          <div className="form-field-group">
            <div className="form-field">
              <label>Compliance Contact</label>
              <input
                name="complianceContact"
                value={formData.complianceContact || ""}
                onChange={handleFieldChange}
                placeholder="Name of compliance officer or responsible person"
              />
            </div>

            <div className="form-field">
              <label>Operational Details</label>
              <textarea
                name="operationalDetails"
                value={formData.operationalDetails || ""}
                onChange={handleFieldChange}
                placeholder="Describe your operational model, transaction patterns, and customer base"
                style={{ minHeight: "120px" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-section-card">
      <div className="form-section-card__header">
        <div className="form-section-card__title">
          {isPayer ? "Settlement Configuration" : "Operations Information"}
        </div>
        <div className="form-section-card__description">
          {isPayer
            ? "Configure how payouts and settlements will be processed."
            : "Provide additional operational and compliance information."}
        </div>
      </div>

      <div className="form-field-group">
        {!isPayer && (
          <div className="form-field">
            <label>Compliance Contact</label>
            <input
              name="complianceContact"
              value={formData.complianceContact || ""}
              onChange={handleFieldChange}
              placeholder="Name of compliance officer or responsible person"
            />
          </div>
        )}

        {isPayer ? (
          <>
            <div className="form-field-group--inline">
              <div className="form-field">
                <label className="required">Settlement Method</label>
                <select
                  name="settlementMethod"
                  value={formData.settlementMethod || ""}
                  onChange={(e) =>
                    onChange?.(
                      "settlementMethod",
                      e.target.value
                    )
                  }
                >
                  <option value="">Select settlement method</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wallet_credit">Wallet Credit</option>
                  <option value="mixed">Mixed Settlement</option>
                </select>
              </div>
              <div className="form-field">
                <label>Reconciliation Email</label>
                <input
                  type="email"
                  name="reconciliationEmail"
                  value={formData.reconciliationEmail || ""}
                  onChange={handleFieldChange}
                  placeholder="finance@example.com"
                />
              </div>
            </div>

            <div className="form-field">
              <label>Integration Notes</label>
              <textarea
                name="integrationNotes"
                value={formData.integrationNotes || ""}
                onChange={handleFieldChange}
                placeholder="Describe your payout schedule, settlement timing, file exchange, or reconciliation requirements."
                style={{ minHeight: "120px" }}
              />
            </div>
          </>
        ) : (
          <div className="form-field">
            <label>Operational Details</label>
            <textarea
              name="operationalDetails"
              value={formData.operationalDetails || ""}
              onChange={handleFieldChange}
              placeholder="Describe your operational model, transaction patterns, and customer base"
              style={{ minHeight: "120px" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationsStep;
