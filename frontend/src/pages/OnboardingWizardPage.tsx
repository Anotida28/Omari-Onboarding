import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import WizardLayout from "../components/WizardLayout";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";
import BusinessInfoStep, {
  BusinessInfoFormState
} from "../components/steps/BusinessInfoStep";
import PeopleContactsStep, {
  PeopleContactsFormState,
  ContactPerson,
  Transactor
} from "../components/steps/PeopleContactsStep";
import BankingDetailsStep, {
  BankingDetailsFormState
} from "../components/steps/BankingDetailsStep";
import OperationsStep, {
  OperationsFormState,
  Outlet
} from "../components/steps/OperationsStep";
import DocumentsStep, {
  DocumentRequirement
} from "../components/steps/DocumentsStep";
import ReviewSubmitStep, {
  DeclarationFormState
} from "../components/steps/ReviewSubmitStep";
import {
  ApplicationDetailResponse,
  getActiveApplicationByType,
  getDocumentRequirements,
  saveAgentBanking,
  saveAgentContacts,
  saveAgentDraft,
  saveAgentOperations,
  saveMerchantBanking,
  saveMerchantContacts,
  saveMerchantDraft,
  savePayerBanking,
  savePayerContacts,
  savePayerDraft,
  savePayerSettlement,
  submitAgentApplication,
  submitMerchantApplication,
  submitPayerApplication,
  uploadApplicationDocuments
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

const EMPTY_PRIMARY_CONTACT: ContactPerson = {
  fullName: "",
  email: "",
  phoneNumber: "",
  designation: "",
  residentialAddress: ""
};

const EMPTY_PERSON: Transactor = {
  fullName: "",
  email: "",
  phoneNumber: "",
  designation: "",
  residentialAddress: "",
  nationalIdNumber: ""
};

const EMPTY_SIGNATORY: Transactor = {
  ...EMPTY_PERSON,
  isPrimarySignatory: true
};

const EMPTY_OUTLET: Outlet = {
  name: "",
  location: "",
  contactPerson: "",
  phoneNumber: "",
  email: ""
};

const createEmptyBusinessInfo = (): BusinessInfoFormState => ({
  legalName: "",
  tradingName: "",
  contactPerson: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  projectedTransactions: "",
  yearsInOperation: "",
  productsDescription: "",
  serviceCoverage: "",
  registrationNumber: "",
  taxNumber: ""
});

const createEmptyPeopleContacts = (): PeopleContactsFormState => ({
  primaryContact: { ...EMPTY_PRIMARY_CONTACT },
  authorizedTransactors: [{ ...EMPTY_PERSON }],
  signatories: [{ ...EMPTY_SIGNATORY }],
  directors: [{ ...EMPTY_PERSON }]
});

const createEmptyBankingDetails = (): BankingDetailsFormState => ({
  accountName: "",
  bankName: "",
  branchName: "",
  branchCode: "",
  accountNumber: "",
  accountType: "Current",
  currency: "USD"
});

const createEmptyOperations = (): OperationsFormState => ({
  outlets: [{ ...EMPTY_OUTLET }],
  complianceContact: "",
  operationalDetails: "",
  settlementMethod: "",
  reconciliationEmail: "",
  integrationNotes: ""
});

const createEmptyDeclarations = (): DeclarationFormState => ({
  signerName: "",
  signerTitle: "",
  acceptedTerms: false,
  certifiedInformation: false,
  authorizedToAct: false
});

const getStepOrder = (applicationType: ApplicationType): string[] =>
  applicationType === "merchant"
    ? [
        "business-info",
        "people-contacts",
        "banking",
        "documents",
        "review-submit"
      ]
    : [
        "business-info",
        "people-contacts",
        "banking",
        "operations",
        "documents",
        "review-submit"
      ];

const getStepIdForSection = (
  sectionKey: string | null,
  applicationType: ApplicationType
): string | null => {
  switch (sectionKey) {
    case "business_snapshot":
      return "business-info";
    case "contacts_transactors":
      return "people-contacts";
    case "banking_details":
      return "banking";
    case "operations_configuration":
      return applicationType === "merchant" ? "documents" : "operations";
    case "supporting_documents":
      return "documents";
    case "declarations_review":
      return "review-submit";
    default:
      return null;
  }
};

const getStepIndexFromApplication = (
  response: ApplicationDetailResponse,
  applicationType: ApplicationType
): number => {
  const stepOrder = getStepOrder(applicationType);
  const currentStepId = getStepIdForSection(
    response.currentStep,
    applicationType
  );

  if (currentStepId) {
    const currentIndex = stepOrder.indexOf(currentStepId);

    if (currentIndex >= 0) {
      return currentIndex;
    }
  }

  const firstIncomplete = response.sections.find(
    (section) => section.status !== "completed"
  );
  const fallbackStepId = getStepIdForSection(
    firstIncomplete?.key || null,
    applicationType
  );

  if (fallbackStepId) {
    const fallbackIndex = stepOrder.indexOf(fallbackStepId);

    if (fallbackIndex >= 0) {
      return fallbackIndex;
    }
  }

  return 0;
};

const mapDocumentRequirements = (
  response: Awaited<ReturnType<typeof getDocumentRequirements>>
): DocumentRequirement[] =>
  response.requirements.map((requirement) => ({
    id: requirement.code,
    name: requirement.label,
    description: requirement.description || "",
    requirementCode: requirement.code,
    isMandatory: requirement.isRequired,
    acceptedFormats: requirement.allowedExtensions
  }));

function OnboardingWizardPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(
    null
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stepErrors, setStepErrors] = useState<Record<string, StepError>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoFormState>(
    createEmptyBusinessInfo()
  );
  const [peopleContacts, setPeopleContacts] = useState<PeopleContactsFormState>(
    createEmptyPeopleContacts()
  );
  const [bankingDetails, setBankingDetails] = useState<BankingDetailsFormState>(
    createEmptyBankingDetails()
  );
  const [operations, setOperations] = useState<OperationsFormState>(
    createEmptyOperations()
  );
  const [declarations, setDeclarations] = useState<DeclarationFormState>(
    createEmptyDeclarations()
  );
  const [documentRequirements, setDocumentRequirements] = useState<
    DocumentRequirement[]
  >([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState("");

  const applicationType = (searchParams.get("type") || "merchant") as ApplicationType;
  const isAgent = applicationType === "agent";
  const isPayer = applicationType === "payer";
  const hasOperationsStep = isAgent || isPayer;
  const totalSections = hasOperationsStep ? 6 : 5;

  const applicationTypeLabel = {
    merchant: "Merchant Application",
    agent: "Agent Application",
    payer: "Payer / Biller Application"
  }[applicationType];

  const resetWizardState = (): void => {
    setApplication(null);
    setCurrentStepIndex(0);
    setError("");
    setMessage("");
    setStepErrors({});
    setSelectedFiles({});
    setBusinessInfo(createEmptyBusinessInfo());
    setPeopleContacts(createEmptyPeopleContacts());
    setBankingDetails(createEmptyBankingDetails());
    setOperations(createEmptyOperations());
    setDeclarations(createEmptyDeclarations());
    setDocumentRequirements([]);
    setEntityTypes([]);
    setSelectedEntityType("");
  };

  useEffect(() => {
    resetWizardState();
  }, [applicationType]);

  useEffect(() => {
    const loadRequirements = async (): Promise<void> => {
      try {
        const response = await getDocumentRequirements(
          applicationType,
          selectedEntityType || undefined
        );

        setEntityTypes(response.availableEntityTypes);

        if (!selectedEntityType && response.availableEntityTypes[0]) {
          setSelectedEntityType(response.availableEntityTypes[0]);
        }

        setDocumentRequirements(mapDocumentRequirements(response));
      } catch (loadError) {
        console.error("Failed to load requirements", loadError);
      }
    };

    void loadRequirements();
  }, [applicationType, selectedEntityType]);

  useEffect(() => {
    const loadApplication = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await getActiveApplicationByType(applicationType);

        if (!response) {
          return;
        }

        setApplication(response);

        const entityType =
          response.businessSnapshot?.entityType || response.organization.entityType || "";

        if (entityType) {
          setSelectedEntityType(entityType);
        }

        if (response.businessSnapshot) {
          setBusinessInfo({
            legalName: response.businessSnapshot.legalName || "",
            tradingName: response.businessSnapshot.tradingName || "",
            contactPerson: response.businessSnapshot.contactPerson || "",
            businessEmail: response.businessSnapshot.businessEmail || "",
            businessPhone: response.businessSnapshot.businessPhone || "",
            businessAddress: response.businessSnapshot.businessAddress || "",
            projectedTransactions:
              response.businessSnapshot.projectedTransactions || "",
            yearsInOperation: response.businessSnapshot.yearsInOperation || "",
            productsDescription:
              response.businessSnapshot.productsDescription || "",
            serviceCoverage: response.businessSnapshot.serviceCoverage || "",
            registrationNumber:
              response.businessSnapshot.registrationNumber || "",
            taxNumber: response.businessSnapshot.taxNumber || ""
          });
        }

        if (applicationType === "merchant" && response.merchantContacts) {
          setPeopleContacts({
            primaryContact: {
              ...EMPTY_PRIMARY_CONTACT,
              ...response.merchantContacts.primaryContact
            },
            authorizedTransactors:
              response.merchantContacts.authorizedTransactors.length > 0
                ? response.merchantContacts.authorizedTransactors.map((person) => ({
                    ...EMPTY_PERSON,
                    ...person
                  }))
                : [{ ...EMPTY_PERSON }],
            signatories:
              response.merchantContacts.signatories.length > 0
                ? response.merchantContacts.signatories.map((person) => ({
                    ...EMPTY_SIGNATORY,
                    ...person
                  }))
                : [{ ...EMPTY_SIGNATORY }],
            directors: [{ ...EMPTY_PERSON }]
          });
        }

        if (applicationType === "agent") {
          if (response.agentContacts) {
            setPeopleContacts({
              primaryContact: {
                ...EMPTY_PRIMARY_CONTACT,
                ...response.agentContacts.primaryContact
              },
              authorizedTransactors:
                response.agentContacts.authorizedTransactors.length > 0
                  ? response.agentContacts.authorizedTransactors.map((person) => ({
                      ...EMPTY_PERSON,
                      ...person
                    }))
                  : [{ ...EMPTY_PERSON }],
              signatories: [{ ...EMPTY_SIGNATORY }],
              directors:
                response.agentContacts.directors.length > 0
                  ? response.agentContacts.directors.map((person) => ({
                      ...EMPTY_PERSON,
                      ...person
                    }))
                  : [{ ...EMPTY_PERSON }]
            });
          }

          if (response.agentOperations) {
            setBankingDetails({
              accountName: response.agentOperations.accountName || "",
              bankName: response.agentOperations.bankName || "",
              branchName: response.agentOperations.branchName || "",
              branchCode: response.agentOperations.branchCode || "",
              accountNumber: response.agentOperations.accountNumber || "",
              accountType: response.agentOperations.accountType || "Current",
              currency: response.agentOperations.currency || "USD"
            });

            setOperations({
              outlets:
                response.agentOperations.outlets.length > 0
                  ? response.agentOperations.outlets.map((outlet) => ({
                      name: outlet.name || "",
                      location:
                        outlet.location || outlet.addressLine1 || "",
                      contactPerson: outlet.contactPerson || "",
                      phoneNumber: outlet.phoneNumber || "",
                      email: outlet.email || ""
                    }))
                  : [{ ...EMPTY_OUTLET }],
              complianceContact:
                response.agentOperations.complianceContact || "",
              operationalDetails:
                response.agentOperations.operationalDetails || "",
              settlementMethod: "",
              reconciliationEmail: "",
              integrationNotes: ""
            });
          }
        }

        if (applicationType === "payer") {
          if (response.payerContacts) {
            setPeopleContacts({
              primaryContact: {
                ...EMPTY_PRIMARY_CONTACT,
                ...response.payerContacts.primaryContact
              },
              authorizedTransactors:
                response.payerContacts.operationsContacts.length > 0
                  ? response.payerContacts.operationsContacts.map((person) => ({
                      ...EMPTY_PERSON,
                      ...person
                    }))
                  : [{ ...EMPTY_PERSON }],
              signatories:
                response.payerContacts.signatories.length > 0
                  ? response.payerContacts.signatories.map((person) => ({
                      ...EMPTY_SIGNATORY,
                      ...person
                    }))
                  : [{ ...EMPTY_SIGNATORY }],
              directors: [{ ...EMPTY_PERSON }]
            });
          }

          if (response.payerSettlement) {
            setBankingDetails({
              accountName: response.payerSettlement.accountName || "",
              bankName: response.payerSettlement.bankName || "",
              branchName: response.payerSettlement.branchName || "",
              branchCode: response.payerSettlement.branchCode || "",
              accountNumber: response.payerSettlement.accountNumber || "",
              accountType: response.payerSettlement.accountType || "Current",
              currency: response.payerSettlement.currency || "USD"
            });

            setOperations({
              outlets: [{ ...EMPTY_OUTLET }],
              complianceContact: "",
              operationalDetails: "",
              settlementMethod:
                response.payerSettlement.settlementMethod || "",
              reconciliationEmail:
                response.payerSettlement.reconciliationEmail || "",
              integrationNotes:
                response.payerSettlement.integrationNotes || ""
            });
          }
        }

        const declarationState =
          (applicationType === "merchant"
            ? response.merchantDeclaration
            : applicationType === "agent"
              ? response.agentDeclaration
              : response.payerDeclaration) || null;

        if (declarationState) {
          setDeclarations({
            signerName: declarationState.signerName || "",
            signerTitle: declarationState.signerTitle || "",
            acceptedTerms: Boolean(declarationState.acceptedTerms),
            certifiedInformation: Boolean(declarationState.certifiedInformation),
            authorizedToAct: Boolean(declarationState.authorizedToAct)
          });
        }

        setCurrentStepIndex(getStepIndexFromApplication(response, applicationType));
      } catch (loadError) {
        console.error("Failed to load application", loadError);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      void loadApplication();
    } else {
      setIsLoading(false);
    }
  }, [applicationType, user]);

  const uploadedDocumentsByRequirement = useMemo(() => {
    if (!application) {
      return {};
    }

    return application.uploadedDocuments.reduce<
      Record<
        string,
        Array<{
          id: string;
          requirementCode: string;
          fileName: string;
          uploadedAt: string;
          status: "pending" | "accepted" | "rejected";
          reviewerComment?: string;
        }>
      >
    >((accumulator, document) => {
      if (!document.requirementCode) {
        return accumulator;
      }

      const bucket = accumulator[document.requirementCode] || [];
      bucket.push({
        id: document.id,
        requirementCode: document.requirementCode,
        fileName: document.originalFileName,
        uploadedAt: document.uploadedAt,
        status:
          document.status === "accepted" || document.status === "rejected"
            ? document.status
            : "pending",
        reviewerComment: document.reviewNotes || undefined
      });
      accumulator[document.requirementCode] = bucket;
      return accumulator;
    }, {});
  }, [application]);

  const saveBusinessInfoStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({
      ...prev,
      "business-info": { stepId: "business-info", message: "" }
    }));

    if (
      !selectedEntityType ||
      !businessInfo.legalName ||
      !businessInfo.businessEmail ||
      !businessInfo.businessPhone
    ) {
      const fieldErrors: FieldError[] = [];

      if (!selectedEntityType) {
        fieldErrors.push({
          field: "entityType",
          message: "Business category is required"
        });
      }
      if (!businessInfo.legalName) {
        fieldErrors.push({
          field: "legalName",
          message: "Legal name is required"
        });
      }
      if (!businessInfo.businessEmail) {
        fieldErrors.push({
          field: "businessEmail",
          message: "Email is required"
        });
      }
      if (!businessInfo.businessPhone) {
        fieldErrors.push({
          field: "businessPhone",
          message: "Phone is required"
        });
      }

      setStepErrors((prev) => ({
        ...prev,
        "business-info": {
          stepId: "business-info",
          message: "Please complete the required business details.",
          fieldErrors
        }
      }));
      return;
    }

    setIsSaving(true);

    try {
      const applicationId = application?.applicationId;
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await saveMerchantDraft({
          applicationId,
          entityType: selectedEntityType,
          legalName: businessInfo.legalName,
          tradingName: businessInfo.tradingName,
          contactPerson: businessInfo.contactPerson,
          businessEmail: businessInfo.businessEmail,
          businessPhone: businessInfo.businessPhone,
          businessAddress: businessInfo.businessAddress,
          projectedTransactions: businessInfo.projectedTransactions || "",
          productsDescription: businessInfo.productsDescription || "",
          registrationNumber: businessInfo.registrationNumber || "",
          taxNumber: businessInfo.taxNumber || ""
        });
      } else if (applicationType === "agent") {
        response = await saveAgentDraft({
          applicationId,
          entityType: selectedEntityType,
          legalName: businessInfo.legalName,
          tradingName: businessInfo.tradingName,
          contactPerson: businessInfo.contactPerson,
          businessEmail: businessInfo.businessEmail,
          businessPhone: businessInfo.businessPhone,
          businessAddress: businessInfo.businessAddress,
          yearsInOperation: businessInfo.yearsInOperation || "",
          serviceCoverage: businessInfo.serviceCoverage || "",
          registrationNumber: businessInfo.registrationNumber || "",
          taxNumber: businessInfo.taxNumber || "",
          productsDescription: businessInfo.productsDescription || ""
        });
      } else {
        response = await savePayerDraft({
          applicationId,
          entityType: selectedEntityType,
          legalName: businessInfo.legalName,
          tradingName: businessInfo.tradingName,
          contactPerson: businessInfo.contactPerson,
          businessEmail: businessInfo.businessEmail,
          businessPhone: businessInfo.businessPhone,
          businessAddress: businessInfo.businessAddress,
          registrationNumber: businessInfo.registrationNumber || "",
          taxNumber: businessInfo.taxNumber || "",
          productsDescription: businessInfo.productsDescription || ""
        });
      }

      setApplication(response);
      setMessage("Business information saved successfully.");
    } catch (saveError) {
      const saveMessage =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save business information.";
      setError(saveMessage);
      throw new Error(saveMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const savePeopleContactsStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({
      ...prev,
      "people-contacts": { stepId: "people-contacts", message: "" }
    }));

    const applicationId = application?.applicationId;

    if (!applicationId) {
      setError("Save business information first.");
      return;
    }

    setIsSaving(true);

    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await saveMerchantContacts(applicationId, {
          primaryContact: peopleContacts.primaryContact,
          authorizedTransactors: peopleContacts.authorizedTransactors,
          signatories: peopleContacts.signatories || []
        });
      } else if (applicationType === "agent") {
        response = await saveAgentContacts(applicationId, {
          primaryContact: peopleContacts.primaryContact,
          authorizedTransactors: peopleContacts.authorizedTransactors,
          directors: peopleContacts.directors || []
        });
      } else {
        response = await savePayerContacts(applicationId, {
          primaryContact: peopleContacts.primaryContact,
          operationsContacts: peopleContacts.authorizedTransactors,
          signatories: peopleContacts.signatories || []
        });
      }

      setApplication(response);
      setMessage("People and contact details saved successfully.");
    } catch (saveError) {
      const saveMessage =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save people and contact details.";
      setError(saveMessage);
      throw new Error(saveMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBankingStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({
      ...prev,
      banking: { stepId: "banking", message: "" }
    }));

    if (!bankingDetails.accountNumber || !bankingDetails.bankName) {
      setError("Please complete the required banking fields.");
      return;
    }

    const applicationId = application?.applicationId;

    if (!applicationId) {
      setError("Save business information first.");
      return;
    }

    setIsSaving(true);

    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await saveMerchantBanking(applicationId, bankingDetails);
      } else if (applicationType === "agent") {
        response = await saveAgentBanking(applicationId, bankingDetails);
      } else {
        response = await savePayerBanking(applicationId, bankingDetails);
      }

      setApplication(response);
      setMessage("Banking details saved successfully.");
    } catch (saveError) {
      const saveMessage =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save banking details.";
      setError(saveMessage);
      throw new Error(saveMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const saveOperationsStep = async (): Promise<void> => {
    if (!hasOperationsStep) {
      return;
    }

    setError("");
    setStepErrors((prev) => ({
      ...prev,
      operations: { stepId: "operations", message: "" }
    }));

    const applicationId = application?.applicationId;

    if (!applicationId) {
      setError("Save business information first.");
      return;
    }

    setIsSaving(true);

    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "agent") {
        response = await saveAgentOperations(applicationId, {
          outlets: (operations.outlets || []).map((outlet) => ({
            name: outlet.name,
            location: outlet.location,
            contactPerson: outlet.contactPerson,
            phoneNumber: outlet.phoneNumber,
            email: outlet.email
          })),
          complianceContact: operations.complianceContact || "",
          operationalDetails: operations.operationalDetails || ""
        });
      } else {
        response = await savePayerSettlement(applicationId, {
          settlementMethod: operations.settlementMethod || "",
          reconciliationEmail: operations.reconciliationEmail || "",
          integrationNotes: operations.integrationNotes || ""
        });
      }

      setApplication(response);
      setMessage(
        applicationType === "agent"
          ? "Operations details saved successfully."
          : "Settlement configuration saved successfully."
      );
    } catch (saveError) {
      const saveMessage =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save operations details.";
      setError(saveMessage);
      throw new Error(saveMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDocumentsStep = async (): Promise<void> => {
    setError("");
    setStepErrors((prev) => ({
      ...prev,
      documents: { stepId: "documents", message: "" }
    }));

    const applicationId = application?.applicationId;

    if (!applicationId) {
      setError("Save the earlier steps first.");
      return;
    }

    const filesToUpload = Object.entries(selectedFiles).filter(
      ([, files]) => files.length > 0
    );

    if (filesToUpload.length === 0) {
      setMessage("No new documents selected for upload.");
      return;
    }

    setIsSaving(true);

    try {
      let latestApplication: ApplicationDetailResponse | null = null;

      for (const [requirementCode, files] of filesToUpload) {
        latestApplication = await uploadApplicationDocuments(
          applicationId,
          requirementCode,
          files
        );
      }

      if (latestApplication) {
        setApplication(latestApplication);
        setSelectedFiles({});
        setMessage(`${filesToUpload.length} document group(s) uploaded successfully.`);
      }
    } catch (saveError) {
      const saveMessage =
        saveError instanceof Error
          ? saveError.message
          : "Failed to upload supporting documents.";
      setError(saveMessage);
      throw new Error(saveMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const submitApplication = async (): Promise<void> => {
    setError("");

    const applicationId = application?.applicationId;

    if (!applicationId) {
      setError("Application not found.");
      return;
    }

    setIsSaving(true);

    try {
      let response: ApplicationDetailResponse;

      if (applicationType === "merchant") {
        response = await submitMerchantApplication(applicationId, declarations);
      } else if (applicationType === "agent") {
        response = await submitAgentApplication(applicationId, declarations);
      } else {
        response = await submitPayerApplication(applicationId, declarations);
      }

      setApplication(response);
      setMessage("Application submitted successfully.");
      setTimeout(() => navigate("/applications/status"), 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit application."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBusinessInfoChange = (
    field: keyof BusinessInfoFormState,
    value: string
  ): void => {
    setBusinessInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrimaryContactChange = (
    field: keyof ContactPerson,
    value: string
  ): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      primaryContact: { ...prev.primaryContact, [field]: value }
    }));
  };

  const handleTransactorChange = (
    index: number,
    field: keyof Transactor,
    value: string
  ): void => {
    setPeopleContacts((prev) => {
      const authorizedTransactors = [...prev.authorizedTransactors];
      authorizedTransactors[index] = {
        ...authorizedTransactors[index],
        [field]: value
      };
      return { ...prev, authorizedTransactors };
    });
  };

  const handleSignatoryChange = (
    index: number,
    field: keyof Transactor,
    value: string | boolean
  ): void => {
    setPeopleContacts((prev) => {
      const signatories = [...(prev.signatories || [{ ...EMPTY_SIGNATORY }])];
      signatories[index] = { ...signatories[index], [field]: value };
      return { ...prev, signatories };
    });
  };

  const handleDirectorChange = (
    index: number,
    field: keyof Transactor,
    value: string | boolean
  ): void => {
    setPeopleContacts((prev) => {
      const directors = [...(prev.directors || [{ ...EMPTY_PERSON }])];
      directors[index] = { ...directors[index], [field]: value };
      return { ...prev, directors };
    });
  };

  const handleAddTransactor = (): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      authorizedTransactors: [...prev.authorizedTransactors, { ...EMPTY_PERSON }]
    }));
  };

  const handleAddSignatory = (): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      signatories: [...(prev.signatories || []), { ...EMPTY_SIGNATORY, isPrimarySignatory: false }]
    }));
  };

  const handleAddDirector = (): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      directors: [...(prev.directors || []), { ...EMPTY_PERSON }]
    }));
  };

  const handleRemoveTransactor = (index: number): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      authorizedTransactors:
        prev.authorizedTransactors.length > 1
          ? prev.authorizedTransactors.filter((_, itemIndex) => itemIndex !== index)
          : [{ ...EMPTY_PERSON }]
    }));
  };

  const handleRemoveSignatory = (index: number): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      signatories:
        (prev.signatories || []).length > 1
          ? (prev.signatories || []).filter((_, itemIndex) => itemIndex !== index)
          : [{ ...EMPTY_SIGNATORY }]
    }));
  };

  const handleRemoveDirector = (index: number): void => {
    setPeopleContacts((prev) => ({
      ...prev,
      directors:
        (prev.directors || []).length > 1
          ? (prev.directors || []).filter((_, itemIndex) => itemIndex !== index)
          : [{ ...EMPTY_PERSON }]
    }));
  };

  const handleBankingDetailsChange = (
    field: keyof BankingDetailsFormState,
    value: string
  ): void => {
    setBankingDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleOperationsChange = (
    field: keyof OperationsFormState,
    value: string
  ): void => {
    setOperations((prev) => ({ ...prev, [field]: value }));
  };

  const handleOutletChange = (
    index: number,
    field: keyof Outlet,
    value: string
  ): void => {
    setOperations((prev) => {
      const outlets = [...(prev.outlets || [])];
      outlets[index] = { ...outlets[index], [field]: value };
      return { ...prev, outlets };
    });
  };

  const handleAddOutlet = (): void => {
    setOperations((prev) => ({
      ...prev,
      outlets: [...(prev.outlets || []), { ...EMPTY_OUTLET }]
    }));
  };

  const handleRemoveOutlet = (index: number): void => {
    setOperations((prev) => ({
      ...prev,
      outlets:
        (prev.outlets || []).length > 1
          ? (prev.outlets || []).filter((_, itemIndex) => itemIndex !== index)
          : [{ ...EMPTY_OUTLET }]
    }));
  };

  const handleDeclarationChange = (
    field: keyof DeclarationFormState,
    value: string | boolean
  ): void => {
    setDeclarations((prev) => ({ ...prev, [field]: value }));
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
      [requirementCode]: (prev[requirementCode] || []).filter(
        (file) => file.name !== fileName
      )
    }));
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
        selectedEntityType &&
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
            onSignatoryChange={handleSignatoryChange}
            onAddSignatory={handleAddSignatory}
            onRemoveSignatory={handleRemoveSignatory}
            onDirectorChange={handleDirectorChange}
            onAddDirector={handleAddDirector}
            onRemoveDirector={handleRemoveDirector}
            isAgent={isAgent}
            isPayer={isPayer}
          />
        </div>
      ),
      isValid: Boolean(
        peopleContacts.primaryContact.fullName &&
          peopleContacts.primaryContact.email &&
          peopleContacts.authorizedTransactors.some(
            (person) => Boolean(person.fullName)
          ) &&
          (isAgent
            ? peopleContacts.directors?.some((person) => Boolean(person.fullName))
            : peopleContacts.signatories?.some((person) => Boolean(person.fullName)))
      ),
      onSave: savePeopleContactsStep
    },
    {
      id: "banking",
      label: "Banking Details",
      content: (
        <div>
          {stepErrors.banking?.message && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">{stepErrors.banking.message}</div>
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
    ...(hasOperationsStep
      ? [
          {
            id: "operations",
            label: isAgent ? "Outlets & Operations" : "Settlement Configuration",
            content: (
              <div>
                {stepErrors.operations?.message && (
                  <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
                    <div className="alert-title">{stepErrors.operations.message}</div>
                  </div>
                )}
                <OperationsStep
                  formData={operations}
                  onOutletChange={handleOutletChange}
                  onAddOutlet={handleAddOutlet}
                  onRemoveOutlet={handleRemoveOutlet}
                  onChange={handleOperationsChange}
                  isAgent={isAgent}
                  isPayer={isPayer}
                />
              </div>
            ),
            isValid: isAgent
              ? operations.outlets.some((outlet) => Boolean(outlet.name))
              : Boolean(operations.settlementMethod),
            onSave: saveOperationsStep
          }
        ]
      : []),
    {
      id: "documents",
      label: "Supporting Documents",
      content: (
        <div>
          {stepErrors.documents?.message && (
            <div className="alert alert--error" style={{ marginBottom: "var(--space-4)" }}>
              <div className="alert-title">{stepErrors.documents.message}</div>
            </div>
          )}
          <DocumentsStep
            requirements={documentRequirements}
            uploadedDocuments={uploadedDocumentsByRequirement}
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
            sectionsCompleted: Math.min(currentStepIndex + 1, totalSections),
            totalSections,
            status: application?.status || "draft"
          }}
          documentsCount={application?.uploadedDocuments.length || 0}
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
          setCurrentStepIndex((prev) => prev + 1);
          setMessage("");
        }
      } catch {
        // Step save handlers already set the relevant UI feedback.
      }
      return;
    }

    if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePreviousStep = (): void => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setError("");
      setMessage("");
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    const currentStep = wizardSteps[currentStepIndex];

    if (!currentStep.onSave || isSaving) {
      return;
    }

    try {
      await currentStep.onSave();
    } catch {
      // Step save handlers already manage the feedback state.
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
          <div className="empty-state-icon">...</div>
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
            onSaveDraft={handleSaveDraft}
            onSubmit={submitApplication}
            isLoading={isSaving}
            canSubmit={
              declarations.acceptedTerms &&
              declarations.certifiedInformation &&
              declarations.authorizedToAct
            }
            showSubmitButton={currentStepIndex === wizardSteps.length - 1}
          />
        </div>
      )}
    </PortalShell>
  );
}

export default OnboardingWizardPage;
