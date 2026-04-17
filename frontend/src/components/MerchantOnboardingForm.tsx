import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ApplicationDetailResponse,
  ApplicationSectionSummary,
  DocumentRequirementItem,
  MerchantContactPersonPayload,
  MerchantContactsPayload,
  MerchantDraftPayload,
  MerchantSignatoryPayload,
  MerchantTransactorPayload,
  UploadedApplicationDocument,
  getApplication,
  getDocumentRequirements,
  saveMerchantContacts,
  saveMerchantDraft,
  uploadApplicationDocuments
} from "../services/api";

type MerchantStepKey =
  | "business_snapshot"
  | "contacts_transactors"
  | "supporting_documents";

interface MerchantFormState {
  legalName: string;
  tradingName: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
  projectedTransactions: string;
  businessAddress: string;
  productsDescription: string;
}

interface ContactSectionState {
  primaryContact: MerchantContactPersonPayload;
  authorizedTransactors: MerchantTransactorPayload[];
  signatories: MerchantSignatoryPayload[];
}

const LOCAL_STORAGE_KEY = "omari-onboarding:merchant-application-id";

const MERCHANT_STEPS: Array<{ key: MerchantStepKey; label: string }> = [
  { key: "business_snapshot", label: "Business Snapshot" },
  { key: "contacts_transactors", label: "Contacts & Transactors" },
  { key: "supporting_documents", label: "Supporting Documents" }
];

