import React, { ChangeEvent } from "react";

export interface BusinessInfoFormState {
  legalName: string;
  tradingName: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  projectedTransactions?: string;
  yearsInOperation?: string;
  productsDescription?: string;
  serviceCoverage?: string;
  registrationNumber?: string;
  taxNumber?: string;
}

interface BusinessInfoStepProps {
  formData: BusinessInfoFormState;
  onChange: (field: keyof BusinessInfoFormState, value: string) => void;
  applicationTypes?: string[];
  selectedEntityType?: string;
  onEntityTypeChange?: (value: string) => void;
  isAgent?: boolean;
  isPayer?: boolean;
}

export const BusinessInfoStep: React.FC<BusinessInfoStepProps> = ({
  formData,
  onChange,
  applicationTypes = [],
  selectedEntityType = "",
  onEntityTypeChange,
  isAgent = false,
  isPayer = false
}) => {
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange(name as keyof BusinessInfoFormState, value);
  };

  return (
    <div className="form-section-card">
      <div className="form-section-card__header">
        <div className="form-section-card__title">Business Information</div>
        <div className="form-section-card__description">
          {isAgent
            ? "Provide your agent business details, registration, and service coverage."
            : isPayer
              ? "Provide your payer/biller business details and settlement information."
              : "Provide your merchant business details, registration, and transaction profile."}
        </div>
      </div>

      <div className="form-field-group">
        {applicationTypes.length > 0 && (
          <div className="form-field-group--inline">
            <div className="form-field">
              <label>Business Category</label>
              <select
                value={selectedEntityType}
                onChange={(e) => onEntityTypeChange?.(e.target.value)}
              >
                <option value="">Select a category</option>
                {applicationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Registration Number</label>
              <input
                name="registrationNumber"
                value={formData.registrationNumber || ""}
                onChange={handleFieldChange}
                placeholder="Enter registration number"
              />
            </div>
          </div>
        )}

        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Legal Business Name</label>
            <input
              name="legalName"
              value={formData.legalName}
              onChange={handleFieldChange}
              placeholder="Enter registered business name"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Trading Name</label>
            <input
              name="tradingName"
              value={formData.tradingName}
              onChange={handleFieldChange}
              placeholder="Enter trading name"
              required
            />
          </div>
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Contact Person</label>
            <input
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleFieldChange}
              placeholder="Primary contact name"
              required
            />
          </div>
          {!isPayer && (
            <div className="form-field">
              <label>{isAgent ? "Years in Operation" : "Projected Transactions/Month"}</label>
              <input
                name={isAgent ? "yearsInOperation" : "projectedTransactions"}
                value={isAgent ? (formData.yearsInOperation || "") : (formData.projectedTransactions || "")}
                onChange={handleFieldChange}
                placeholder={isAgent ? "e.g., 5" : "e.g., 250"}
              />
            </div>
          )}
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Business Email</label>
            <input
              name="businessEmail"
              type="email"
              value={formData.businessEmail}
              onChange={handleFieldChange}
              placeholder="business@example.com"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Business Phone</label>
            <input
              name="businessPhone"
              value={formData.businessPhone}
              onChange={handleFieldChange}
              placeholder="Phone number"
              required
            />
          </div>
        </div>

        {isAgent && (
          <div className="form-field-group--inline">
            <div className="form-field">
              <label>Service Coverage Area</label>
              <input
                name="serviceCoverage"
                value={formData.serviceCoverage || ""}
                onChange={handleFieldChange}
                placeholder="e.g., National, Regional"
              />
            </div>
            <div className="form-field">
              <label>Tax Number</label>
              <input
                name="taxNumber"
                value={formData.taxNumber || ""}
                onChange={handleFieldChange}
                placeholder="Enter tax number"
              />
            </div>
          </div>
        )}

        <div className="form-field">
          <label className="required">Business Address</label>
          <textarea
            name="businessAddress"
            value={formData.businessAddress}
            onChange={handleFieldChange}
            placeholder="Full street address, city, postal code"
            required
            style={{ minHeight: "100px" }}
          />
        </div>

        <div className="form-field">
          <label>
            {isAgent ? "Service Description" : isPayer ? "Settlement Details" : "Products/Services Description"}
          </label>
          <textarea
            name="productsDescription"
            value={formData.productsDescription || ""}
            onChange={handleFieldChange}
            placeholder="Describe your business activities, products, or services"
            style={{ minHeight: "100px" }}
          />
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoStep;
