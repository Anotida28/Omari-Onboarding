import React, { ChangeEvent } from "react";

export interface BankingDetailsFormState {
  accountName: string;
  bankName: string;
  branchName: string;
  branchCode: string;
  accountNumber: string;
  accountType: string;
  currency: string;
}

interface BankingDetailsStepProps {
  formData: BankingDetailsFormState;
  onChange: (field: keyof BankingDetailsFormState, value: string) => void;
  isAgent?: boolean;
  isPayer?: boolean;
}

const BANK_LIST = [
  "First National Bank",
  "Kreditbank",
  "National Bank of Kenya",
  "KCB Bank",
  "Equity Bank",
  "Diamond Trust Bank",
  "Standard Chartered",
  "Barclays Bank",
  "Co-operative Bank",
  "Stanbic Bank",
  "ABSA Bank",
  "Other"
];

const ACCOUNT_TYPES = ["Current", "Savings", "Money Market"];
const CURRENCIES = ["USD", "KES", "EUR", "GBP"];

export const BankingDetailsStep: React.FC<BankingDetailsStepProps> = ({
  formData,
  onChange,
  isAgent = false,
  isPayer = false
}) => {
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange(name as keyof BankingDetailsFormState, value);
  };

  return (
    <div className="form-section-card">
      <div className="form-section-card__header">
        <div className="form-section-card__title">Banking Details</div>
        <div className="form-section-card__description">
          {isPayer
            ? "Provide your settlement and payout account information."
            : isAgent
              ? "Provide your primary banking details for settlements and transactions."
              : "Provide your merchant banking account for settlement of transactions."}
        </div>
      </div>

      <div className="form-field-group">
        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Account Holder Name</label>
            <input
              name="accountName"
              value={formData.accountName}
              onChange={handleFieldChange}
              placeholder="Name of account holder"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Bank Name</label>
            <select
              name="bankName"
              value={formData.bankName}
              onChange={handleFieldChange}
              required
            >
              <option value="">Select a bank</option>
              {BANK_LIST.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label>Branch Name</label>
            <input
              name="branchName"
              value={formData.branchName}
              onChange={handleFieldChange}
              placeholder="Branch name (if applicable)"
            />
          </div>
          <div className="form-field">
            <label>Branch Code</label>
            <input
              name="branchCode"
              value={formData.branchCode}
              onChange={handleFieldChange}
              placeholder="Branch sorting code"
            />
          </div>
        </div>

        <div className="form-field-group--inline">
          <div className="form-field">
            <label className="required">Account Number</label>
            <input
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleFieldChange}
              placeholder="Bank account number"
              required
            />
          </div>
          <div className="form-field">
            <label className="required">Account Type</label>
            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleFieldChange}
              required
            >
              <option value="">Select account type</option>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label className="required">Primary Currency</label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleFieldChange}
            required
          >
            <option value="">Select currency</option>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          marginTop: "var(--space-5)",
          padding: "var(--space-4)",
          background: "rgba(59, 130, 246, 0.05)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: "var(--radius-md)"
        }}
      >
        <strong style={{ color: "var(--info-600)" }}>ℹ️ Banking Information Security</strong>
        <p style={{ margin: "var(--space-2) 0 0 0", color: "var(--text-700)" }}>
          Your banking details are encrypted and securely stored. We never share account information with third parties without your consent. Settlement transactions will be processed exclusively through this account.
        </p>
      </div>
    </div>
  );
};

export default BankingDetailsStep;
