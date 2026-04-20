import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ApplicationDetailResponse,
  ApplicationSectionSummary,
  DocumentRequirementItem,
  MerchantContactPersonPayload,
  MerchantDeclarationPayload,
  MerchantSignatoryPayload,
  MerchantTransactorPayload,
  PayerContactsPayload,
  PayerDraftPayload,
  PayerSettlementPayload,
  UploadedApplicationDocument,
  getActiveApplicationByType,
  getApplication,
  getDocumentRequirements,
  savePayerContacts,
  savePayerDraft,
  savePayerSettlement,
  submitPayerApplication,
  uploadApplicationDocuments
} from "../services/api";
import { PAYER_APPLICATION_STORAGE_KEY } from "../constants/application";

type PayerStepKey =
  | "business_snapshot"
  | "contacts_transactors"
  | "banking_details"
  | "supporting_documents"
  | "declarations_review";

interface PayerBusinessState {
  legalName: string;
  tradingName: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  registrationNumber: string;
  taxNumber: string;
  projectedTransactions: string;
  productsDescription: string;
  serviceCoverage: string;
}

interface PayerContactsState {
  primaryContact: MerchantContactPersonPayload;
  operationsContacts: MerchantTransactorPayload[];
  signatories: MerchantSignatoryPayload[];
}

interface PayerDeclarationState {
  signerName: string;
  signerTitle: string;
  acceptedTerms: boolean;
  certifiedInformation: boolean;
  authorizedToAct: boolean;
}

const PAYER_STEPS: Array<{ key: PayerStepKey; label: string }> = [
  { key: "business_snapshot", label: "Business Snapshot" },
  { key: "contacts_transactors", label: "Billing Contacts" },
  { key: "banking_details", label: "Settlement & Banking" },
  { key: "supporting_documents", label: "Supporting Documents" },
  { key: "declarations_review", label: "Review And Submit" }
];

const defaultBusinessState: PayerBusinessState = {
  legalName: "",
  tradingName: "",
  contactPerson: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  registrationNumber: "",
  taxNumber: "",
  projectedTransactions: "",
  productsDescription: "",
  serviceCoverage: ""
};

const createEmptyPrimaryContact = (): MerchantContactPersonPayload => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  designation: "",
  residentialAddress: ""
});

const createEmptyOperationsContact = (): MerchantTransactorPayload => ({
  fullName: "",
  designation: "",
  email: "",
  phoneNumber: "",
  nationalIdNumber: "",
  residentialAddress: ""
});

const createEmptySignatory = (): MerchantSignatoryPayload => ({
  ...createEmptyOperationsContact(),
  isPrimarySignatory: false
});

const createDefaultContactsState = (): PayerContactsState => ({
  primaryContact: createEmptyPrimaryContact(),
  operationsContacts: [createEmptyOperationsContact()],
  signatories: [createEmptySignatory()]
});

const createDefaultSettlementState = (): PayerSettlementPayload => ({
  accountName: "",
  bankName: "",
  branchName: "",
  branchCode: "",
  accountNumber: "",
  accountType: "Current",
  currency: "USD",
  settlementMethod: "Bank Transfer",
  reconciliationEmail: "",
  integrationNotes: ""
});

const createDefaultDeclarationState = (): PayerDeclarationState => ({
  signerName: "",
  signerTitle: "",
  acceptedTerms: false,
  certifiedInformation: false,
  authorizedToAct: false
});

const humanize = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatDate = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const groupUploadedDocuments = (
  documents: UploadedApplicationDocument[]
): Record<string, UploadedApplicationDocument[]> =>
  documents.reduce<Record<string, UploadedApplicationDocument[]>>(
    (grouped, document) => {
      if (!document.requirementCode) {
        return grouped;
      }

      if (!grouped[document.requirementCode]) {
        grouped[document.requirementCode] = [];
      }

      grouped[document.requirementCode].push(document);
      return grouped;
    },
    {}
  );

const buildBusinessState = (
  application: ApplicationDetailResponse
): PayerBusinessState => ({
  legalName:
    application.businessSnapshot?.legalName || application.organization.legalName,
  tradingName:
    application.businessSnapshot?.tradingName ||
    application.organization.tradingName ||
    "",
  contactPerson: application.businessSnapshot?.contactPerson || "",
  businessEmail:
    application.businessSnapshot?.businessEmail ||
    application.organization.businessEmail ||
    "",
  businessPhone:
    application.businessSnapshot?.businessPhone ||
    application.organization.businessPhone ||
    "",
  businessAddress:
    application.businessSnapshot?.businessAddress ||
    application.organization.businessAddress ||
    "",
  registrationNumber: application.businessSnapshot?.registrationNumber || "",
  taxNumber: application.businessSnapshot?.taxNumber || "",
  projectedTransactions: application.businessSnapshot?.projectedTransactions || "",
  productsDescription: application.businessSnapshot?.productsDescription || "",
  serviceCoverage: application.businessSnapshot?.serviceCoverage || ""
});

const buildContactsState = (
  application: ApplicationDetailResponse
): PayerContactsState => ({
  primaryContact: application.payerContacts?.primaryContact || createEmptyPrimaryContact(),
  operationsContacts:
    application.payerContacts?.operationsContacts.length
      ? application.payerContacts.operationsContacts
      : [createEmptyOperationsContact()],
  signatories:
    application.payerContacts?.signatories.length
      ? application.payerContacts.signatories
      : [createEmptySignatory()]
});

