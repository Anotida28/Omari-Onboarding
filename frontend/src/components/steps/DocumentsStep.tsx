import React, { ChangeEvent } from "react";

export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  requirementCode: string;
  isMandatory: boolean;
  acceptedFormats: string[];
}

export interface UploadedDocument {
  id: string;
  requirementCode: string;
  fileName: string;
  uploadedAt: string;
  status: "pending" | "accepted" | "rejected";
  reviewerComment?: string;
}

interface DocumentsStepProps {
  requirements: DocumentRequirement[];
  uploadedDocuments?: Record<string, UploadedDocument[]>;
  selectedFiles?: Record<string, File[]>;
  onFileSelect: (requirementCode: string, files: FileList) => void;
  onFileRemove?: (requirementCode: string, fileName: string) => void;
  isMobileView?: boolean;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  requirements,
  uploadedDocuments = {},
  selectedFiles = {},
  onFileSelect,
  onFileRemove,
  isMobileView = false
}) => {
  const handleFileInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    requirementCode: string
  ) => {
    if (e.target.files) {
      onFileSelect(requirementCode, e.target.files);
    }
  };

  const getDocumentStatus = (requirementCode: string) => {
    const docs = uploadedDocuments[requirementCode] || [];

    if (docs.length === 0) {
      return null;
    }

    const hasRejected = docs.some((d) => d.status === "rejected");
    const hasAccepted = docs.some((d) => d.status === "accepted");

    if (hasRejected) {
      return "rejected";
    }

    if (hasAccepted) {
      return "accepted";
    }

    return "pending";
  };

  return (
    <div className="form-field-group">
      <div className="form-section-card">
        <div className="form-section-card__header">
          <div className="form-section-card__title">Supporting Documents</div>
          <div className="form-section-card__description">
            Upload all required documents to support your application. Ensure files are clear,
            legible, and in acceptable formats.
          </div>
        </div>

        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          {requirements.map((requirement) => {
            const docs = uploadedDocuments[requirement.requirementCode] || [];
            const newFiles = selectedFiles[requirement.requirementCode] || [];
            const status = getDocumentStatus(requirement.requirementCode);

            return (
              <div
                key={requirement.id}
                className={`document-tile ${
                  status === "accepted"
                    ? "document-tile--accepted"
                    : status === "rejected"
                      ? "document-tile--rejected"
                      : ""
                }`}
              >
                <div className="document-tile-header">
                  <div>
                    <div className="document-tile-title">
                      {requirement.name}
                      {requirement.isMandatory && (
                        <span
                          style={{
                            marginLeft: "var(--space-2)",
                            color: "var(--error-500)",
                            fontSize: "0.875rem"
                          }}
                        >
                          *
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: "var(--space-1) 0 0 0",
                        color: "var(--text-700)",
                        fontSize: "0.875rem"
                      }}
                    >
                      {requirement.description}
                    </p>
                    <p
                      style={{
                        margin: "var(--space-1) 0 0 0",
                        color: "var(--text-500)",
                        fontSize: "0.75rem"
                      }}
                    >
                      Accepted: {requirement.acceptedFormats.join(", ")}
                    </p>
                  </div>
                  {status && (
                    <span
                      className={`document-status document-status--${
                        status === "accepted"
                          ? "accepted"
                          : status === "rejected"
                            ? "rejected"
                            : "pending"
                      }`}
                    >
                      {status === "accepted"
                        ? "Accepted"
                        : status === "rejected"
                          ? "Rejected"
                          : "Pending"}
                    </span>
                  )}
                </div>

                {docs.length > 0 && (
                  <div
                    style={{
                      padding: "var(--space-3)",
                      background: "var(--surface-soft)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "var(--space-3)"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        marginBottom: "var(--space-2)"
                      }}
                    >
                      Uploaded Files ({docs.length})
                    </div>
                    <div style={{ display: "grid", gap: "var(--space-2)" }}>
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "var(--space-2)",
                            background: "var(--surface)",
                            borderRadius: "var(--radius-xs)",
                            fontSize: "0.875rem"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{doc.fileName}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-500)" }}>
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                              {doc.reviewerComment ? ` • ${doc.reviewerComment}` : ""}
                            </div>
                          </div>
                          <span className="document-status document-status--pending">
                            Stored
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newFiles.length > 0 && (
                  <div
                    style={{
                      padding: "var(--space-3)",
                      background: "rgba(16, 185, 129, 0.05)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "var(--space-3)"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        marginBottom: "var(--space-2)",
                        color: "var(--success-600)"
                      }}
                    >
                      Ready to Upload ({newFiles.length})
                    </div>
                    <div style={{ display: "grid", gap: "var(--space-2)" }}>
                      {Array.from(newFiles).map((file, idx) => (
                        <div
                          key={`${requirement.requirementCode}-${idx}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "var(--space-2)",
                            background: "var(--surface)",
                            borderRadius: "var(--radius-xs)",
                            fontSize: "0.875rem"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{file.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-500)" }}>
                              {(file.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              onFileRemove?.(requirement.requirementCode, file.name)
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "var(--space-5)",
                    border: "2px dashed var(--line)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "all var(--transition-base)",
                    background: "var(--surface-soft)"
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "var(--brand-500)";
                    e.currentTarget.style.background = "rgba(36, 191, 117, 0.05)";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.background = "var(--surface-soft)";
                  }}
                >
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileInputChange(e, requirement.requirementCode)}
                    style={{ display: "none" }}
                    accept={requirement.acceptedFormats.map((fmt) => `.${fmt}`).join(",")}
                  />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-900)" }}>
                      Click to upload or drag and drop
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-500)" }}>
                      {requirement.acceptedFormats.join(", ").toUpperCase()}
                    </div>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DocumentsStep;
