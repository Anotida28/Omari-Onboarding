import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import WizardLayout from "../components/WizardLayout";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";
import BusinessInfoStep, { BusinessInfoFormState } from "../components/steps/BusinessInfoStep";
import PeopleContactsStep, {
  PeopleContactsFormState,
  ContactPerson,
  Transactor
} from "../components/steps/PeopleContactsStep";
import BankingDetailsStep, { BankingDetailsFormState } from "../components/steps/BankingDetailsStep";
import OperationsStep, { OperationsFormState, Outlet } from "../components/steps/OperationsStep";
import DocumentsStep, { DocumentRequirement } from "../components/steps/DocumentsStep";
import ReviewSubmitStep, { DeclarationFormState } from "../components/steps/ReviewSubmitStep";
import {
  getActiveApplication,
  ApplicationDetailResponse,
  getDocumentRequirements,
  saveMerchantDraft,
  saveMerchantContacts,
  saveMerchantBanking,
  saveAgentDraft,
  saveAgentContacts,
  saveAgentOperations,
  savePayerDraft,
  savePayerContacts,
  savePayerSettlement,
  uploadApplicationDocuments,
  submitMerchantApplication,
  submitAgentApplication,
  submitPayerApplication
} from "../services/api";
import { useAuth } from "../context/AuthContext";

type ApplicationType = "merchant" | "agent" | "payer";

interface WizardStep {
  id: string;
  label: string;
  content: React.ReactNode;
  isValid?: boolean;
  onSave?: () => Promise<void>;
}

interface FieldError {
  field: string;
  message: string;
}

interface StepError {
  stepId: string;
  message: string;
  fieldErrors?: FieldError[];
}

function OnboardingWizardPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<string, StepError>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});

  // Form state
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoFormState>({
    legalName: "",
    tradingName: "",
    contactPerson: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: ""
  });

  const [peopleContacts, setPeopleContacts] = useState<PeopleContactsFormState>({
    primaryContact: {
      fullName: "",
      email: "",
      phoneNumber: "",
      designation: "",
      residentialAddress: ""
    },
    authorizedTransactors: [
      {
        fullName: "",
        email: "",
        phoneNumber: "",
        designation: "",
        residentialAddress: "",
        nationalIdNumber: ""
      }
    ],
    signatories: [
      {
        fullName: "",
        email: "",
        phoneNumber: "",
        designation: "",
        residentialAddress: "",
        nationalIdNumber: "",
        isPrimarySignatory: true
      }
    ],
    directors: [
      {
        fullName: "",
        email: "",
        phoneNumber: "",
        designation: "",
        residentialAddress: "",
        nationalIdNumber: ""
      }
    ]
  });

  const [bankingDetails, setBankingDetails] = useState<BankingDetailsFormState>({
    accountName: "",
    bankName: "",
    branchName: "",
    branchCode: "",
    accountNumber: "",
    accountType: "Current",
    currency: "USD"
  });

  const [operations, setOperations] = useState<OperationsFormState>({
    outlets: [
      {
        name: "",
        location: "",
        contactPerson: "",
        phoneNumber: "",
        email: ""
      }
    ],
    description: "",
    complianceContact: "",
    operationalDetails: ""
  });

  const [declarations, setDeclarations] = useState<DeclarationFormState>({
    signerName: "",
    signerTitle: "",
    acceptedTerms: false,
    certifiedInformation: false,
    authorizedToAct: false
  });

  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState("");

  const applicationType = (searchParams.get("type") || "merchant") as ApplicationType;
  const isAgent = applicationType === "agent";
  const isPayer = applicationType === "payer";

  const applicationTypeLabel = {
    merchant: "Merchant Application",
    agent: "Agent Application",
    payer: "Payer / Biller Application"
  }[applicationType];

  // Load entity types and document requirements
  useEffect(() => {
    const loadRequirements = async (): Promise<void> => {
      try {
        const response = await getDocumentRequirements(applicationType);
        setEntityTypes(response.availableEntityTypes);
        setSelectedEntityType(response.availableEntityTypes[0] || "");
        setDocumentRequirements(
          response.requirements.map((req) => ({
            id: req.code,
            name: req.label,
            description: req.description || "",
            requirementCode: req.code,
            isMandatory: req.isRequired,
            acceptedFormats: req.allowedExtensions
          }))
        );
      } catch (err) {
        console.error("Failed to load requirements", err);
      }
    };

    void loadRequirements();
  }, [applicationType]);

  // Load active application on mount
  useEffect(() => {
    const loadApplication = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await getActiveApplication();
        if (response && response.applicationType === applicationType) {
          setApplication(response);
          // Pre-populate form with existing data
          if (response.businessSnapshot) {
            setBusinessInfo({
              legalName: response.businessSnapshot.legalName || "",
              tradingName: response.businessSnapshot.tradingName || "",
              contactPerson: response.businessSnapshot.contactPerson || "",
              businessEmail: response.businessSnapshot.businessEmail || "",
              businessPhone: response.businessSnapshot.businessPhone || "",
              businessAddress: response.businessSnapshot.businessAddress || ""
            });
          }
        }
      } catch (err) {
        console.error("Failed to load application", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      void loadApplication();
    }
  }, [user, applicationType]);

  // API Save Handlers
  const saveBusinessInfoStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({ ...prev, "business-info": { stepId: "business-info", message: "" } }));

    // Validation
    if (!businessInfo.legalName || !businessInfo.businessEmail || !businessInfo.businessPhone) {
      const fieldErrs: FieldError[] = [];
      if (!businessInfo.legalName) fieldErrs.push({ field: "legalName", message: "Legal name is required" });
      if (!businessInfo.businessEmail) fieldErrs.push({ field: "businessEmail", message: "Email is required" });
      if (!businessInfo.businessPhone) fieldErrs.push({ field: "businessPhone", message: "Phone is required" });

      setStepErrors((prev) => ({
        ...prev,
        "business-info": { stepId: "business-info", message: "Please fill all required fields", fieldErrors: fieldErrs }
      }));
      return;
    }

    setIsSaving(true);
    try {
      const appId = application?.applicationId;
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await saveMerchantDraft({
          applicationId: appId,
          entityType: selectedEntityType || "merchant",
          legalName: businessInfo.legalName,
          tradingName: businessInfo.tradingName,
          contactPerson: businessInfo.contactPerson,
          businessEmail: businessInfo.businessEmail,
          businessPhone: businessInfo.businessPhone,
          businessAddress: businessInfo.businessAddress,
          productsDescription: businessInfo.productsDescription || ""
        });
      } else if (applicationType === "agent") {
        response = await saveAgentDraft({
          applicationId: appId,
          entityType: selectedEntityType || "agent",
          legalName: businessInfo.legalName,
          tradingName: businessInfo.tradingName,
          contactPerson: businessInfo.contactPerson,
          businessEmail: businessInfo.businessEmail,
          businessPhone: businessInfo.businessPhone,
          businessAddress: businessInfo.businessAddress,
          yearsInOperation: businessInfo.yearsInOperation || ""
        });
      } else {
        response = await savePayerDraft({
          applicationId: appId,
          entityType: selectedEntityType || "payer",
          legalName: businessInfo.legalName,
          tradingName: businessInfo.tradingName,
          contactPerson: businessInfo.contactPerson,
          businessEmail: businessInfo.businessEmail,
          businessPhone: businessInfo.businessPhone,
          businessAddress: businessInfo.businessAddress
        });
      }

      setApplication(response);
      setMessage("Business information saved successfully");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to save business information";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const savePeopleContactsStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({ ...prev, "people-contacts": { stepId: "people-contacts", message: "" } }));

    const appId = application?.applicationId;
    if (!appId) {
      setError("Save business information first");
      return;
    }

    setIsSaving(true);
    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await saveMerchantContacts(appId, {
          primaryContact: peopleContacts.primaryContact,
          authorizedTransactors: peopleContacts.authorizedTransactors,
          signatories: peopleContacts.signatories || []
        });
      } else if (applicationType === "agent") {
        response = await saveAgentContacts(appId, {
          primaryContact: peopleContacts.primaryContact,
          authorizedTransactors: peopleContacts.authorizedTransactors,
          directors: peopleContacts.directors || []
        });
      } else {
        response = await savePayerContacts(appId, {
          primaryContact: peopleContacts.primaryContact,
          operationsContacts: peopleContacts.authorizedTransactors,
          signatories: peopleContacts.signatories || []
        });
      }

      setApplication(response);
      setMessage("People and contacts saved successfully");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to save contacts";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBankingStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({ ...prev, "banking": { stepId: "banking", message: "" } }));

    if (!bankingDetails.accountNumber || !bankingDetails.bankName) {
      setError("Please fill all required banking fields");
      return;
    }

    const appId = application?.applicationId;
    if (!appId) {
      setError("Save business information first");
      return;
    }

    setIsSaving(true);
    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await saveMerchantBanking(appId, bankingDetails);
      } else if (applicationType === "agent") {
        response = await saveAgentOperations(appId, {
          accountName: bankingDetails.accountName,
          bankName: bankingDetails.bankName,
          branchName: bankingDetails.branchName,
          branchCode: bankingDetails.branchCode,
          accountNumber: bankingDetails.accountNumber,
          accountType: bankingDetails.accountType,
          currency: bankingDetails.currency,
          outlets: operations.outlets || []
        });
      } else {
        response = await savePayerSettlement(appId, bankingDetails);
      }

      setApplication(response);
      setMessage("Banking details saved successfully");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to save banking details";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDocumentsStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({ ...prev, "documents": { stepId: "documents", message: "" } }));

    const appId = application?.applicationId;
    if (!appId) {
      setError("Save all previous steps first");
      return;
    }

    const filesToUpload = Object.entries(selectedFiles).filter(([, files]) => files.length > 0);
    if (filesToUpload.length === 0) {
      setMessage("No new documents to upload");
      return;
    }

    setIsSaving(true);
    try {
      let latestApp: ApplicationDetailResponse | null = null;

      for (const [requirementCode, files] of filesToUpload) {
        latestApp = await uploadApplicationDocuments(appId, requirementCode, files);
      }

      if (latestApp) {
        setApplication(latestApp);
        setSelectedFiles({});
        setMessage(`${filesToUpload.length} document group(s) uploaded successfully`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to upload documents";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const submitApplication = async (): Promise<void> => {
    setError("");

    const appId = application?.applicationId;
    if (!appId) {
      setError("Application not found");
      return;
    }

    setIsSaving(true);
    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await submitMerchantApplication(appId, declarations);
      } else if (applicationType === "agent") {
        response = await submitAgentApplication(appId, declarations);
      } else {
        response = await submitPayerApplication(appId, declarations);
      }

      setApplication(response);
      setMessage("Application submitted successfully");
      setTimeout(() => navigate("/applications/status"), 2000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit application";
      setError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (requirementCode: string, files: FileList): void => {
    setSelectedFiles((prev) => ({
      ...prev,
      [requirementCode]: Array.from(files)
    }));
  };

  const handleFileRemove = (requirementCode: string, fileName: string): void => {
    setSelectedFiles((prev) => ({
      ...prev,
      [requirementCode]: (prev[requirementCode] || []).filter((f) => f.name !== fileName)
    }));
  };

  // Field change handlers
  const handleBusinessInfoChange = (field: keyof BusinessInfoFormState, value: string): void => {
    setBusinessInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrimaryContactChange = (field: keyof ContactPerson, value: string): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      primaryContact: { ...prev.primaryContact, [field]: value }
    }));
  };

  const handleTransactorChange = (index: number, field: keyof Transactor, value: string): void => {
    setPeopleContacts((prev) => {
      const newTransactors = [...prev.authorizedTransactors];
      newTransactors[index] = { ...newTransactors[index], [field]: value };
      return { ...prev, authorizedTransactors: newTransactors };
    });
  };

  const handleAddTransactor = (): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      authorizedTransactors: [
        ...prev.authorizedTransactors,
        {
          fullName: "",
          email: "",
          phoneNumber: "",
          designation: "",
          residentialAddress: "",
          nationalIdNumber: ""
        }
      ]
    }));
  };

  const handleRemoveTransactor = (index: number): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      authorizedTransactors: prev.authorizedTransactors.filter((_, i) => i !== index)
    }));
  };

  const handleBankingDetailsChange = (field: keyof BankingDetailsFormState, value: string): void => {
    setBankingDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleOperationsChange = (field: keyof OperationsFormState, value: string): void => {
    setOperations((prev) => ({ ...prev, [field]: value }));
  };

  const handleOutletChange = (index: number, field: keyof Outlet, value: string): void => {
    setOperations((prev) => {
      const newOutlets = [...(prev.outlets || [])];
      newOutlets[index] = { ...newOutlets[index], [field]: value };
      return { ...prev, outlets: newOutlets };
    });
  };

  const handleAddOutlet = (): void => {
    setOperations((prev) => ({
      ...prev,
      outlets: [
        ...(prev.outlets || []),
        {
          name: "",
          location: "",
          contactPerson: "",
          phoneNumber: "",
          email: ""
        }
      ]
    }));
  };

  const handleRemoveOutlet = (index: number): void => {
    setOperations((prev) => ({
      ...prev,
      outlets: (prev.outlets || []).filter((_, i) => i !== index)
    }));
  };

  const handleDeclarationChange = (field: keyof DeclarationFormState, value: string | boolean): void => {
    setDeclarations((prev) => ({ ...prev, [field]: value }));
  };

  const wizardSteps: WizardStep[] = [
    {
      id: "business-info",
      label: "Business Information",
      content: (
        <div>
          {stepErrors["business-info"]?.message && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">{stepErrors["business-info"].message}</div>
            </div>
          )}
          <BusinessInfoStep
            formData={businessInfo}
            onChange={handleBusinessInfoChange}
            applicationTypes={entityTypes}
            selectedEntityType={selectedEntityType}
            onEntityTypeChange={setSelectedEntityType}
            isAgent={isAgent}
            isPayer={isPayer}
          />
        </div>
      ),
      isValid: Boolean(
        businessInfo.legalName &&
        businessInfo.tradingName &&
        businessInfo.businessEmail &&
        businessInfo.businessPhone &&
        businessInfo.businessAddress
      ),
      onSave: saveBusinessInfoStep
    },
    {
      id: "people-contacts",
      label: "People & Contacts",
      content: (
        <div>
          {stepErrors["people-contacts"]?.message && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">{stepErrors["people-contacts"].message}</div>
            </div>
          )}
          <PeopleContactsStep
            formData={peopleContacts}
            onPrimaryContactChange={handlePrimaryContactChange}
            onTransactorChange={handleTransactorChange}
            onAddTransactor={handleAddTransactor}
            onRemoveTransactor={handleRemoveTransactor}
            isAgent={isAgent}
            isPayer={isPayer}
          />
        </div>
      ),
      isValid: Boolean(
        peopleContacts.primaryContact.fullName &&
        peopleContacts.primaryContact.email &&
        peopleContacts.authorizedTransactors[0]?.fullName
      ),
      onSave: savePeopleContactsStep
    },
    {
      id: "banking",
      label: "Banking Details",
      content: (
        <div>
          {stepErrors["banking"]?.message && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">{stepErrors["banking"].message}</div>
            </div>
          )}
          <BankingDetailsStep
            formData={bankingDetails}
            onChange={handleBankingDetailsChange}
            isAgent={isAgent}
            isPayer={isPayer}
          />
        </div>
      ),
      isValid: Boolean(
        bankingDetails.accountName &&
        bankingDetails.bankName &&
        bankingDetails.accountNumber &&
        bankingDetails.accountType &&
        bankingDetails.currency
      ),
      onSave: saveBankingStep
    },
    {
      id: "operations",
      label: isAgent ? "Outlets & Operations" : "Operations",
      content: (
        <OperationsStep
          formData={operations}
          onOutletChange={handleOutletChange}
          onAddOutlet={handleAddOutlet}
          onRemoveOutlet={handleRemoveOutlet}
          onChange={handleOperationsChange}
          isAgent={isAgent}
          isPayer={isPayer}
        />
      ),
      isValid: true
    },
    {
      id: "documents",
      label: "Supporting Documents",
      content: (
        <div>
          {stepErrors["documents"]?.message && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">{stepErrors["documents"].message}</div>
            </div>
          )}
          <DocumentsStep
            requirements={documentRequirements}
            uploadedDocuments={{}}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
          />
        </div>
      ),
      isValid: true,
      onSave: saveDocumentsStep
    },
    {
      id: "review-submit",
      label: "Review & Submit",
      content: (
        <ReviewSubmitStep
          formData={declarations}
          onChange={handleDeclarationChange}
          applicationSummary={{
            applicationType: applicationTypeLabel,
            organizationName: user?.organization?.legalName || "Your Organization",
            sectionsCompleted: currentStepIndex + 1,
            totalSections: 6,
            status: "draft"
          }}
          documentsCount={documentRequirements.length}
          isAgent={isAgent}
          isPayer={isPayer}
          onSubmit={submitApplication}
          isSubmitting={isSaving}
        />
      ),
      isValid: Boolean(
        declarations.signerName &&
        declarations.signerTitle &&
        declarations.acceptedTerms &&
        declarations.certifiedInformation &&
        declarations.authorizedToAct
      )
    }
  ];

  const handleNextStep = async (): Promise<void> => {
    const currentStep = wizardSteps[currentStepIndex];
    if (currentStep.onSave && !isSaving) {
      try {
        await currentStep.onSave();
        if (currentStepIndex < wizardSteps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
          setMessage("");
        }
      } catch (err) {
        // Error already set by save handler
      }
    } else if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePreviousStep = (): void => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setError("");
      setMessage("");
    }
  };

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant Portal"
      heading={applicationTypeLabel}
      description="Complete your application step-by-step, save your progress anytime, and submit when ready for review."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>Loading your application...</h3>
        </div>
      ) : (
        <div>
          {error && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">Error</div>
              <div className="alert-description">{error}</div>
            </div>
          )}
          {message && (
            <div className="alert alert--success" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">Success</div>
              <div className="alert-description">{message}</div>
            </div>
          )}
          <WizardLayout
            steps={wizardSteps}
            currentStepIndex={currentStepIndex}
            onNextStep={handleNextStep}
            onPreviousStep={handlePreviousStep}
            onSubmit={submitApplication}
            isLoading={isSaving}
            canSubmit={declarations.acceptedTerms && declarations.certifiedInformation && declarations.authorizedToAct}
            showSubmitButton={currentStepIndex === wizardSteps.length - 1}
          />
        </div>
      )}
    </PortalShell>
  );
}

export default OnboardingWizardPage;
