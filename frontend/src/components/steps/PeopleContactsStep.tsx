import React, { ChangeEvent } from "react";

export interface ContactPerson {
  fullName: string;
  designation?: string;
  email: string;
  phoneNumber: string;
  residentialAddress?: string;
  nationalIdNumber?: string;
}

export interface Transactor extends ContactPerson {
  isPrimarySignatory?: boolean;
}

export interface PeopleContactsFormState {
  primaryContact: ContactPerson;
  authorizedTransactors: Transactor[];
  signatories?: Transactor[];
  directors?: Transactor[];
}

interface PeopleContactsStepProps {
  formData: PeopleContactsFormState;
  onPrimaryContactChange: (field: keyof ContactPerson, value: string) => void;
  onTransactorChange: (index: number, field: keyof Transactor, value: string) => void;
  onAddTransactor: () => void;
  onRemoveTransactor: (index: number) => void;
  onSignatoryChange?: (
    index: number,
    field: keyof Transactor,
    value: string | boolean
  ) => void;
  onAddSignatory?: () => void;
  onRemoveSignatory?: (index: number) => void;
  onDirectorChange?: (
    index: number,
    field: keyof Transactor,
    value: string | boolean
  ) => void;
  onAddDirector?: () => void;
  onRemoveDirector?: (index: number) => void;
  isAgent?: boolean;
  isPayer?: boolean;
}

const PersonForm: React.FC<{
  person: ContactPerson;
  onFieldChange: (field: keyof ContactPerson, value: string) => void;
  label: string;
}> = ({ person, onFieldChange, label }) => {
  return (
    <div className="form-section-card" style={{ marginBottom: "var(--space-4)" }}>
      <div className="form-section-card__title" style={{ marginBottom: "var(--space-4)" }}>
        {label}
      </div>

      <div className="form-field-group">
        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Full Name</label>
            <input
              value={person.fullName}
              onChange={(e) => onFieldChange("fullName", e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>
          <div className="form-field">
            <label>Designation/Title</label>
            <input
              value={person.designation || ""}
              onChange={(e) => onFieldChange("designation", e.target.value)}
              placeholder="e.g., Director, Manager"
            />
          </div>
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Email</label>
            <input
              type="email"
              value={person.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Phone Number</label>
            <input
              value={person.phoneNumber}
              onChange={(e) => onFieldChange("phoneNumber", e.target.value)}
              placeholder="Phone number"
              required
            />
          </div>
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label>National ID Number</label>
            <input
              value={person.nationalIdNumber || ""}
              onChange={(e) => onFieldChange("nationalIdNumber", e.target.value)}
              placeholder="Enter ID number"
            />
          </div>
        </div>

        <div className="form-field">
          <label>Residential Address</label>
          <textarea
            value={person.residentialAddress || ""}
            onChange={(e) => onFieldChange("residentialAddress", e.target.value)}
            placeholder="Full residential address"
            style={{ minHeight: "80px" }}
          />
        </div>
      </div>
    </div>
  );
};

export const PeopleContactsStep: React.FC<PeopleContactsStepProps> = ({
  formData,
  onPrimaryContactChange,
  onTransactorChange,
  onAddTransactor,
  onRemoveTransactor,
  onSignatoryChange,
  onAddSignatory,
  onRemoveSignatory,
  onDirectorChange,
  onAddDirector,
  onRemoveDirector,
  isAgent = false,
  isPayer = false
}) => {
  return (
    <div className="form-field-group">
      {/* Primary Contact */}
      <PersonForm
        person={formData.primaryContact}
        onFieldChange={onPrimaryContactChange}
        label="Primary Contact Person"
      />

      {/* Directors (for Agent) */}
      {isAgent && formData.directors && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-4)",
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--line)"
            }}
          >
            <h3 style={{ margin: 0 }}>Directors</h3>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onAddDirector}
            >
              + Add Director
            </button>
          </div>
          {formData.directors.map((director, index) => (
            <div key={`director-${index}`} style={{ marginBottom: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-3)"
                }}
              >
                <h4 style={{ margin: 0 }}>Director {index + 1}</h4>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => onRemoveDirector?.(index)}
                >
                  Remove
                </button>
              </div>
              <PersonForm
                person={director}
                onFieldChange={(field, value) => onDirectorChange?.(index, field, value)}
                label=""
              />
            </div>
          ))}
        </div>
      )}

      {/* Authorized Transactors */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-4)",
            paddingBottom: "var(--space-3)",
            borderBottom: "1px solid var(--line)"
          }}
        >
          <h3 style={{ margin: 0 }}>Authorized Transactors</h3>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onAddTransactor}
          >
            + Add Transactor
          </button>
        </div>
        {formData.authorizedTransactors.map((transactor, index) => (
          <div key={`transactor-${index}`} style={{ marginBottom: "var(--space-6)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-3)"
              }}
            >
              <h4 style={{ margin: 0 }}>Transactor {index + 1}</h4>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => onRemoveTransactor(index)}
              >
                Remove
              </button>
            </div>
            <PersonForm
              person={transactor}
              onFieldChange={(field, value) => onTransactorChange(index, field, value)}
              label=""
            />
          </div>
        ))}
      </div>

      {/* Signatories (for Merchant and Payer) */}
      {!isAgent && formData.signatories && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-4)",
              paddingBottom: "var(--space-3)",
              borderBottom: "1px solid var(--line)"
            }}
          >
            <h3 style={{ margin: 0 }}>Signatories</h3>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onAddSignatory}
            >
              + Add Signatory
            </button>
          </div>
          {formData.signatories.map((signatory, index) => (
            <div key={`signatory-${index}`} style={{ marginBottom: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-3)"
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 var(--space-1) 0" }}>Signatory {index + 1}</h4>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <input
                      type="checkbox"
                      checked={signatory.isPrimarySignatory || false}
                      onChange={(e) =>
                        onSignatoryChange?.(index, "isPrimarySignatory", e.target.checked)
                      }
                    />
                    <span style={{ fontSize: "0.875rem" }}>Primary Signatory</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => onRemoveSignatory?.(index)}
                >
                  Remove
                </button>
              </div>
              <PersonForm
                person={signatory}
                onFieldChange={(field, value) => onSignatoryChange?.(index, field, value)}
                label=""
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeopleContactsStep;
