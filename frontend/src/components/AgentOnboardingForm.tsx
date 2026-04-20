import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AgentContactsPayload,
  AgentDirectorPayload,
  AgentDraftPayload,
  AgentOperationsPayload,
  AgentOutletPayload,
  ApplicationDetailResponse,
  ApplicationSectionSummary,
  DocumentRequirementItem,
  MerchantContactPersonPayload,
  MerchantDeclarationPayload,
  MerchantTransactorPayload,
  UploadedApplicationDocument,
  getActiveApplicationByType,
  getApplication,
  getDocumentRequirements,
  saveAgentContacts,
  saveAgentDraft,
  saveAgentOperations,
  submitAgentApplication,
  uploadApplicationDocuments
} from "../services/api";
import { AGENT_APPLICATION_STORAGE_KEY } from "../constants/application";

type AgentStepKey =
  | "business_snapshot"
  | "contacts_transactors"
  | "banking_details"
  | "supporting_documents"
  | "declarations_review";

interface AgentBusinessState {
  legalName: string;
  tradingName: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  registrationNumber: string;
  taxNumber: string;
  yearsInOperation: string;
  serviceCoverage: string;
  outletCountEstimate: string;
  complianceContact: string;
}

interface AgentContactsState {
  primaryContact: MerchantContactPersonPayload;
  authorizedTransactors: MerchantTransactorPayload[];
  directors: AgentDirectorPayload[];
}

interface AgentOperationsState {
  accountName: string;
  bankName: string;
  branchName: string;
  branchCode: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  outlets: AgentOutletPayload[];
}

interface AgentDeclarationState {
  signerName: string;
  signerTitle: string;
  acceptedTerms: boolean;
  certifiedInformation: boolean;
  authorizedToAct: boolean;
}

const AGENT_STEPS: Array<{ key: AgentStepKey; label: string }> = [
  { key: "business_snapshot", label: "Business Snapshot" },
  { key: "contacts_transactors", label: "Directors & Transactors" },
  { key: "banking_details", label: "Outlets & Banking" },
  { key: "supporting_documents", label: "Supporting Documents" },
  { key: "declarations_review", label: "Review And Submit" }
];

const defaultBusinessState: AgentBusinessState = {
  legalName: "",
  tradingName: "",
  contactPerson: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  registrationNumber: "",
  taxNumber: "",
  yearsInOperation: "",
  serviceCoverage: "",
  outletCountEstimate: "",
  complianceContact: ""
};

const createEmptyPrimaryContact = (): MerchantContactPersonPayload => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  designation: "",
  residentialAddress: ""
});

const createEmptyTransactor = (): MerchantTransactorPayload => ({
  fullName: "",
  designation: "",
  email: "",
  phoneNumber: "",
  nationalIdNumber: "",
  residentialAddress: ""
});

const createEmptyDirector = (): AgentDirectorPayload => ({
  ...createEmptyTransactor(),
  isPrimaryDirector: false
});

const createEmptyOutlet = (): AgentOutletPayload => ({
  name: "",
  code: "",
  phoneNumber: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  country: "Zimbabwe"
});

const createDefaultContactState = (): AgentContactsState => ({
  primaryContact: createEmptyPrimaryContact(),
  authorizedTransactors: [createEmptyTransactor()],
  directors: [createEmptyDirector()]
});

const createDefaultOperationsState = (): AgentOperationsState => ({
  accountName: "",
  bankName: "",
  branchName: "",
  branchCode: "",
  accountNumber: "",
  accountType: "Current",
  currency: "USD",
  outlets: [createEmptyOutlet()]
});