const buildSettlementState = (
  application: ApplicationDetailResponse
): PayerSettlementPayload => ({
  accountName: application.payerSettlement?.accountName || "",
  bankName: application.payerSettlement?.bankName || "",
  branchName: application.payerSettlement?.branchName || "",
  branchCode: application.payerSettlement?.branchCode || "",
  accountNumber: application.payerSettlement?.accountNumber || "",
  accountType: application.payerSettlement?.accountType || "Current",
  currency: application.payerSettlement?.currency || "USD",
  settlementMethod: application.payerSettlement?.settlementMethod || "Bank Transfer",
  reconciliationEmail: application.payerSettlement?.reconciliationEmail || "",
  integrationNotes: application.payerSettlement?.integrationNotes || ""
});

const buildDeclarationState = (
  application: ApplicationDetailResponse
): PayerDeclarationState => ({
  signerName: application.payerDeclaration?.signerName || "",
  signerTitle: application.payerDeclaration?.signerTitle || "",
  acceptedTerms: Boolean(application.payerDeclaration?.acceptedTerms),
  certifiedInformation: Boolean(
    application.payerDeclaration?.certifiedInformation
  ),
  authorizedToAct: Boolean(application.payerDeclaration?.authorizedToAct)
});

const findStepIndex = (step: PayerStepKey): number =>
  PAYER_STEPS.findIndex((item) => item.key === step);

const getPreferredStep = (
  application: ApplicationDetailResponse
): PayerStepKey => {
  const firstIncomplete = application.sections
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find(
      (section) =>
        PAYER_STEPS.some((step) => step.key === section.key as PayerStepKey) &&
        section.status !== "completed"
    );

  if (firstIncomplete?.key) {
    return firstIncomplete.key as PayerStepKey;
  }

  const currentStep = application.currentStep as PayerStepKey | null;

  if (currentStep && PAYER_STEPS.some((step) => step.key === currentStep)) {
    return currentStep;
  }

  return "business_snapshot";
};