const defaultFormState: MerchantFormState = {
  legalName: "",
  tradingName: "",
  contactPerson: "",
  businessEmail: "",
  businessPhone: "",
  projectedTransactions: "",
  businessAddress: "",
  productsDescription: ""
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

const createEmptySignatory = (): MerchantSignatoryPayload => ({
  ...createEmptyTransactor(),
  isPrimarySignatory: false
});

const createDefaultContactState = (): ContactSectionState => ({
  primaryContact: createEmptyPrimaryContact(),
  authorizedTransactors: [createEmptyTransactor()],
  signatories: [createEmptySignatory()]
});

const humanize = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

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

const buildFormState = (
  application: ApplicationDetailResponse
): MerchantFormState => ({
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
  projectedTransactions:
    application.businessSnapshot?.projectedTransactions || "",
  businessAddress:
    application.businessSnapshot?.businessAddress ||
    application.organization.businessAddress ||
    "",
  productsDescription:
    application.businessSnapshot?.productsDescription || ""
});

const buildContactState = (
  application: ApplicationDetailResponse
): ContactSectionState => {
  const merchantContacts = application.merchantContacts;

  return {
    primaryContact: merchantContacts?.primaryContact || createEmptyPrimaryContact(),
    authorizedTransactors:
      merchantContacts?.authorizedTransactors.length
        ? merchantContacts.authorizedTransactors
        : [createEmptyTransactor()],
    signatories:
      merchantContacts?.signatories.length
        ? merchantContacts.signatories
        : [createEmptySignatory()]
  };
};

const buildDraftPayload = (
  applicationId: string,
  entityType: string,
  form: MerchantFormState
): MerchantDraftPayload => ({
  applicationId: applicationId || undefined,
  entityType,
  legalName: form.legalName,
  tradingName: form.tradingName,
  contactPerson: form.contactPerson,
  businessEmail: form.businessEmail,
  businessPhone: form.businessPhone,
  projectedTransactions: form.projectedTransactions,
  businessAddress: form.businessAddress,
  productsDescription: form.productsDescription
});

const normalizeContactState = (
  state: ContactSectionState
): MerchantContactsPayload => ({
  primaryContact: {
    fullName: state.primaryContact.fullName.trim(),
    email: state.primaryContact.email.trim(),
    phoneNumber: state.primaryContact.phoneNumber.trim(),
    designation: state.primaryContact.designation?.trim(),
    residentialAddress: state.primaryContact.residentialAddress?.trim()
  },
  authorizedTransactors: state.authorizedTransactors.map((person) => ({
    fullName: person.fullName.trim(),
    designation: person.designation?.trim(),
    email: person.email?.trim(),
    phoneNumber: person.phoneNumber?.trim(),
    nationalIdNumber: person.nationalIdNumber?.trim(),
    residentialAddress: person.residentialAddress?.trim()
  })),
  signatories: state.signatories.map((person) => ({
    fullName: person.fullName.trim(),
    designation: person.designation?.trim(),
    email: person.email?.trim(),
    phoneNumber: person.phoneNumber?.trim(),
    nationalIdNumber: person.nationalIdNumber?.trim(),
    residentialAddress: person.residentialAddress?.trim(),
    isPrimarySignatory: Boolean(person.isPrimarySignatory)
  }))
});

const getPreferredStep = (
  application: ApplicationDetailResponse
): MerchantStepKey => {
  const currentStep = application.currentStep as MerchantStepKey | null;

  if (currentStep && MERCHANT_STEPS.some((step) => step.key === currentStep)) {
    return currentStep;
  }

  const firstIncomplete = application.sections
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find(
      (section) =>
        MERCHANT_STEPS.some((step) => step.key === section.key as MerchantStepKey) &&
        section.status !== "completed"
    );

  return (firstIncomplete?.key as MerchantStepKey) || "business_snapshot";
};

const findStepIndex = (step: MerchantStepKey): number =>
  MERCHANT_STEPS.findIndex((item) => item.key === step);

function MerchantOnboardingForm(): JSX.Element {
  const [form, setForm] = useState<MerchantFormState>(defaultFormState);
  const [contactSection, setContactSection] = useState<ContactSectionState>(
    createDefaultContactState()
  );
  const [applicationId, setApplicationId] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [sections, setSections] = useState<ApplicationSectionSummary[]>([]);
  const [activeStep, setActiveStep] =
    useState<MerchantStepKey>("business_snapshot");
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

  const syncApplicationState = (application: ApplicationDetailResponse): void => {
    setApplicationId(application.applicationId);
    setApplicationStatus(application.status);
    setSections(application.sections);
    setSelectedEntityType(application.organization.entityType);
    setForm(buildFormState(application));
    setContactSection(buildContactState(application));
    setUploadedDocuments(groupUploadedDocuments(application.uploadedDocuments));
    setActiveStep(getPreferredStep(application));
    window.localStorage.setItem(LOCAL_STORAGE_KEY, application.applicationId);
  };

  useEffect(() => {
    const loadEntityTypes = async (): Promise<void> => {
      setLoadingEntityTypes(true);

      try {
        const response = await getDocumentRequirements("merchant");
        setEntityTypes(response.availableEntityTypes);
        setSelectedEntityType(
          (current) => current || response.availableEntityTypes[0] || ""
        );
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load merchant entity types."
        );
      } finally {
        setLoadingEntityTypes(false);
      }
    };

    void loadEntityTypes();
  }, []);

  useEffect(() => {
    const loadStoredDraft = async (): Promise<void> => {
      const storedApplicationId = window.localStorage.getItem(LOCAL_STORAGE_KEY);

      if (!storedApplicationId) {
        setLoadingDraft(false);
        return;
      }

      try {
        const application = await getApplication(storedApplicationId);
        syncApplicationState(application);
        setMessage("Existing merchant draft loaded from your last session.");
      } catch (caughtError) {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        setApplicationId("");
        setApplicationStatus("");

        if (
          caughtError instanceof Error &&
          caughtError.message.toLowerCase().includes("not found")
        ) {
          setMessage("Previous draft was not found, so a fresh form was opened.");
        } else {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load the saved draft."
          );
        }
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
        const response = await getDocumentRequirements(
          "merchant",
          selectedEntityType
        );

        setRequirements(response.requirements);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load document requirements."
        );
      } finally {
        setLoadingRequirements(false);
      }
    };

    void loadRequirements();
  }, [selectedEntityType]);

  useEffect(() => {
    setContactSection((current) => {
      const hasContactValues =
        current.primaryContact.fullName ||
        current.primaryContact.email ||
        current.primaryContact.phoneNumber;

      if (hasContactValues) {
        return current;
      }

      return {
        ...current,
        primaryContact: {
          ...current.primaryContact,
          fullName: form.contactPerson,
          email: form.businessEmail,
          phoneNumber: form.businessPhone
        }
      };
    });
  }, [form.contactPerson, form.businessEmail, form.businessPhone]);

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

  const currentStepIndex = findStepIndex(activeStep);
  const previousStep =
    currentStepIndex > 0 ? MERCHANT_STEPS[currentStepIndex - 1].key : null;
  const nextStep =
    currentStepIndex < MERCHANT_STEPS.length - 1
      ? MERCHANT_STEPS[currentStepIndex + 1].key
      : null;

  const handleFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleEntityTypeChange = (
    event: ChangeEvent<HTMLSelectElement>
  ): void => {
    setSelectedEntityType(event.target.value);
    setSelectedFiles({});
    setMessage("");
  };

  const handlePrimaryContactChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = event.target;

    setContactSection((current) => ({
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
    setContactSection((current) => ({
      ...current,
      authorizedTransactors: current.authorizedTransactors.map((transactor, itemIndex) =>
        itemIndex === index ? { ...transactor, [field]: value } : transactor
      )
    }));
  };

  const updateSignatoryField = (
    index: number,
    field: keyof MerchantSignatoryPayload,
    value: string | boolean
  ): void => {
    setContactSection((current) => ({
      ...current,
      signatories: current.signatories.map((signatory, itemIndex) => {
        if (itemIndex !== index) {
          if (field === "isPrimarySignatory" && value === true) {
            return { ...signatory, isPrimarySignatory: false };
          }

          return signatory;
        }

        return {
          ...signatory,
          [field]: value
        };
      })
    }));
  };

  const addTransactor = (): void => {
    setContactSection((current) => ({
      ...current,
      authorizedTransactors: [
        ...current.authorizedTransactors,
        createEmptyTransactor()
      ]
    }));
  };

  const removeTransactor = (index: number): void => {
    setContactSection((current) => {
      const nextItems = current.authorizedTransactors.filter(
        (_, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        authorizedTransactors:
          nextItems.length > 0 ? nextItems : [createEmptyTransactor()]
      };
    });
  };

  const addSignatory = (): void => {
    setContactSection((current) => ({
      ...current,
      signatories: [...current.signatories, createEmptySignatory()]
    }));
  };

  const removeSignatory = (index: number): void => {
    setContactSection((current) => {
      const nextItems = current.signatories.filter(
        (_, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        signatories: nextItems.length > 0 ? nextItems : [createEmptySignatory()]
      };
    });
  };

  const handleFileChange =
    (requirement: DocumentRequirementItem) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files || []).slice(
        0,
        requirement.maxFiles
      );

      setSelectedFiles((current) => ({
        ...current,
        [requirement.code]: files
      }));
    };

  const handleReset = (): void => {
    setForm(defaultFormState);
    setContactSection(createDefaultContactState());
    setSections([]);
    setSelectedFiles({});
    setUploadedDocuments({});
    setApplicationId("");
    setApplicationStatus("");
    setActiveStep("business_snapshot");
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    setMessage("Local draft state cleared. Saving again will create a fresh draft.");
    setError("");
  };

  const ensureDraftForCurrentState = async (): Promise<ApplicationDetailResponse> => {
    const draft = await saveMerchantDraft(
      buildDraftPayload(applicationId, selectedEntityType, form)
    );

    syncApplicationState(draft);
    return draft;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSavingStep(true);
    setError("");
    setMessage("");

    try {
      if (activeStep === "business_snapshot") {
        if (
          !selectedEntityType ||
          !form.legalName.trim() ||
          !form.contactPerson.trim() ||
          !form.businessEmail.trim()
        ) {
          throw new Error(
            "Business category, legal business name, contact person, and business email are required before saving."
          );
        }

        const draft = await ensureDraftForCurrentState();
        setMessage("Business snapshot saved successfully.");
        setActiveStep("contacts_transactors");
        syncApplicationState({
          ...draft,
          currentStep: "contacts_transactors"
        });
        return;
      }

      if (activeStep === "contacts_transactors") {
        if (!applicationId) {
          if (
            !selectedEntityType ||
            !form.legalName.trim() ||
            !form.contactPerson.trim() ||
            !form.businessEmail.trim()
          ) {
            throw new Error(
              "Save the business snapshot details first, or complete the required business fields so a draft can be created automatically."
            );
          }

          await ensureDraftForCurrentState();
        }

        const normalizedContacts = normalizeContactState(contactSection);

        if (
          !normalizedContacts.primaryContact.fullName ||
          !normalizedContacts.primaryContact.email ||
          !normalizedContacts.primaryContact.phoneNumber
        ) {
          throw new Error(
            "Primary contact full name, email, and phone number are required before saving this section."
          );
        }

        const contactsResponse = await saveMerchantContacts(
          applicationId || window.localStorage.getItem(LOCAL_STORAGE_KEY) || "",
          normalizedContacts
        );
        syncApplicationState(contactsResponse);
        setMessage("Contacts and transactors saved successfully.");
        setActiveStep("supporting_documents");
        return;
      }

      const currentApplicationId =
        applicationId || window.localStorage.getItem(LOCAL_STORAGE_KEY) || "";

      if (!currentApplicationId) {
        if (
          !selectedEntityType ||
          !form.legalName.trim() ||
          !form.contactPerson.trim() ||
          !form.businessEmail.trim()
        ) {
          throw new Error(
            "Save the business snapshot first before uploading documents."
          );
        }

        await ensureDraftForCurrentState();
      }

      const draftId =
        applicationId || window.localStorage.getItem(LOCAL_STORAGE_KEY) || "";

      const filesToUpload = Object.entries(selectedFiles).filter(
        ([, files]) => files.length > 0
      );

      if (filesToUpload.length === 0) {
        throw new Error(
          "Choose at least one file in the document checklist before saving this step."
        );
      }

      let latestApplication: ApplicationDetailResponse | null = null;

      for (const [requirementCode, files] of filesToUpload) {
        latestApplication = await uploadApplicationDocuments(
          draftId,
          requirementCode,
          files
        );
      }

      if (!latestApplication) {
        throw new Error("No files were uploaded.");
      }

      syncApplicationState(latestApplication);
      setSelectedFiles({});
      setMessage(
        `${filesToUpload.length} document group${
          filesToUpload.length > 1 ? "s were" : " was"
        } uploaded to the merchant draft.`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save this merchant section."
      );
    } finally {
      setSavingStep(false);
    }
  };

  const loadingState = loadingEntityTypes || loadingDraft;

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div>
          <p className="panel-header__eyebrow">Applicant Portal</p>
          <h2>New Merchant Application</h2>
          <p className="panel-header__copy">
            The merchant flow is now organized into real sections with progress
            tracking and save points.
          </p>
        </div>

        <div className="panel-header__summary">
          <span className="status-chip status-chip--brand">
            {applicationId ? "Live Draft" : "Merchant Flow"}
          </span>
          <strong>{requirements.length}</strong>
          <span>Requirements loaded</span>
          {applicationId ? (
            <span className="panel-header__meta">
              Draft: {applicationId.slice(0, 8)} | {humanize(applicationStatus)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="stepper">
        {MERCHANT_STEPS.map((step, index) => {
          const section = sectionMap[step.key];
          const status = section?.status || (index === 0 ? "in_progress" : "not_started");
          const isCompleted = status === "completed";
          const isActive = activeStep === step.key;

          return (
            <button
              key={step.key}
              type="button"
              className={`stepper__item${
                isActive ? " stepper__item--active" : ""
              }${isCompleted ? " stepper__item--completed" : ""}`}
              onClick={() => setActiveStep(step.key)}
            >
              <span className="stepper__index">{index + 1}</span>
              <span className="stepper__content">
                <strong>{step.label}</strong>
                <span>{humanize(status)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      {activeStep === "business_snapshot" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Business Snapshot</h3>
              <p>
                Start with the merchant identity and the core business profile.
              </p>
            </div>
            <span className="status-chip">
              {loadingState ? "Loading setup..." : "Step 1 of 3"}
            </span>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Application Type</span>
              <input value="Merchant" disabled />
            </label>

            <label className="field">
              <span>Business Category</span>
              <select
                value={selectedEntityType}
                onChange={handleEntityTypeChange}
                disabled={loadingEntityTypes || entityTypes.length === 0}
              >
                {entityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {humanize(entityType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Legal Business Name</span>
              <input
                name="legalName"
                value={form.legalName}
                onChange={handleFieldChange}
                placeholder="Enter registered business name"
              />
            </label>

            <label className="field">
              <span>Trading Name</span>
              <input
                name="tradingName"
                value={form.tradingName}
                onChange={handleFieldChange}
                placeholder="Enter trading name if different"
              />
            </label>

            <label className="field">
              <span>Contact Person</span>
              <input
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleFieldChange}
                placeholder="Enter primary contact person"
              />
            </label>

            <label className="field">
              <span>Projected Transactions / Month</span>
              <input
                name="projectedTransactions"
                value={form.projectedTransactions}
                onChange={handleFieldChange}
                placeholder="Example: 250"
              />
            </label>

            <label className="field">
              <span>Business Email</span>
              <input
                name="businessEmail"
                value={form.businessEmail}
                onChange={handleFieldChange}
                placeholder="Enter business email"
              />
            </label>

            <label className="field">
              <span>Business Telephone</span>
              <input
                name="businessPhone"
                value={form.businessPhone}
                onChange={handleFieldChange}
                placeholder="Enter business phone number"
              />
            </label>

            <label className="field field--wide">
              <span>Business Address</span>
              <textarea
                name="businessAddress"
                value={form.businessAddress}
                onChange={handleFieldChange}
                placeholder="Enter the physical business address"
              />
            </label>

            <label className="field field--wide">
              <span>Products or Services Description</span>
              <textarea
                name="productsDescription"
                value={form.productsDescription}
                onChange={handleFieldChange}
                placeholder="Briefly describe what will be sold through Omari"
              />
            </label>
          </div>
        </section>
      ) : null}

      {activeStep === "contacts_transactors" ? (
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Contacts & Authorized Transactors</h3>
              <p>
                Capture the primary contact, signatories, and the people allowed
                to transact on behalf of the merchant.
              </p>
            </div>
            <span className="status-chip">
              {applicationId ? "Live contact draft" : "Business save needed"}
            </span>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Primary Contact</h4>
                <p>The main person OMDS should communicate with.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Full Name</span>
                <input
                  name="fullName"
                  value={contactSection.primaryContact.fullName}
                  onChange={handlePrimaryContactChange}
                  placeholder="Enter full name"
                />
              </label>

              <label className="field">
                <span>Designation</span>
                <input
                  name="designation"
                  value={contactSection.primaryContact.designation || ""}
                  onChange={handlePrimaryContactChange}
                  placeholder="Enter role or title"
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  name="email"
                  value={contactSection.primaryContact.email}
                  onChange={handlePrimaryContactChange}
                  placeholder="Enter contact email"
                />
              </label>

              <label className="field">
                <span>Phone Number</span>
                <input
                  name="phoneNumber"
                  value={contactSection.primaryContact.phoneNumber}
                  onChange={handlePrimaryContactChange}
                  placeholder="Enter phone number"
                />
              </label>

              <label className="field field--wide">
                <span>Residential Address</span>
                <textarea
                  name="residentialAddress"
                  value={contactSection.primaryContact.residentialAddress || ""}
                  onChange={handlePrimaryContactChange}
                  placeholder="Enter residential address"
                />
              </label>
            </div>
          </div>

          <div className="subsection-card">
            <div className="subsection-card__header">
              <div>
                <h4>Authorized Transactors</h4>
                <p>People permitted to transact on behalf of the merchant.</p>
              </div>
              <button
                type="button"
                className="button button--ghost"
                onClick={addTransactor}
              >
                Add Transactor
              </button>
            </div>

            <div className="stack-grid">
              {contactSection.authorizedTransactors.map((transactor, index) => (
                <article className="entry-card" key={`transactor-${index}`}>
                  <div className="entry-card__header">
                    <strong>Authorized Transactor {index + 1}</strong>
                    <button
                      type="button"
                      className="entry-card__remove"
                      onClick={() => removeTransactor(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Full Name</span>
                      <input
                        value={transactor.fullName}
                        onChange={(event) =>
                          updateTransactorField(
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
                        value={transactor.designation || ""}
                        onChange={(event) =>
                          updateTransactorField(
                            index,
                            "designation",
                            event.target.value
                          )
                        }
                        placeholder="Enter designation"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={transactor.email || ""}
                        onChange={(event) =>
                          updateTransactorField(index, "email", event.target.value)
                        }
                        placeholder="Enter email"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={transactor.phoneNumber || ""}
                        onChange={(event) =>
                          updateTransactorField(
                            index,
                            "phoneNumber",
                            event.target.value
                          )
                        }
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="field">
                      <span>National ID Number</span>
                      <input
                        value={transactor.nationalIdNumber || ""}
                        onChange={(event) =>
                          updateTransactorField(
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
                        value={transactor.residentialAddress || ""}
                        onChange={(event) =>
                          updateTransactorField(
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
                <p>Signatories who can authorize the merchant onboarding.</p>
              </div>
              <button
                type="button"
                className="button button--ghost"
                onClick={addSignatory}
              >
                Add Signatory
              </button>
            </div>

            <div className="stack-grid">
              {contactSection.signatories.map((signatory, index) => (
                <article className="entry-card" key={`signatory-${index}`}>
                  <div className="entry-card__header">
                    <strong>Signatory {index + 1}</strong>
                    <button
                      type="button"
                      className="entry-card__remove"
                      onClick={() => removeSignatory(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(signatory.isPrimarySignatory)}
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

                  <div className="form-grid">
                    <label className="field">
                      <span>Full Name</span>
                      <input
                        value={signatory.fullName}
                        onChange={(event) =>
                          updateSignatoryField(
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
                        value={signatory.designation || ""}
                        onChange={(event) =>
                          updateSignatoryField(
                            index,
                            "designation",
                            event.target.value
                          )
                        }
                        placeholder="Enter designation"
                      />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input
                        value={signatory.email || ""}
                        onChange={(event) =>
                          updateSignatoryField(index, "email", event.target.value)
                        }
                        placeholder="Enter email"
                      />
                    </label>

                    <label className="field">
                      <span>Phone Number</span>
                      <input
                        value={signatory.phoneNumber || ""}
                        onChange={(event) =>
                          updateSignatoryField(
                            index,
                            "phoneNumber",
                            event.target.value
                          )
                        }
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="field">
                      <span>National ID Number</span>
                      <input
                        value={signatory.nationalIdNumber || ""}
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
                        value={signatory.residentialAddress || ""}
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
                These requirements come directly from the database for the chosen
                merchant category.
              </p>
            </div>
            <span className="status-chip status-chip--soft">
              {uploadedRequirementCount}/{requirements.length} uploaded
            </span>
          </div>

          {loadingRequirements ? (
            <div className="empty-state">
              <strong>Loading requirements...</strong>
              <span>The checklist is being prepared for the selected entity.</span>
            </div>
          ) : null}

          {!loadingRequirements && requirements.length === 0 ? (
            <div className="empty-state">
              <strong>No requirements loaded yet</strong>
              <span>Select a business category to see the document list.</span>
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
                            "Upload the required merchant support document."}
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
                          ? `${files.length} file${
                              files.length > 1 ? "s" : ""
                            } selected for upload`
                          : "Choose supporting file"}
                      </span>
                      <span className="upload-slot__hint">
                        PDF, JPG, or PNG files. Save this step to push the
                        selected files into the application record.
                      </span>
                    </label>

                    {files.length > 0 ? (
                      <>
                        <p className="requirement-card__subheading">
                          Ready to upload
                        </p>
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
                        <p className="requirement-card__subheading">
                          Uploaded to draft
                        </p>
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

      <div className="form-actions form-actions--split">
        <div className="form-actions__group">
          {previousStep ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setActiveStep(previousStep)}
            >
              Previous Step
            </button>
          ) : null}

          {nextStep ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setActiveStep(nextStep)}
            >
              Next Step
            </button>
          ) : null}
        </div>

        <div className="form-actions__group">
          <button
            type="button"
            className="button button--ghost"
            onClick={handleReset}
          >
            Clear Local Draft
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={savingStep}
          >
            {savingStep
              ? "Saving..."
              : activeStep === "business_snapshot"
                ? "Save Business Snapshot"
                : activeStep === "contacts_transactors"
                  ? "Save Contacts Section"
                  : `Save Documents${stagedUploadCount > 0 ? " & Upload" : ""}`}
          </button>
        </div>
      </div>
    </form>
  );
}

export default MerchantOnboardingForm;