const createDefaultDeclarationState = (): AgentDeclarationState => ({
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
): AgentBusinessState => ({
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
  yearsInOperation: application.businessSnapshot?.yearsInOperation || "",
  serviceCoverage: application.businessSnapshot?.serviceCoverage || "",
  outletCountEstimate: application.businessSnapshot?.outletCountEstimate || "",
  complianceContact: application.businessSnapshot?.complianceContact || ""
});

const buildContactState = (
  application: ApplicationDetailResponse
): AgentContactsState => ({
  primaryContact: application.agentContacts?.primaryContact || createEmptyPrimaryContact(),
  authorizedTransactors:
    application.agentContacts?.authorizedTransactors.length
      ? application.agentContacts.authorizedTransactors
      : [createEmptyTransactor()],
  directors:
    application.agentContacts?.directors.length
      ? application.agentContacts.directors
      : [createEmptyDirector()]
});

const buildOperationsState = (
  application: ApplicationDetailResponse
): AgentOperationsState => ({
  accountName: application.agentOperations?.accountName || "",
  bankName: application.agentOperations?.bankName || "",
  branchName: application.agentOperations?.branchName || "",
  branchCode: application.agentOperations?.branchCode || "",
  accountNumber: application.agentOperations?.accountNumber || "",
  accountType: application.agentOperations?.accountType || "Current",
  currency: application.agentOperations?.currency || "USD",
  outlets:
    application.agentOperations?.outlets.length
      ? application.agentOperations.outlets
      : [createEmptyOutlet()]
});

const buildDeclarationState = (
  application: ApplicationDetailResponse
): AgentDeclarationState => ({
  signerName: application.agentDeclaration?.signerName || "",
  signerTitle: application.agentDeclaration?.signerTitle || "",
  acceptedTerms: Boolean(application.agentDeclaration?.acceptedTerms),
  certifiedInformation: Boolean(
    application.agentDeclaration?.certifiedInformation
  ),
  authorizedToAct: Boolean(application.agentDeclaration?.authorizedToAct)
});

const findStepIndex = (step: AgentStepKey): number =>
  AGENT_STEPS.findIndex((item) => item.key === step);

const getPreferredStep = (
  application: ApplicationDetailResponse
): AgentStepKey => {
  const firstIncomplete = application.sections
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find(
      (section) =>
        AGENT_STEPS.some((step) => step.key === section.key as AgentStepKey) &&
        section.status !== "completed"
    );

  if (firstIncomplete?.key) {
    return firstIncomplete.key as AgentStepKey;
  }

  const currentStep = application.currentStep as AgentStepKey | null;

  if (currentStep && AGENT_STEPS.some((step) => step.key === currentStep)) {
    return currentStep;
  }

  return "business_snapshot";
};

function AgentOnboardingForm(): JSX.Element {
  const [businessState, setBusinessState] =
    useState<AgentBusinessState>(defaultBusinessState);
  const [contactState, setContactState] = useState<AgentContactsState>(
    createDefaultContactState()
  );
  const [operationsState, setOperationsState] =
    useState<AgentOperationsState>(createDefaultOperationsState());
  const [declarationState, setDeclarationState] =
    useState<AgentDeclarationState>(createDefaultDeclarationState());
  const [applicationId, setApplicationId] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [sections, setSections] = useState<ApplicationSectionSummary[]>([]);
  const [activeStep, setActiveStep] = useState<AgentStepKey>("business_snapshot");
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
    setContactState(buildContactState(application));
    setOperationsState(buildOperationsState(application));
    setDeclarationState(buildDeclarationState(application));
    setUploadedDocuments(groupUploadedDocuments(application.uploadedDocuments));
    setActiveStep(getPreferredStep(application));
    window.localStorage.setItem(
      AGENT_APPLICATION_STORAGE_KEY,
      application.applicationId
    );
  };

  useEffect(() => {
    const loadEntityTypes = async (): Promise<void> => {
      setLoadingEntityTypes(true);

      try {
        const response = await getDocumentRequirements("agent");
        setEntityTypes(response.availableEntityTypes);
        setSelectedEntityType(
          (current) => current || response.availableEntityTypes[0] || ""
        );
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load agent entity types."
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
        AGENT_APPLICATION_STORAGE_KEY
      );

      try {
        const application = storedApplicationId
          ? await getApplication(storedApplicationId)
          : await getActiveApplicationByType("agent");

        if (!application) {
          setLoadingDraft(false);
          return;
        }

        if (application.applicationType !== "agent") {
          setLoadingDraft(false);
          return;
        }

        syncApplicationState(application);
        setMessage("Existing agent draft loaded successfully.");
      } catch (caughtError) {
        window.localStorage.removeItem(AGENT_APPLICATION_STORAGE_KEY);
        setApplicationId("");
        setApplicationStatus("");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the saved agent draft."
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
        const response = await getDocumentRequirements("agent", selectedEntityType);
        setRequirements(response.requirements);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load agent document requirements."
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
    setOperationsState((current) => {
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
    currentStepIndex > 0 ? AGENT_STEPS[currentStepIndex - 1].key : null;
  const nextStep =
    currentStepIndex < AGENT_STEPS.length - 1
      ? AGENT_STEPS[currentStepIndex + 1].key
      : null;

  const resetLocalDraft = (): void => {
    window.localStorage.removeItem(AGENT_APPLICATION_STORAGE_KEY);
    setApplicationId("");
    setApplicationStatus("");
    setBusinessState(defaultBusinessState);
    setContactState(createDefaultContactState());
    setOperationsState(createDefaultOperationsState());
    setDeclarationState(createDefaultDeclarationState());
    setSections([]);
    setUploadedDocuments({});
    setSelectedFiles({});
    setActiveStep("business_snapshot");
    setMessage("Local agent draft reference cleared.");
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

  const updateTransactorField = (
    index: number,
    field: keyof MerchantTransactorPayload,
    value: string
  ): void => {
    setContactState((current) => ({
      ...current,
      authorizedTransactors: current.authorizedTransactors.map((person, itemIndex) =>
        itemIndex === index
          ? {
              ...person,
              [field]: value
            }
          : person
      )
    }));
  };

  const updateDirectorField = (
    index: number,
    field: keyof AgentDirectorPayload,
    value: string | boolean
  ): void => {
    setContactState((current) => ({
      ...current,
      directors: current.directors.map((person, itemIndex) =>
        itemIndex === index
          ? {
              ...person,
              [field]: value
            }
          : person
      )
    }));
  };

  const addTransactor = (): void => {
    setContactState((current) => ({
      ...current,
      authorizedTransactors: [...current.authorizedTransactors, createEmptyTransactor()]
    }));
  };

  const removeTransactor = (index: number): void => {
    setContactState((current) => {
      const nextItems = current.authorizedTransactors.filter(
        (_item, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        authorizedTransactors: nextItems.length ? nextItems : [createEmptyTransactor()]
      };
    });
  };

  const addDirector = (): void => {
    setContactState((current) => ({
      ...current,
      directors: [...current.directors, createEmptyDirector()]
    }));
  };

  const removeDirector = (index: number): void => {
    setContactState((current) => {
      const nextItems = current.directors.filter(
        (_item, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        directors: nextItems.length ? nextItems : [createEmptyDirector()]
      };
    });
  };

  const handleOperationsFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setOperationsState((current) => ({
      ...current,
      [name]: value
    }));
  };

  const updateOutletField = (
    index: number,
    field: keyof AgentOutletPayload,
    value: string
  ): void => {
    setOperationsState((current) => ({
      ...current,
      outlets: current.outlets.map((outlet, itemIndex) =>
        itemIndex === index
          ? {
              ...outlet,
              [field]: value
            }
          : outlet
      )
    }));
  };

  const addOutlet = (): void => {
    setOperationsState((current) => ({
      ...current,
      outlets: [...current.outlets, createEmptyOutlet()]
    }));
  };

  const removeOutlet = (index: number): void => {
    setOperationsState((current) => {
      const nextItems = current.outlets.filter(
        (_item, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        outlets: nextItems.length ? nextItems : [createEmptyOutlet()]
      };
    });
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
        const payload: AgentDraftPayload = {
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
          yearsInOperation: businessState.yearsInOperation.trim(),
          serviceCoverage: businessState.serviceCoverage.trim(),
          outletCountEstimate: businessState.outletCountEstimate.trim(),
          complianceContact: businessState.complianceContact.trim()
        };

        response = await saveAgentDraft(payload);
        setActiveStep("contacts_transactors");
        setMessage("Agent business snapshot saved.");
      }

      if (activeStep === "contacts_transactors") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(AGENT_APPLICATION_STORAGE_KEY) ||
          "";

        if (!nextApplicationId) {
          throw new Error("Save the business snapshot before continuing.");
        }

        const payload: AgentContactsPayload = {
          primaryContact: {
            fullName: contactState.primaryContact.fullName.trim(),
            email: contactState.primaryContact.email.trim(),
            phoneNumber: contactState.primaryContact.phoneNumber.trim(),
            designation: contactState.primaryContact.designation?.trim(),
            residentialAddress: contactState.primaryContact.residentialAddress?.trim()
          },
          authorizedTransactors: contactState.authorizedTransactors.map((person) => ({
            fullName: person.fullName.trim(),
            designation: person.designation?.trim(),
            email: person.email?.trim(),
            phoneNumber: person.phoneNumber?.trim(),
            nationalIdNumber: person.nationalIdNumber?.trim(),
            residentialAddress: person.residentialAddress?.trim()
          })),
          directors: contactState.directors.map((person) => ({
            fullName: person.fullName.trim(),
            designation: person.designation?.trim(),
            email: person.email?.trim(),
            phoneNumber: person.phoneNumber?.trim(),
            nationalIdNumber: person.nationalIdNumber?.trim(),
            residentialAddress: person.residentialAddress?.trim(),
            isPrimaryDirector: Boolean(person.isPrimaryDirector)
          }))
        };

        response = await saveAgentContacts(nextApplicationId, payload);
        setActiveStep("banking_details");
        setMessage("Agent directors and transactors saved.");
      }

      if (activeStep === "banking_details") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(AGENT_APPLICATION_STORAGE_KEY) ||
          "";

        if (!nextApplicationId) {
          throw new Error("Save the earlier sections before continuing.");
        }

        const payload: AgentOperationsPayload = {
          accountName: operationsState.accountName.trim(),
          bankName: operationsState.bankName.trim(),
          branchName: operationsState.branchName.trim(),
          branchCode: operationsState.branchCode.trim(),
          accountNumber: operationsState.accountNumber.trim(),
          accountType: operationsState.accountType.trim(),
          currency: operationsState.currency.trim().toUpperCase(),
          outlets: operationsState.outlets.map((outlet) => ({
            name: outlet.name?.trim() || "",
            code: outlet.code?.trim(),
            phoneNumber: outlet.phoneNumber?.trim(),
            email: outlet.email?.trim(),
            addressLine1: outlet.addressLine1?.trim(),
            addressLine2: outlet.addressLine2?.trim(),
            city: outlet.city?.trim(),
            province: outlet.province?.trim(),
            country: outlet.country?.trim() || "Zimbabwe"
          }))
        };

        response = await saveAgentOperations(nextApplicationId, payload);
        setActiveStep("supporting_documents");
        setMessage("Agent outlets and banking details saved.");
      }

      if (activeStep === "supporting_documents") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(AGENT_APPLICATION_STORAGE_KEY) ||
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
        setMessage("Agent supporting documents uploaded.");
      }

      if (activeStep === "declarations_review") {
        const nextApplicationId =
          applicationId ||
          window.localStorage.getItem(AGENT_APPLICATION_STORAGE_KEY) ||
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

        response = await submitAgentApplication(nextApplicationId, payload);
        setMessage("Agent application submitted for internal review.");
      }

      if (response) {
        syncApplicationState(response);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the current agent step."
      );
    } finally {
      setSavingStep(false);
    }
  };

  if (loadingDraft || loadingEntityTypes) {
    return (
      <div className="empty-state">
        <strong>Loading agent workspace...</strong>
        <span>Preparing your agent draft, sections, and document rules.</span>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <h2>Domestic Remittances Agent Application</h2>
          <p className="panel-header__copy">
            Complete the agent profile in clear steps: business details, key people,
            outlets, required documents, and final declaration before review.
          </p>
          {applicationStatus === "needs_more_information" ? (
            <p className="feedback feedback--warning">
              This application was returned for corrections. Review the notes on{" "}
              <Link to={applicationId ? `/applications/${applicationId}/status` : "/applications/status"}>
                the status page
              </Link>{" "}
              and then update the requested sections in this form.
            </p>
          ) : null}
          {error ? <p className="feedback feedback--error">{error}</p> : null}
          {message ? <p className="feedback feedback--success">{message}</p> : null}
        </div>

        <div className="panel-header__summary">
          <span className="panel-header__summary-label">Application</span>
          <strong
            className={`panel-header__summary-badge ${
              applicationId ? "panel-header__summary-badge--live" : "panel-header__summary-badge--draft"
            }`}
          >
            {applicationId ? "Live" : "New"}
          </strong>
          <span className="panel-header__summary-hint">
            {applicationStatus ? humanize(applicationStatus) : "Draft not created yet"}
          </span>
        </div>
      </div>

      <div className="stepper">
        <div className="stepper-track">
          {AGENT_STEPS.map((step) => {
            const section = sectionMap[step.key];
            const isCompleted = section?.status === "completed";
            const isActive = activeStep === step.key;

            return (
              <button
                key={step.key}
                type="button"
                className={`stepper-item${
                  isActive ? " stepper-item--active" : ""
                }${isCompleted ? " stepper-item--completed" : ""}`}
                onClick={() => setActiveStep(step.key)}
              >
                <div className="stepper-dot">{findStepIndex(step.key) + 1}</div>
                <div className="stepper-copy">
                  <div className="stepper-kicker">
                    {isCompleted ? "Completed" : isActive ? "In Progress" : `Step ${findStepIndex(step.key) + 1}`}
                  </div>
                  <div className="stepper-label">{step.label}</div>
                  <div className="stepper-note">
                    {section?.status ? humanize(section.status) : "Not started"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeStep === "business_snapshot" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Business Snapshot</h3>
              <p>
                Start with the legal business identity, contact details, and the
                basic operating footprint for the remittances agent.
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
                placeholder="Enter trading name"
              />
            </label>

            <label className="field">
              <span>Contact Person</span>
              <input
                name="contactPerson"
                value={businessState.contactPerson}
                onChange={handleBusinessFieldChange}
                placeholder="Enter main contact person"
              />
            </label>

            <label className="field">
              <span>Business Email</span>
              <input
                name="businessEmail"
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
                placeholder="Enter business phone"
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
                placeholder="Enter tax number"
              />
            </label>

            <label className="field">
              <span>Years In Operation</span>
              <input
                name="yearsInOperation"
                value={businessState.yearsInOperation}
                onChange={handleBusinessFieldChange}
                placeholder="e.g. 5 years"
              />
            </label>

            <label className="field">
              <span>Outlet Count Estimate</span>
              <input
                name="outletCountEstimate"
                value={businessState.outletCountEstimate}
                onChange={handleBusinessFieldChange}
                placeholder="e.g. 3 branches"
              />
            </label>

            <label className="field">
              <span>Compliance Contact</span>
              <input
                name="complianceContact"
                value={businessState.complianceContact}
                onChange={handleBusinessFieldChange}
                placeholder="Compliance or operations contact"
              />
            </label>

            <label className="field field--wide">
              <span>Service Coverage</span>
              <textarea
                name="serviceCoverage"
                value={businessState.serviceCoverage}
                onChange={handleBusinessFieldChange}
                placeholder="Describe target service areas, branches, or remittance coverage"
              />
            </label>

            <label className="field field--wide">
              <span>Business Address</span>
              <textarea
                name="businessAddress"
                value={businessState.businessAddress}
                onChange={handleBusinessFieldChange}
                placeholder="Enter physical business address"
              />
            </label>
          </div>
        </section>
      ) : null}

      {activeStep === "contacts_transactors" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Directors & Authorized Transactors</h3>
              <p>
                Record the primary contact, directors, and the people authorized to
                transact under the agent arrangement.
              </p>
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Primary Contact</h4>
                <p>This person becomes the main operating contact for the agent profile.</p>
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
                  value={contactState.primaryContact.email}
                  onChange={handlePrimaryContactFieldChange}
                  placeholder="Enter email"
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
                  placeholder="Enter job title"
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
                <h4>Directors</h4>
                <p>List the directors or principal officers for the agent business.</p>
              </div>
              <button type="button" className="button button--ghost" onClick={addDirector}>
                Add Director
              </button>
            </div>

            <div className="stacked-list">
              {contactState.directors.map((director, index) => (
                <article className="subsection-card subsection-card--nested" key={`director-${index}`}>
                  <div className="subsection-card__header">
                    <div>
                      <h4>Director {index + 1}</h4>
                    </div>
                    <button type="button" className="button button--ghost" onClick={() => removeDirector(index)}>
                      Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Full Name</span>
                      <input
                        value={director.fullName || ""}
                        onChange={(event) =>
                          updateDirectorField(index, "fullName", event.target.value)
                        }
                        placeholder="Enter full name"
                      />
                    </label>

                    <label className="field">
                      <span>Designation</span>
                      <input
                        value={director.designation || ""}
                        onChange={(event) =>
                          updateDirectorField(index, "designation", event.target.value)
                        }
                        placeholder="Enter designation"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={director.email || ""}
                        onChange={(event) =>
                          updateDirectorField(index, "email", event.target.value)
                        }
                        placeholder="Enter email"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={director.phoneNumber || ""}
                        onChange={(event) =>
                          updateDirectorField(index, "phoneNumber", event.target.value)
                        }
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="field">
                      <span>National ID Number</span>
                      <input
                        value={director.nationalIdNumber || ""}
                        onChange={(event) =>
                          updateDirectorField(index, "nationalIdNumber", event.target.value)
                        }
                        placeholder="Enter ID number"
                      />
                    </label>

                    <label className="field">
                      <span>Primary Director</span>
                      <select
                        value={director.isPrimaryDirector ? "yes" : "no"}
                        onChange={(event) =>
                          updateDirectorField(
                            index,
                            "isPrimaryDirector",
                            event.target.value === "yes"
                          )
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </label>

                    <label className="field field--wide">
                      <span>Residential Address</span>
                      <textarea
                        value={director.residentialAddress || ""}
                        onChange={(event) =>
                          updateDirectorField(
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
                <h4>Authorized Transactors</h4>
                <p>These people can transact or operate under the agent profile.</p>
              </div>
              <button type="button" className="button button--ghost" onClick={addTransactor}>
                Add Transactor
              </button>
            </div>

            <div className="stacked-list">
              {contactState.authorizedTransactors.map((person, index) => (
                <article className="subsection-card subsection-card--nested" key={`transactor-${index}`}>
                  <div className="subsection-card__header">
                    <div>
                      <h4>Transactor {index + 1}</h4>
                    </div>
                    <button type="button" className="button button--ghost" onClick={() => removeTransactor(index)}>
                      Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Full Name</span>
                      <input
                        value={person.fullName || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "fullName", event.target.value)
                        }
                        placeholder="Enter full name"
                      />
                    </label>

                    <label className="field">
                      <span>Designation</span>
                      <input
                        value={person.designation || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "designation", event.target.value)
                        }
                        placeholder="Enter designation"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={person.email || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "email", event.target.value)
                        }
                        placeholder="Enter email"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={person.phoneNumber || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "phoneNumber", event.target.value)
                        }
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="field">
                      <span>National ID Number</span>
                      <input
                        value={person.nationalIdNumber || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "nationalIdNumber", event.target.value)
                        }
                        placeholder="Enter ID number"
                      />
                    </label>

                    <label className="field field--wide">
                      <span>Residential Address</span>
                      <textarea
                        value={person.residentialAddress || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "residentialAddress", event.target.value)
                        }
                        placeholder="Enter residential address"
                      />
                    </label>
                  </div>
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
              <h3>Outlets & Banking</h3>
              <p>
                Capture the operating outlets together with the primary bank account
                used for settlement and reconciliation.
              </p>
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Settlement Account</h4>
                <p>This should be the account Omari uses for agent settlements.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Account Name</span>
                <input
                  name="accountName"
                  value={operationsState.accountName}
                  onChange={handleOperationsFieldChange}
                  placeholder="Enter account name"
                />
              </label>

              <label className="field">
                <span>Bank Name</span>
                <input
                  name="bankName"
                  value={operationsState.bankName}
                  onChange={handleOperationsFieldChange}
                  placeholder="Enter bank name"
                />
              </label>

              <label className="field">
                <span>Branch Name</span>
                <input
                  name="branchName"
                  value={operationsState.branchName}
                  onChange={handleOperationsFieldChange}
                  placeholder="Enter branch name"
                />
              </label>

              <label className="field">
                <span>Branch Code</span>
                <input
                  name="branchCode"
                  value={operationsState.branchCode}
                  onChange={handleOperationsFieldChange}
                  placeholder="Enter branch code"
                />
              </label>

              <label className="field">
                <span>Account Number</span>
                <input
                  name="accountNumber"
                  value={operationsState.accountNumber}
                  onChange={handleOperationsFieldChange}
                  placeholder="Enter account number"
                />
              </label>

              <label className="field">
                <span>Account Type</span>
                <select
                  name="accountType"
                  value={operationsState.accountType}
                  onChange={handleOperationsFieldChange}
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
                  value={operationsState.currency}
                  onChange={handleOperationsFieldChange}
                >
                  <option value="USD">USD</option>
                  <option value="ZWG">ZWG</option>
                  <option value="ZAR">ZAR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Operating Outlets</h4>
                <p>Add each branch or operating outlet covered by the agent application.</p>
              </div>
              <button type="button" className="button button--ghost" onClick={addOutlet}>
                Add Outlet
              </button>
            </div>

            <div className="stacked-list">
              {operationsState.outlets.map((outlet, index) => (
                <article className="subsection-card subsection-card--nested" key={`outlet-${index}`}>
                  <div className="subsection-card__header">
                    <div>
                      <h4>Outlet {index + 1}</h4>
                    </div>
                    <button type="button" className="button button--ghost" onClick={() => removeOutlet(index)}>
                      Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={outlet.name || ""}
                        onChange={(event) =>
                          updateOutletField(index, "name", event.target.value)
                        }
                        placeholder="Enter outlet name"
                      />
                    </label>

                    <label className="field">
                      <span>Code</span>
                      <input
                        value={outlet.code || ""}
                        onChange={(event) =>
                          updateOutletField(index, "code", event.target.value)
                        }
                        placeholder="Enter outlet code"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={outlet.phoneNumber || ""}
                        onChange={(event) =>
                          updateOutletField(index, "phoneNumber", event.target.value)
                        }
                        placeholder="Enter outlet phone number"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={outlet.email || ""}
                        onChange={(event) =>
                          updateOutletField(index, "email", event.target.value)
                        }
                        placeholder="Enter outlet email"
                      />
                    </label>

                    <label className="field">
                      <span>Address Line 1</span>
                      <input
                        value={outlet.addressLine1 || ""}
                        onChange={(event) =>
                          updateOutletField(index, "addressLine1", event.target.value)
                        }
                        placeholder="Enter address line 1"
                      />
                    </label>

                    <label className="field">
                      <span>Address Line 2</span>
                      <input
                        value={outlet.addressLine2 || ""}
                        onChange={(event) =>
                          updateOutletField(index, "addressLine2", event.target.value)
                        }
                        placeholder="Enter address line 2"
                      />
                    </label>

                    <label className="field">
                      <span>City</span>
                      <input
                        value={outlet.city || ""}
                        onChange={(event) =>
                          updateOutletField(index, "city", event.target.value)
                        }
                        placeholder="Enter city"
                      />
                    </label>

                    <label className="field">
                      <span>Province</span>
                      <input
                        value={outlet.province || ""}
                        onChange={(event) =>
                          updateOutletField(index, "province", event.target.value)
                        }
                        placeholder="Enter province"
                      />
                    </label>

                    <label className="field">
                      <span>Country</span>
                      <input
                        value={outlet.country || ""}
                        onChange={(event) =>
                          updateOutletField(index, "country", event.target.value)
                        }
                        placeholder="Enter country"
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
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
                agent entity type.
              </p>
            </div>
            <span className="status-chip status-chip--soft">
              {uploadedRequirementCount}/{requirements.length} uploaded
            </span>
          </div>

          {loadingRequirements ? (
            <div className="empty-state">
              <strong>Loading requirements...</strong>
              <span>The agent document checklist is being prepared.</span>
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
                            "Upload the required agent support document."}
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
                      <span>
                        Formats: {requirement.allowedExtensions.join(", ")}
                      </span>
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
                        selected files into the agent record.
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
                Review the full agent profile, confirm declarations, and submit
                once all required sections and documents are complete.
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
                  <dt>Service coverage</dt>
                  <dd>{businessState.serviceCoverage || "-"}</dd>
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
                  <dt>Directors</dt>
                  <dd>{contactState.directors.length}</dd>
                </div>
                <div>
                  <dt>Authorized transactors</dt>
                  <dd>{contactState.authorizedTransactors.length}</dd>
                </div>
                <div>
                  <dt>Compliance contact</dt>
                  <dd>{businessState.complianceContact || "-"}</dd>
                </div>
              </dl>
            </article>

            <article className="review-card">
              <h4>Operations</h4>
              <dl className="detail-list">
                <div>
                  <dt>Settlement account</dt>
                  <dd>{operationsState.accountName || "-"}</dd>
                </div>
                <div>
                  <dt>Bank</dt>
                  <dd>{operationsState.bankName || "-"}</dd>
                </div>
                <div>
                  <dt>Outlets</dt>
                  <dd>{operationsState.outlets.length}</dd>
                </div>
                <div>
                  <dt>Currency</dt>
                  <dd>{operationsState.currency || "-"}</dd>
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
                  The named signatory confirms the agent information and accepts
                  the Omari agent onboarding terms.
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
                <span>I accept the Omari agent terms and onboarding conditions.</span>
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
                <span>I am authorized to submit this agent application on behalf of the business.</span>
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
                    ? "Save Contacts And Directors"
                    : activeStep === "banking_details"
                      ? "Save Outlets And Banking"
                      : activeStep === "declarations_review"
                        ? "Submit For Internal Review"
                        : `Save Document Step${stagedUploadCount > 0 ? " And Upload" : ""}`}
          </button>
        </div>
      </div>
    </form>
  );
}

export default AgentOnboardingForm;