function PayerOnboardingForm(): JSX.Element {
  const [businessState, setBusinessState] =
    useState<PayerBusinessState>(defaultBusinessState);
  const [contactState, setContactState] = useState<PayerContactsState>(
    createDefaultContactsState()
  );
  const [settlementState, setSettlementState] =
    useState<PayerSettlementPayload>(createDefaultSettlementState());
  const [declarationState, setDeclarationState] =
    useState<PayerDeclarationState>(createDefaultDeclarationState());
  const [applicationId, setApplicationId] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [sections, setSections] = useState<ApplicationSectionSummary[]>([]);
  const [activeStep, setActiveStep] = useState<PayerStepKey>("business_snapshot");
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState("");
  const [requirements, setRequirements] = useState<DocumentRequirementItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<
    Record<string, UploadedApplicationDocument[]>
  >({});
  const [loadingEntityTypes, setLoadingEntityTypes] = useState(true);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingStep, setSavingStep] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const syncApplicationState = (application: ApplicationDetailResponse): void => {
    setApplicationId(application.applicationId);
    setApplicationStatus(application.status);
    setSections(application.sections);
    setSelectedEntityType(application.organization.entityType);
    setBusinessState(buildBusinessState(application));
    setContactState(buildContactsState(application));
    setSettlementState(buildSettlementState(application));
    setDeclarationState(buildDeclarationState(application));
    setUploadedDocuments(groupUploadedDocuments(application.uploadedDocuments));
    setActiveStep(getPreferredStep(application));
    window.localStorage.setItem(
      PAYER_APPLICATION_STORAGE_KEY,
      application.applicationId
    );
  };

  useEffect(() => {
    const loadEntityTypes = async (): Promise<void> => {
      setLoadingEntityTypes(true);

      try {
        const response = await getDocumentRequirements("payer");
        setEntityTypes(response.availableEntityTypes);
        setSelectedEntityType(
          (current) => current || response.availableEntityTypes[0] || ""
        );
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load payer entity types."
        );
      } finally {
        setLoadingEntityTypes(false);
      }
    };

    void loadEntityTypes();
  }, []);

  useEffect(() => {
    const loadStoredDraft = async (): Promise<void> => {
      const storedApplicationId = window.localStorage.getItem(
        PAYER_APPLICATION_STORAGE_KEY
      );

      try {
        const application = storedApplicationId
          ? await getApplication(storedApplicationId)
          : await getActiveApplicationByType("payer");

        if (!application || application.applicationType !== "payer") {
          setLoadingDraft(false);
          return;
        }

        syncApplicationState(application);
        setMessage("Existing payer / biller draft loaded successfully.");
      } catch (caughtError) {
        window.localStorage.removeItem(PAYER_APPLICATION_STORAGE_KEY);
        setApplicationId("");
        setApplicationStatus("");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the saved payer draft."
        );
      } finally {
        setLoadingDraft(false);
      }
    };

    void loadStoredDraft();
  }, []);

  useEffect(() => {
    if (!selectedEntityType) {
      setRequirements([]);
      return;
    }

    const loadRequirements = async (): Promise<void> => {
      setLoadingRequirements(true);

      try {
        const response = await getDocumentRequirements("payer", selectedEntityType);
        setRequirements(response.requirements);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load payer document requirements."
        );
      } finally {
        setLoadingRequirements(false);
      }
    };

    void loadRequirements();
  }, [selectedEntityType]);

  useEffect(() => {
    setContactState((current) => {
      const hasValues =
        current.primaryContact.fullName ||
        current.primaryContact.email ||
        current.primaryContact.phoneNumber;

      if (hasValues) {
        return current;
      }

      return {
        ...current,
        primaryContact: {
          ...current.primaryContact,
          fullName: businessState.contactPerson,
          email: businessState.businessEmail,
          phoneNumber: businessState.businessPhone
        }
      };
    });
  }, [
    businessState.businessEmail,
    businessState.businessPhone,
    businessState.contactPerson
  ]);

  useEffect(() => {
    setSettlementState((current) => {
      if (current.accountName) {
        return current;
      }

      return {
        ...current,
        accountName: businessState.legalName
      };
    });
  }, [businessState.legalName]);

  useEffect(() => {
    setDeclarationState((current) => {
      if (current.signerName) {
        return current;
      }

      return {
        ...current,
        signerName:
          contactState.primaryContact.fullName || businessState.contactPerson || "",
        signerTitle:
          contactState.primaryContact.designation || current.signerTitle
      };
    });
  }, [
    businessState.contactPerson,
    contactState.primaryContact.designation,
    contactState.primaryContact.fullName
  ]);

  const sectionMap = useMemo(
    () =>
      sections.reduce<Record<string, ApplicationSectionSummary>>(
        (accumulator, section) => ({
          ...accumulator,
          [section.key]: section
        }),
        {}
      ),
    [sections]
  );

  const stagedUploadCount = useMemo(
    () =>
      requirements.filter((requirement) => {
        const files = selectedFiles[requirement.code];
        return Array.isArray(files) && files.length > 0;
      }).length,
    [requirements, selectedFiles]
  );

  const uploadedRequirementCount = useMemo(
    () =>
      requirements.filter((requirement) => {
        const files = uploadedDocuments[requirement.code];
        return Array.isArray(files) && files.length > 0;
      }).length,
    [requirements, uploadedDocuments]
  );

  const requiredRequirements = useMemo(
    () => requirements.filter((requirement) => requirement.isRequired),
    [requirements]
  );

  const uploadedRequiredRequirementCount = useMemo(
    () =>
      requiredRequirements.filter((requirement) => {
        const files = uploadedDocuments[requirement.code];
        return Array.isArray(files) && files.length > 0;
      }).length,
    [requiredRequirements, uploadedDocuments]
  );

  const isSubmitted = applicationStatus === "submitted";
  const currentStepIndex = findStepIndex(activeStep);
  const previousStep =
    currentStepIndex > 0 ? PAYER_STEPS[currentStepIndex - 1].key : null;
  const nextStep =
    currentStepIndex < PAYER_STEPS.length - 1
      ? PAYER_STEPS[currentStepIndex + 1].key
      : null;

  const resetLocalDraft = (): void => {
    window.localStorage.removeItem(PAYER_APPLICATION_STORAGE_KEY);
    setApplicationId("");
    setApplicationStatus("");
    setBusinessState(defaultBusinessState);
    setContactState(createDefaultContactsState());
    setSettlementState(createDefaultSettlementState());
    setDeclarationState(createDefaultDeclarationState());
    setSections([]);
    setUploadedDocuments({});
    setSelectedFiles({});
    setActiveStep("business_snapshot");
    setMessage("Local payer / biller draft reference cleared.");
  };

  const handleBusinessFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setBusinessState((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handlePrimaryContactFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = event.target;
    setContactState((current) => ({
      ...current,
      primaryContact: {
        ...current.primaryContact,
        [name]: value
      }
    }));
  };

  const updateOperationsContactField = (
    index: number,
    field: keyof MerchantTransactorPayload,
    value: string
  ): void => {
    setContactState((current) => ({
      ...current,
      operationsContacts: current.operationsContacts.map((person, itemIndex) =>
        itemIndex === index
          ? {
              ...person,
              [field]: value
            }
          : person
      )
    }));
  };

  const updateSignatoryField = (
    index: number,
    field: keyof MerchantSignatoryPayload,
    value: string | boolean
  ): void => {
    setContactState((current) => ({
      ...current,
      signatories: current.signatories.map((person, itemIndex) =>
        itemIndex === index
          ? {
              ...person,
              [field]: value
            }
          : person
      )
    }));
  };

  const addOperationsContact = (): void => {
    setContactState((current) => ({
      ...current,
      operationsContacts: [
        ...current.operationsContacts,
        createEmptyOperationsContact()
      ]
    }));
  };

  const removeOperationsContact = (index: number): void => {
    setContactState((current) => {
      const nextItems = current.operationsContacts.filter(
        (_item, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        operationsContacts: nextItems.length
          ? nextItems
          : [createEmptyOperationsContact()]
      };
    });
  };

  const addSignatory = (): void => {
    setContactState((current) => ({
      ...current,
      signatories: [...current.signatories, createEmptySignatory()]
    }));
  };

  const removeSignatory = (index: number): void => {
    setContactState((current) => {
      const nextItems = current.signatories.filter(
        (_item, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        signatories: nextItems.length ? nextItems : [createEmptySignatory()]
      };
    });
  };

  const handleSettlementFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setSettlementState((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleDeclarationFieldChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    const { name, type, checked, value } = event.target;
    setDeclarationState((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleFileChange =
    (requirement: DocumentRequirementItem) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = event.target.files ? Array.from(event.target.files) : [];

      setSelectedFiles((current) => ({
        ...current,
        [requirement.code]: files.slice(0, requirement.maxFiles)
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSavingStep(true);
    setError("");
    setMessage("");

    try {
      let response: ApplicationDetailResponse | null = null;

      if (activeStep === "business_snapshot") {
        const payload: PayerDraftPayload = {
          applicationId: applicationId || undefined,
          entityType: selectedEntityType,
          legalName: businessState.legalName.trim(),
          tradingName: businessState.tradingName.trim(),
          contactPerson: businessState.contactPerson.trim(),
          businessEmail: businessState.businessEmail.trim(),
          businessPhone: businessState.businessPhone.trim(),
          businessAddress: businessState.businessAddress.trim(),
          registrationNumber: businessState.registrationNumber.trim(),
          taxNumber: businessState.taxNumber.trim(),
          projectedTransactions: businessState.projectedTransactions.trim(),
          productsDescription: businessState.productsDescription.trim(),
          serviceCoverage: businessState.serviceCoverage.trim()
        };

        response = await savePayerDraft(payload);
        setActiveStep("contacts_transactors");
        setMessage("Payer / biller business snapshot saved.");
      }

      if (activeStep === "contacts_transactors") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(PAYER_APPLICATION_STORAGE_KEY) ||
          "";

        if (!nextApplicationId) {
          throw new Error("Save the business snapshot before continuing.");
        }

        const payload: PayerContactsPayload = {
          primaryContact: {
            fullName: contactState.primaryContact.fullName.trim(),
            email: contactState.primaryContact.email.trim(),
            phoneNumber: contactState.primaryContact.phoneNumber.trim(),
            designation: contactState.primaryContact.designation?.trim(),
            residentialAddress: contactState.primaryContact.residentialAddress?.trim()
          },
          operationsContacts: contactState.operationsContacts.map((person) => ({
            fullName: person.fullName.trim(),
            designation: person.designation?.trim(),
            email: person.email?.trim(),
            phoneNumber: person.phoneNumber?.trim(),
            nationalIdNumber: person.nationalIdNumber?.trim(),
            residentialAddress: person.residentialAddress?.trim()
          })),
          signatories: contactState.signatories.map((person) => ({
            fullName: person.fullName.trim(),
            designation: person.designation?.trim(),
            email: person.email?.trim(),
            phoneNumber: person.phoneNumber?.trim(),
            nationalIdNumber: person.nationalIdNumber?.trim(),
            residentialAddress: person.residentialAddress?.trim(),
            isPrimarySignatory: Boolean(person.isPrimarySignatory)
          }))
        };

        response = await savePayerContacts(nextApplicationId, payload);
        setActiveStep("banking_details");
        setMessage("Billing contacts and signatories saved.");
      }

      if (activeStep === "banking_details") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(PAYER_APPLICATION_STORAGE_KEY) ||
          "";

        if (!nextApplicationId) {
          throw new Error("Save the earlier sections before continuing.");
        }

        const payload: PayerSettlementPayload = {
          accountName: settlementState.accountName.trim(),
          bankName: settlementState.bankName.trim(),
          branchName: settlementState.branchName?.trim(),
          branchCode: settlementState.branchCode?.trim(),
          accountNumber: settlementState.accountNumber.trim(),
          accountType: settlementState.accountType?.trim(),
          currency: settlementState.currency?.trim().toUpperCase(),
          settlementMethod: settlementState.settlementMethod?.trim(),
          reconciliationEmail: settlementState.reconciliationEmail?.trim(),
          integrationNotes: settlementState.integrationNotes?.trim()
        };

        response = await savePayerSettlement(nextApplicationId, payload);
        setActiveStep("supporting_documents");
        setMessage("Settlement and banking details saved.");
      }

      if (activeStep === "supporting_documents") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(PAYER_APPLICATION_STORAGE_KEY) ||
          "";

        if (!nextApplicationId) {
          throw new Error("Save the earlier sections before uploading documents.");
        }

        let latestResponse: ApplicationDetailResponse | null = null;

        for (const requirement of requirements) {
          const files = selectedFiles[requirement.code];

          if (files && files.length > 0) {
            latestResponse = await uploadApplicationDocuments(
              nextApplicationId,
              requirement.code,
              files
            );
          }
        }

        if (!latestResponse) {
          throw new Error("Choose at least one file before saving documents.");
        }

        response = latestResponse;
        setSelectedFiles({});
        setActiveStep("declarations_review");
        setMessage("Payer / biller supporting documents uploaded.");
      }

      if (activeStep === "declarations_review") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(PAYER_APPLICATION_STORAGE_KEY) ||
          "";

        if (!nextApplicationId) {
          throw new Error("Save the earlier sections before submitting.");
        }

        const payload: MerchantDeclarationPayload = {
          signerName: declarationState.signerName.trim(),
          signerTitle: declarationState.signerTitle.trim(),
          acceptedTerms: declarationState.acceptedTerms,
          certifiedInformation: declarationState.certifiedInformation,
          authorizedToAct: declarationState.authorizedToAct
        };

        response = await submitPayerApplication(nextApplicationId, payload);
        setMessage("Payer / biller application submitted for internal review.");
      }

      if (response) {
        syncApplicationState(response);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the current payer step."
      );
    } finally {
      setSavingStep(false);
    }
  };

  if (loadingDraft || loadingEntityTypes) {
    return (
      <div className="empty-state">
        <strong>Loading payer workspace...</strong>
        <span>Preparing your payer / biller draft, sections, and document rules.</span>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <h2>Biller / Payer Application</h2>
          <p className="panel-header__copy">
            Complete payer onboarding in guided steps: business details, contacts,
            settlement setup, required documents, and final declaration.
          </p>
          {applicationStatus === "needs_more_information" ? (
            <p className="feedback feedback--warning">
              This application was returned for corrections. Review the notes on{" "}
              <Link
                to={
                  applicationId
                    ? `/applications/${applicationId}/status`
                    : "/applications/status"
                }
              >
                the status page
              </Link>{" "}
              and then update the requested sections in this form.
            </p>
          ) : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
          {message ? <p className="feedback feedback--success">{message}</p> : null}
        </div>

        <div className="panel-header__summary">
          <span>Application</span>
          <strong>{applicationId ? "Live" : "New"}</strong>
          <span>
            {applicationStatus ? humanize(applicationStatus) : "Draft not created yet"}
          </span>
        </div>
      </div>

      <div className="stepper">
        {PAYER_STEPS.map((step) => {
          const section = sectionMap[step.key];

          return (
            <button
              key={step.key}
              type="button"
              className={`stepper__item${
                activeStep === step.key ? " stepper__item--active" : ""
              }`}
              onClick={() => setActiveStep(step.key)}
            >
              <span className="stepper__index">{findStepIndex(step.key) + 1}</span>
              <span className="stepper__label">{step.label}</span>
              <span className="stepper__copy">
                {section?.status ? humanize(section.status) : "Not started"}
              </span>
            </button>
          );
        })}
      </div>

      {activeStep === "business_snapshot" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Business Snapshot</h3>
              <p>
                Start with the legal business identity, settlement footprint, and
                billing use case for this payer / biller relationship.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Entity Type</span>
              <select
                value={selectedEntityType}
                onChange={(event) => setSelectedEntityType(event.target.value)}
              >
                {entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {humanize(entityType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Legal Name</span>
              <input
                name="legalName"
                value={businessState.legalName}
                onChange={handleBusinessFieldChange}
                placeholder="Enter legal business name"
              />
            </label>

            <label className="field">
              <span>Trading Name</span>
              <input
                name="tradingName"
                value={businessState.tradingName}
                onChange={handleBusinessFieldChange}
                placeholder="Enter trading name if different"
              />
            </label>

            <label className="field">
              <span>Primary Contact Person</span>
              <input
                name="contactPerson"
                value={businessState.contactPerson}
                onChange={handleBusinessFieldChange}
                placeholder="Enter billing contact name"
              />
            </label>

            <label className="field">
              <span>Business Email</span>
              <input
                name="businessEmail"
                type="email"
                value={businessState.businessEmail}
                onChange={handleBusinessFieldChange}
                placeholder="Enter business email"
              />
            </label>

            <label className="field">
              <span>Business Phone</span>
              <input
                name="businessPhone"
                value={businessState.businessPhone}
                onChange={handleBusinessFieldChange}
                placeholder="Enter business phone number"
              />
            </label>

            <label className="field field--wide">
              <span>Business Address</span>
              <textarea
                name="businessAddress"
                value={businessState.businessAddress}
                onChange={handleBusinessFieldChange}
                placeholder="Enter registered business address"
              />
            </label>

            <label className="field">
              <span>Registration Number</span>
              <input
                name="registrationNumber"
                value={businessState.registrationNumber}
                onChange={handleBusinessFieldChange}
                placeholder="Enter registration number"
              />
            </label>

            <label className="field">
              <span>Tax Number</span>
              <input
                name="taxNumber"
                value={businessState.taxNumber}
                onChange={handleBusinessFieldChange}
                placeholder="Enter tax reference"
              />
            </label>

            <label className="field">
              <span>Expected Payment Volume</span>
              <input
                name="projectedTransactions"
                value={businessState.projectedTransactions}
                onChange={handleBusinessFieldChange}
                placeholder="e.g. 3,500 collections / month"
              />
            </label>

            <label className="field">
              <span>Settlement Scope / Channels</span>
              <input
                name="serviceCoverage"
                value={businessState.serviceCoverage}
                onChange={handleBusinessFieldChange}
                placeholder="e.g. merchant collections, subscriptions, bulk payouts"
              />
            </label>

            <label className="field field--wide">
              <span>Billing Use Case</span>
              <textarea
                name="productsDescription"
                value={businessState.productsDescription}
                onChange={handleBusinessFieldChange}
                placeholder="Describe the payment service, billing model, or collection use case."
              />
            </label>
          </div>
        </section>
      ) : null}

      {activeStep === "contacts_transactors" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Billing Contacts & Signatories</h3>
              <p>
                Capture the day-to-day billing contacts plus the signatories who
                can authorize this payer / biller relationship.
              </p>
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Primary Billing Contact</h4>
                <p>This is the main person Omari will reach for onboarding and settlement queries.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Full Name</span>
                <input
                  name="fullName"
                  value={contactState.primaryContact.fullName}
                  onChange={handlePrimaryContactFieldChange}
                  placeholder="Enter full name"
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={contactState.primaryContact.email}
                  onChange={handlePrimaryContactFieldChange}
                  placeholder="Enter email address"
                />
              </label>

              <label className="field">
                <span>Phone Number</span>
                <input
                  name="phoneNumber"
                  value={contactState.primaryContact.phoneNumber}
                  onChange={handlePrimaryContactFieldChange}
                  placeholder="Enter phone number"
                />
              </label>

              <label className="field">
                <span>Designation</span>
                <input
                  name="designation"
                  value={contactState.primaryContact.designation || ""}
                  onChange={handlePrimaryContactFieldChange}
                  placeholder="Enter role or designation"
                />
              </label>

              <label className="field field--wide">
                <span>Residential Address</span>
                <textarea
                  name="residentialAddress"
                  value={contactState.primaryContact.residentialAddress || ""}
                  onChange={handlePrimaryContactFieldChange}
                  placeholder="Enter residential address"
                />
              </label>
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Operations Contacts</h4>
                <p>Add the people responsible for reconciliations, finance operations, or technical support.</p>
              </div>
              <button
                type="button"
                className="button button--ghost"
                onClick={addOperationsContact}
              >
                Add Contact
              </button>
            </div>

            <div className="stacked-list">
              {contactState.operationsContacts.map((person, index) => (
                <article
                  className="subsection-card subsection-card--nested"
                  key={`operations-contact-${index}`}
                >
                  <div className="subsection-card__header">
                    <div>
                      <h4>Operations Contact {index + 1}</h4>
                    </div>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => removeOperationsContact(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Full Name</span>
                      <input
                        value={person.fullName || ""}
                        onChange={(event) =>
                          updateOperationsContactField(
                            index,
                            "fullName",
                            event.target.value
                          )
                        }
                        placeholder="Enter full name"
                      />
                    </label>

                    <label className="field">
                      <span>Designation</span>
                      <input
                        value={person.designation || ""}
                        onChange={(event) =>
                          updateOperationsContactField(
                            index,
                            "designation",
                            event.target.value
                          )
                        }
                        placeholder="Enter role"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={person.email || ""}
                        onChange={(event) =>
                          updateOperationsContactField(index, "email", event.target.value)
                        }
                        placeholder="Enter email address"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={person.phoneNumber || ""}
                        onChange={(event) =>
                          updateOperationsContactField(
                            index,
                            "phoneNumber",
                            event.target.value
                          )
                        }
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="field">
                      <span>National ID</span>
                      <input
                        value={person.nationalIdNumber || ""}
                        onChange={(event) =>
                          updateOperationsContactField(
                            index,
                            "nationalIdNumber",
                            event.target.value
                          )
                        }
                        placeholder="Enter ID number"
                      />
                    </label>

                    <label className="field field--wide">
                      <span>Residential Address</span>
                      <textarea
                        value={person.residentialAddress || ""}
                        onChange={(event) =>
                          updateOperationsContactField(
                            index,
                            "residentialAddress",
                            event.target.value
                          )
                        }
                        placeholder="Enter residential address"
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Signatories</h4>
                <p>List the people who can formally sign off on the agreement and payout instructions.</p>
              </div>
              <button type="button" className="button button--ghost" onClick={addSignatory}>
                Add Signatory
              </button>
            </div>

            <div className="stacked-list">
              {contactState.signatories.map((person, index) => (
                <article
                  className="subsection-card subsection-card--nested"
                  key={`signatory-${index}`}
                >
                  <div className="subsection-card__header">
                    <div>
                      <h4>Signatory {index + 1}</h4>
                    </div>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => removeSignatory(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Full Name</span>
                      <input
                        value={person.fullName || ""}
                        onChange={(event) =>
                          updateSignatoryField(index, "fullName", event.target.value)
                        }
                        placeholder="Enter full name"
                      />
                    </label>

                    <label className="field">
                      <span>Designation</span>
                      <input
                        value={person.designation || ""}
                        onChange={(event) =>
                          updateSignatoryField(index, "designation", event.target.value)
                        }
                        placeholder="Enter role"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={person.email || ""}
                        onChange={(event) =>
                          updateSignatoryField(index, "email", event.target.value)
                        }
                        placeholder="Enter email address"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={person.phoneNumber || ""}
                        onChange={(event) =>
                          updateSignatoryField(index, "phoneNumber", event.target.value)
                        }
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="field">
                      <span>National ID</span>
                      <input
                        value={person.nationalIdNumber || ""}
                        onChange={(event) =>
                          updateSignatoryField(
                            index,
                            "nationalIdNumber",
                            event.target.value
                          )
                        }
                        placeholder="Enter ID number"
                      />
                    </label>

                    <label className="field field--wide">
                      <span>Residential Address</span>
                      <textarea
                        value={person.residentialAddress || ""}
                        onChange={(event) =>
                          updateSignatoryField(
                            index,
                            "residentialAddress",
                            event.target.value
                          )
                        }
                        placeholder="Enter residential address"
                      />
                    </label>
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(person.isPrimarySignatory)}
                      onChange={(event) =>
                        updateSignatoryField(
                          index,
                          "isPrimarySignatory",
                          event.target.checked
                        )
                      }
                    />
                    <span>Mark as primary signatory</span>
                  </label>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeStep === "banking_details" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Settlement & Banking</h3>
              <p>
                Capture the settlement method, payout account, and reconciliation
                contacts for the payer / biller setup.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Account Name</span>
              <input
                name="accountName"
                value={settlementState.accountName}
                onChange={handleSettlementFieldChange}
                placeholder="Enter settlement account name"
              />
            </label>

            <label className="field">
              <span>Bank Name</span>
              <input
                name="bankName"
                value={settlementState.bankName}
                onChange={handleSettlementFieldChange}
                placeholder="Enter bank name"
              />
            </label>

            <label className="field">
              <span>Branch Name</span>
              <input
                name="branchName"
                value={settlementState.branchName || ""}
                onChange={handleSettlementFieldChange}
                placeholder="Enter branch name"
              />
            </label>

            <label className="field">
              <span>Branch Code</span>
              <input
                name="branchCode"
                value={settlementState.branchCode || ""}
                onChange={handleSettlementFieldChange}
                placeholder="Enter branch code"
              />
            </label>

            <label className="field">
              <span>Account Number</span>
              <input
                name="accountNumber"
                value={settlementState.accountNumber}
                onChange={handleSettlementFieldChange}
                placeholder="Enter account number"
              />
            </label>

            <label className="field">
              <span>Account Type</span>
              <select
                name="accountType"
                value={settlementState.accountType || "Current"}
                onChange={handleSettlementFieldChange}
              >
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Business">Business</option>
                <option value="Corporate">Corporate</option>
              </select>
            </label>

            <label className="field">
              <span>Currency</span>
              <select
                name="currency"
                value={settlementState.currency || "USD"}
                onChange={handleSettlementFieldChange}
              >
                <option value="USD">USD</option>
                <option value="ZWG">ZWG</option>
                <option value="ZAR">ZAR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>

            <label className="field">
              <span>Settlement Method</span>
              <select
                name="settlementMethod"
                value={settlementState.settlementMethod || "Bank Transfer"}
                onChange={handleSettlementFieldChange}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Wallet Settlement">Wallet Settlement</option>
                <option value="Bulk Payout">Bulk Payout</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </label>

            <label className="field field--wide">
              <span>Reconciliation Email</span>
              <input
                name="reconciliationEmail"
                type="email"
                value={settlementState.reconciliationEmail || ""}
                onChange={handleSettlementFieldChange}
                placeholder="Enter reconciliation or finance email"
              />
            </label>

            <label className="field field--wide">
              <span>Integration / Settlement Notes</span>
              <textarea
                name="integrationNotes"
                value={settlementState.integrationNotes || ""}
                onChange={handleSettlementFieldChange}
                placeholder="Record any special settlement instructions, batch timing, or integration notes."
              />
            </label>
          </div>
        </section>
      ) : null}

      {activeStep === "supporting_documents" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Document Checklist</h3>
              <p>
                These requirements are loaded from the database for the selected
                payer / biller entity type.
              </p>
            </div>
            <span className="status-chip status-chip--soft">
              {uploadedRequirementCount}/{requirements.length} uploaded
            </span>
          </div>

          {loadingRequirements ? (
            <div className="empty-state">
              <strong>Loading requirements...</strong>
              <span>The payer document checklist is being prepared.</span>
            </div>
          ) : null}

          {!loadingRequirements && requirements.length > 0 ? (
            <div className="requirement-list">
              {requirements.map((requirement) => {
                const files = selectedFiles[requirement.code] || [];
                const uploadedFiles = uploadedDocuments[requirement.code] || [];
                const acceptedExtensions = requirement.allowedExtensions
                  .map((extension) => `.${extension}`)
                  .join(",");

                return (
                  <article className="requirement-card" key={requirement.code}>
                    <div className="requirement-card__header">
                      <div>
                        <h4>{requirement.label}</h4>
                        <p>
                          {requirement.description ||
                            "Upload the required payer support document."}
                        </p>
                      </div>
                      <span
                        className={`status-chip${
                          requirement.isRequired ? " status-chip--alert" : ""
                        }`}
                      >
                        {requirement.isRequired ? "Required" : "Optional"}
                      </span>
                    </div>

                    <div className="requirement-card__meta">
                      <span>Formats: {requirement.allowedExtensions.join(", ")}</span>
                      <span>Max files: {requirement.maxFiles}</span>
                    </div>

                    <label className="upload-slot">
                      <input
                        type="file"
                        accept={acceptedExtensions}
                        multiple={requirement.maxFiles > 1}
                        onChange={handleFileChange(requirement)}
                      />
                      <span className="upload-slot__title">
                        {files.length > 0
                          ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                          : "Choose supporting file"}
                      </span>
                      <span className="upload-slot__hint">
                        PDF, JPG, or PNG files. Save this step to upload the
                        selected files into the payer record.
                      </span>
                    </label>

                    {files.length > 0 ? (
                      <>
                        <p className="requirement-card__subheading">Ready to upload</p>
                        <ul className="file-pill-list">
                          {files.map((file) => (
                            <li key={`${requirement.code}-${file.name}`}>
                              <span className="file-pill">{file.name}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}

                    {uploadedFiles.length > 0 ? (
                      <>
                        <p className="requirement-card__subheading">Uploaded to draft</p>
                        <ul className="file-pill-list">
                          {uploadedFiles.map((file) => (
                            <li key={file.id}>
                              <span className="file-pill file-pill--uploaded">
                                {file.originalFileName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeStep === "declarations_review" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Declarations & Review</h3>
              <p>
                Review the payer profile, confirm the declarations, and submit the
                application once all required sections and documents are complete.
              </p>
            </div>
            <span className="status-chip status-chip--soft">
              {isSubmitted ? "Submitted" : "Ready to submit"}
            </span>
          </div>

          <div className="review-grid">
            <article className="review-card">
              <h4>Business Snapshot</h4>
              <dl className="detail-list">
                <div>
                  <dt>Business name</dt>
                  <dd>{businessState.legalName || "-"}</dd>
                </div>
                <div>
                  <dt>Entity type</dt>
                  <dd>{humanize(selectedEntityType || "-")}</dd>
                </div>
                <div>
                  <dt>Registration number</dt>
                  <dd>{businessState.registrationNumber || "-"}</dd>
                </div>
                <div>
                  <dt>Expected payment volume</dt>
                  <dd>{businessState.projectedTransactions || "-"}</dd>
                </div>
              </dl>
            </article>

            <article className="review-card">
              <h4>Participants</h4>
              <dl className="detail-list">
                <div>
                  <dt>Primary contact</dt>
                  <dd>{contactState.primaryContact.fullName || "-"}</dd>
                </div>
                <div>
                  <dt>Operations contacts</dt>
                  <dd>{contactState.operationsContacts.length}</dd>
                </div>
                <div>
                  <dt>Signatories</dt>
                  <dd>{contactState.signatories.length}</dd>
                </div>
                <div>
                  <dt>Settlement scope</dt>
                  <dd>{businessState.serviceCoverage || "-"}</dd>
                </div>
              </dl>
            </article>

            <article className="review-card">
              <h4>Settlement</h4>
              <dl className="detail-list">
                <div>
                  <dt>Settlement account</dt>
                  <dd>{settlementState.accountName || "-"}</dd>
                </div>
                <div>
                  <dt>Bank</dt>
                  <dd>{settlementState.bankName || "-"}</dd>
                </div>
                <div>
                  <dt>Settlement method</dt>
                  <dd>{settlementState.settlementMethod || "-"}</dd>
                </div>
                <div>
                  <dt>Reconciliation email</dt>
                  <dd>{settlementState.reconciliationEmail || "-"}</dd>
                </div>
              </dl>
            </article>

            <article className="review-card">
              <h4>Supporting Documents</h4>
              <dl className="detail-list">
                <div>
                  <dt>Uploaded document groups</dt>
                  <dd>{uploadedRequirementCount}</dd>
                </div>
                <div>
                  <dt>Required groups complete</dt>
                  <dd>
                    {uploadedRequiredRequirementCount}/{requiredRequirements.length}
                  </dd>
                </div>
                <div>
                  <dt>Application status</dt>
                  <dd>{humanize(applicationStatus || "draft")}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Applicant Declarations</h4>
                <p>
                  The named signatory confirms the payer information and accepts
                  the Omari onboarding and settlement terms.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Signer Name</span>
                <input
                  name="signerName"
                  value={declarationState.signerName}
                  onChange={handleDeclarationFieldChange}
                  placeholder="Enter signer's full name"
                  disabled={isSubmitted}
                />
              </label>

              <label className="field">
                <span>Signer Title</span>
                <input
                  name="signerTitle"
                  value={declarationState.signerTitle}
                  onChange={handleDeclarationFieldChange}
                  placeholder="Enter signer's role"
                  disabled={isSubmitted}
                />
              </label>
            </div>

            <div className="checklist">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="acceptedTerms"
                  checked={declarationState.acceptedTerms}
                  onChange={handleDeclarationFieldChange}
                  disabled={isSubmitted}
                />
                <span>I accept the Omari payer / biller terms and settlement conditions.</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="certifiedInformation"
                  checked={declarationState.certifiedInformation}
                  onChange={handleDeclarationFieldChange}
                  disabled={isSubmitted}
                />
                <span>I certify that the information and uploaded documents are accurate.</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="authorizedToAct"
                  checked={declarationState.authorizedToAct}
                  onChange={handleDeclarationFieldChange}
                  disabled={isSubmitted}
                />
                <span>I am authorized to submit this payer / biller application on behalf of the business.</span>
              </label>
            </div>

            {isSubmitted ? (
              <div className="submit-banner">
                This application has already been submitted and is now in the
                internal review queue.
              </div>
            ) : null}
          </div>

          <div className="panel-header__meta">
            {applicationId
              ? `Last active application ID: ${applicationId}`
              : "No live draft yet"}
          </div>
        </section>
      ) : null}

      <div className="form-actions form-actions--split">
        <div className="form-actions__group">
          {previousStep ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setActiveStep(previousStep)}
            >
              Back
            </button>
          ) : null}

          {nextStep ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setActiveStep(nextStep)}
            >
              Continue
            </button>
          ) : null}
        </div>

        <div className="form-actions__group">
          <button type="button" className="button button--ghost" onClick={resetLocalDraft}>
            Reset Local Draft Pointer
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={savingStep || isSubmitted}
          >
            {savingStep
              ? "Saving..."
              : isSubmitted
                ? "Already Submitted"
                : activeStep === "business_snapshot"
                  ? "Save And Continue"
                  : activeStep === "contacts_transactors"
                    ? "Save Billing Contacts"
                    : activeStep === "banking_details"
                      ? "Save Settlement Step"
                      : activeStep === "declarations_review"
                        ? "Submit For Internal Review"
                        : `Save Document Step${stagedUploadCount > 0 ? " And Upload" : ""}`}
          </button>
        </div>
      </div>
    </form>
  );
}

export default PayerOnboardingForm;
