import { Request, Response } from "express";
import {
  createApplicationComment,
  getActiveApplicationDetailForUser,
  getApplicationDocumentDownload,
  getApplicationDetailForUser,
  replaceApplicationDocuments,
  saveAgentBanking,
  saveAgentContacts,
  saveAgentDraft,
  saveAgentOperations,
  savePayerContacts,
  savePayerBanking,
  savePayerDraft,
  savePayerSettlement,
  saveMerchantBanking,
  saveMerchantContacts,
  saveMerchantDraft,
  submitPayerApplication,
  submitAgentApplication,
  submitMerchantApplication,
  updateApplicationCommentResolution
} from "../services/applicationService";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getAuthenticatedActor = (req: Request) => {
  if (!req.currentUser) {
    throw new Error("Authentication is required.");
  }

  return req.currentUser;
};

const getApplicationErrorStatusCode = (error: unknown): number => {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message === "Application not found." ||
    error.message === "Document requirement not found for this application." ||
    error.message === "Document not found." ||
    error.message === "Comment not found."
  ) {
    return 404;
  }

  if (
    error.message.includes("Authentication is required") ||
    error.message.includes("required") ||
    error.message.includes("valid") ||
    error.message.includes("Comments are locked") ||
    error.message.includes("can only comment") ||
    error.message.includes("Comment visibility") ||
    error.message.includes("Comment section") ||
    error.message.includes("can only be added") ||
    error.message.includes("Save banking details before") ||
    error.message.includes("not an agent application") ||
    error.message.includes("not a merchant application") ||
    error.message.includes("not a payer application") ||
    error.message.includes("Finish or close your current") ||
    error.message.includes("At least one outlet is required")
  ) {
    return 400;
  }

  if (error.message.includes("do not have access")) {
    return 403;
  }

  if (
    error.message.includes("cannot view or manage internal comments")
  ) {
    return 403;
  }

  return 500;
};

const sendApplicationError = (
  res: Response,
  error: unknown,
  fallbackMessage: string
): void => {
  if (error instanceof Error) {
    res.status(getApplicationErrorStatusCode(error)).json({
      message: error.message
    });
    return;
  }

  res.status(500).json({
    message: fallbackMessage
  });
};

export const upsertMerchantDraft = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    applicationId,
    entityType,
    legalName,
    tradingName,
    contactPerson,
    businessEmail,
    businessPhone,
    projectedTransactions,
    businessAddress,
    productsDescription
  } = req.body as Record<string, unknown>;

  if (
    !isNonEmptyString(entityType) ||
    !isNonEmptyString(legalName) ||
    !isNonEmptyString(contactPerson) ||
    !isNonEmptyString(businessEmail)
  ) {
    res.status(400).json({
      message:
        "entityType, legalName, contactPerson, and businessEmail are required."
    });
    return;
  }

  try {
    const response = await saveMerchantDraft(
      {
        applicationId: isNonEmptyString(applicationId) ? applicationId : undefined,
        entityType,
        legalName,
        tradingName: isNonEmptyString(tradingName) ? tradingName : undefined,
        contactPerson,
        businessEmail,
        businessPhone: isNonEmptyString(businessPhone) ? businessPhone : undefined,
        projectedTransactions: isNonEmptyString(projectedTransactions)
          ? projectedTransactions
          : undefined,
        businessAddress: isNonEmptyString(businessAddress)
          ? businessAddress
          : undefined,
        productsDescription: isNonEmptyString(productsDescription)
          ? productsDescription
          : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save merchant draft.", error);
    sendApplicationError(res, error, "Failed to save merchant draft.");
  }
};

export const downloadApplicationDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  const documentId = req.params.documentId;

  if (!isNonEmptyString(documentId)) {
    res.status(400).json({
      message: "documentId is required."
    });
    return;
  }

  try {
    const { absolutePath, mimeType, originalFileName } =
      await getApplicationDocumentDownload(
        documentId,
        getAuthenticatedActor(req)
      );
    const safeFileName = originalFileName.replace(/["\\]/g, "_");

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(originalFileName)}`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");

    res.sendFile(absolutePath, (sendError) => {
      if (!sendError || res.headersSent) {
        return;
      }

      console.error("Failed to stream application document.", sendError);
      res.status(500).json({
        message: "Failed to stream application document."
      });
    });
  } catch (error) {
    console.error("Failed to download application document.", error);
    sendApplicationError(res, error, "Failed to download application document.");
  }
};

export const getApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  try {
    const application = await getApplicationDetailForUser(
      applicationId,
      getAuthenticatedActor(req)
    );

    if (!application) {
      res.status(404).json({
        message: "Application not found."
      });
      return;
    }

    res.status(200).json(application);
  } catch (error) {
    console.error("Failed to load application.", error);
    sendApplicationError(res, error, "Failed to load application.");
  }
};

export const getActiveApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const application = await getActiveApplicationDetailForUser(
      getAuthenticatedActor(req),
      isNonEmptyString(req.query.applicationType)
        ? req.query.applicationType
        : undefined
    );

    res.status(200).json(application);
  } catch (error) {
    console.error("Failed to load active application.", error);
    sendApplicationError(res, error, "Failed to load active application.");
  }
};

export const upsertAgentDraft = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    applicationId,
    entityType,
    legalName,
    tradingName,
    contactPerson,
    businessEmail,
    businessPhone,
    businessAddress,
    registrationNumber,
    taxNumber,
    yearsInOperation,
    serviceCoverage,
    outletCountEstimate,
    complianceContact
  } = req.body as Record<string, unknown>;

  if (
    !isNonEmptyString(entityType) ||
    !isNonEmptyString(legalName) ||
    !isNonEmptyString(contactPerson) ||
    !isNonEmptyString(businessEmail)
  ) {
    res.status(400).json({
      message:
        "entityType, legalName, contactPerson, and businessEmail are required."
    });
    return;
  }

  try {
    const response = await saveAgentDraft(
      {
        applicationId: isNonEmptyString(applicationId) ? applicationId : undefined,
        entityType,
        legalName,
        tradingName: isNonEmptyString(tradingName) ? tradingName : undefined,
        contactPerson,
        businessEmail,
        businessPhone: isNonEmptyString(businessPhone) ? businessPhone : undefined,
        businessAddress: isNonEmptyString(businessAddress)
          ? businessAddress
          : undefined,
        registrationNumber: isNonEmptyString(registrationNumber)
          ? registrationNumber
          : undefined,
        taxNumber: isNonEmptyString(taxNumber) ? taxNumber : undefined,
        yearsInOperation: isNonEmptyString(yearsInOperation)
          ? yearsInOperation
          : undefined,
        serviceCoverage: isNonEmptyString(serviceCoverage)
          ? serviceCoverage
          : undefined,
        outletCountEstimate: isNonEmptyString(outletCountEstimate)
          ? outletCountEstimate
          : undefined,
        complianceContact: isNonEmptyString(complianceContact)
          ? complianceContact
          : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save agent draft.", error);
    sendApplicationError(res, error, "Failed to save agent draft.");
  }
};

export const upsertPayerDraft = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    applicationId,
    entityType,
    legalName,
    tradingName,
    contactPerson,
    businessEmail,
    businessPhone,
    businessAddress,
    projectedTransactions,
    productsDescription,
    registrationNumber,
    taxNumber,
    serviceCoverage
  } = req.body as Record<string, unknown>;

  if (
    !isNonEmptyString(entityType) ||
    !isNonEmptyString(legalName) ||
    !isNonEmptyString(contactPerson) ||
    !isNonEmptyString(businessEmail)
  ) {
    res.status(400).json({
      message:
        "entityType, legalName, contactPerson, and businessEmail are required."
    });
    return;
  }

  try {
    const response = await savePayerDraft(
      {
        applicationId: isNonEmptyString(applicationId) ? applicationId : undefined,
        entityType,
        legalName,
        tradingName: isNonEmptyString(tradingName) ? tradingName : undefined,
        contactPerson,
        businessEmail,
        businessPhone: isNonEmptyString(businessPhone) ? businessPhone : undefined,
        businessAddress: isNonEmptyString(businessAddress)
          ? businessAddress
          : undefined,
        projectedTransactions: isNonEmptyString(projectedTransactions)
          ? projectedTransactions
          : undefined,
        productsDescription: isNonEmptyString(productsDescription)
          ? productsDescription
          : undefined,
        registrationNumber: isNonEmptyString(registrationNumber)
          ? registrationNumber
          : undefined,
        taxNumber: isNonEmptyString(taxNumber) ? taxNumber : undefined,
        serviceCoverage: isNonEmptyString(serviceCoverage)
          ? serviceCoverage
          : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save payer draft.", error);
    sendApplicationError(res, error, "Failed to save payer draft.");
  }
};

export const createComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const { message, sectionKey, visibility, commentType } = req.body as Record<
    string,
    unknown
  >;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (!isNonEmptyString(message)) {
    res.status(400).json({
      message: "message is required."
    });
    return;
  }

  try {
    const response = await createApplicationComment(
      applicationId,
      {
        message,
        sectionKey: isNonEmptyString(sectionKey) ? sectionKey : undefined,
        visibility: isNonEmptyString(visibility) ? visibility : undefined,
        commentType: isNonEmptyString(commentType) ? commentType : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to create application comment.", error);
    sendApplicationError(res, error, "Failed to create application comment.");
  }
};

export const updateCommentResolution = async (
  req: Request,
  res: Response
): Promise<void> => {
  const commentId = req.params.commentId;
  const { isResolved } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(commentId)) {
    res.status(400).json({
      message: "commentId is required."
    });
    return;
  }

  if (typeof isResolved !== "boolean") {
    res.status(400).json({
      message: "isResolved must be true or false."
    });
    return;
  }

  try {
    const response = await updateApplicationCommentResolution(
      commentId,
      isResolved,
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to update comment resolution.", error);
    sendApplicationError(res, error, "Failed to update comment resolution.");
  }
};

export const uploadApplicationDocuments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const { requirementCode } = req.body as Record<string, unknown>;
  const files = (req.files as Express.Multer.File[] | undefined) || [];

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (!isNonEmptyString(requirementCode)) {
    res.status(400).json({
      message: "requirementCode is required."
    });
    return;
  }

  if (files.length === 0) {
    res.status(400).json({
      message: "At least one file is required."
    });
    return;
  }

  try {
    const response = await replaceApplicationDocuments(
      applicationId,
      requirementCode,
      files,
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to upload application documents.", error);
    sendApplicationError(res, error, "Failed to upload application documents.");
  }
};

export const upsertMerchantContacts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    primaryContact,
    authorizedTransactors,
    signatories
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  const contact = primaryContact as Record<string, unknown> | undefined;

  if (
    !contact ||
    !isNonEmptyString(contact.fullName) ||
    !isNonEmptyString(contact.email) ||
    !isNonEmptyString(contact.phoneNumber)
  ) {
    res.status(400).json({
      message:
        "primaryContact.fullName, primaryContact.email, and primaryContact.phoneNumber are required."
    });
    return;
  }

  try {
    const response = await saveMerchantContacts(
      applicationId,
      {
        primaryContact: {
          fullName: contact.fullName,
          email: contact.email,
          phoneNumber: contact.phoneNumber,
          designation: isNonEmptyString(contact.designation)
            ? contact.designation
            : undefined,
          residentialAddress: isNonEmptyString(contact.residentialAddress)
            ? contact.residentialAddress
            : undefined
        },
        authorizedTransactors: Array.isArray(authorizedTransactors)
          ? (authorizedTransactors as Array<Record<string, unknown>>).map(
              (person) => ({
                fullName: isNonEmptyString(person.fullName) ? person.fullName : "",
                designation: isNonEmptyString(person.designation)
                  ? person.designation
                  : undefined,
                email: isNonEmptyString(person.email) ? person.email : undefined,
                phoneNumber: isNonEmptyString(person.phoneNumber)
                  ? person.phoneNumber
                  : undefined,
                nationalIdNumber: isNonEmptyString(person.nationalIdNumber)
                  ? person.nationalIdNumber
                  : undefined,
                residentialAddress: isNonEmptyString(person.residentialAddress)
                  ? person.residentialAddress
                  : undefined
              })
            )
          : [],
        signatories: Array.isArray(signatories)
          ? (signatories as Array<Record<string, unknown>>).map((person) => ({
              fullName: isNonEmptyString(person.fullName) ? person.fullName : "",
              designation: isNonEmptyString(person.designation)
                ? person.designation
                : undefined,
              email: isNonEmptyString(person.email) ? person.email : undefined,
              phoneNumber: isNonEmptyString(person.phoneNumber)
                ? person.phoneNumber
                : undefined,
              nationalIdNumber: isNonEmptyString(person.nationalIdNumber)
                ? person.nationalIdNumber
                : undefined,
              residentialAddress: isNonEmptyString(person.residentialAddress)
                ? person.residentialAddress
                : undefined,
              isPrimarySignatory: Boolean(person.isPrimarySignatory)
            }))
          : []
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save merchant contacts.", error);
    sendApplicationError(res, error, "Failed to save merchant contacts.");
  }
};

export const upsertAgentContacts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    primaryContact,
    authorizedTransactors,
    directors
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  const contact = primaryContact as Record<string, unknown> | undefined;

  if (
    !contact ||
    !isNonEmptyString(contact.fullName) ||
    !isNonEmptyString(contact.email) ||
    !isNonEmptyString(contact.phoneNumber)
  ) {
    res.status(400).json({
      message:
        "primaryContact.fullName, primaryContact.email, and primaryContact.phoneNumber are required."
    });
    return;
  }

  try {
    const response = await saveAgentContacts(
      applicationId,
      {
        primaryContact: {
          fullName: contact.fullName,
          email: contact.email,
          phoneNumber: contact.phoneNumber,
          designation: isNonEmptyString(contact.designation)
            ? contact.designation
            : undefined,
          residentialAddress: isNonEmptyString(contact.residentialAddress)
            ? contact.residentialAddress
            : undefined
        },
        authorizedTransactors: Array.isArray(authorizedTransactors)
          ? (authorizedTransactors as Array<Record<string, unknown>>).map(
              (person) => ({
                fullName: isNonEmptyString(person.fullName) ? person.fullName : "",
                designation: isNonEmptyString(person.designation)
                  ? person.designation
                  : undefined,
                email: isNonEmptyString(person.email) ? person.email : undefined,
                phoneNumber: isNonEmptyString(person.phoneNumber)
                  ? person.phoneNumber
                  : undefined,
                nationalIdNumber: isNonEmptyString(person.nationalIdNumber)
                  ? person.nationalIdNumber
                  : undefined,
                residentialAddress: isNonEmptyString(person.residentialAddress)
                  ? person.residentialAddress
                  : undefined
              })
            )
          : [],
        directors: Array.isArray(directors)
          ? (directors as Array<Record<string, unknown>>).map((person) => ({
              fullName: isNonEmptyString(person.fullName) ? person.fullName : "",
              designation: isNonEmptyString(person.designation)
                ? person.designation
                : undefined,
              email: isNonEmptyString(person.email) ? person.email : undefined,
              phoneNumber: isNonEmptyString(person.phoneNumber)
                ? person.phoneNumber
                : undefined,
              nationalIdNumber: isNonEmptyString(person.nationalIdNumber)
                ? person.nationalIdNumber
                : undefined,
              residentialAddress: isNonEmptyString(person.residentialAddress)
                ? person.residentialAddress
                : undefined,
              isPrimaryDirector: Boolean(person.isPrimaryDirector)
            }))
          : []
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save agent contacts.", error);
    sendApplicationError(res, error, "Failed to save agent contacts.");
  }
};

export const upsertPayerContacts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    primaryContact,
    operationsContacts,
    signatories
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  const contact = primaryContact as Record<string, unknown> | undefined;

  if (
    !contact ||
    !isNonEmptyString(contact.fullName) ||
    !isNonEmptyString(contact.email) ||
    !isNonEmptyString(contact.phoneNumber)
  ) {
    res.status(400).json({
      message:
        "primaryContact.fullName, primaryContact.email, and primaryContact.phoneNumber are required."
    });
    return;
  }

  try {
    const response = await savePayerContacts(
      applicationId,
      {
        primaryContact: {
          fullName: contact.fullName,
          email: contact.email,
          phoneNumber: contact.phoneNumber,
          designation: isNonEmptyString(contact.designation)
            ? contact.designation
            : undefined,
          residentialAddress: isNonEmptyString(contact.residentialAddress)
            ? contact.residentialAddress
            : undefined
        },
        operationsContacts: Array.isArray(operationsContacts)
          ? (operationsContacts as Array<Record<string, unknown>>).map(
              (person) => ({
                fullName: isNonEmptyString(person.fullName) ? person.fullName : "",
                designation: isNonEmptyString(person.designation)
                  ? person.designation
                  : undefined,
                email: isNonEmptyString(person.email) ? person.email : undefined,
                phoneNumber: isNonEmptyString(person.phoneNumber)
                  ? person.phoneNumber
                  : undefined,
                nationalIdNumber: isNonEmptyString(person.nationalIdNumber)
                  ? person.nationalIdNumber
                  : undefined,
                residentialAddress: isNonEmptyString(person.residentialAddress)
                  ? person.residentialAddress
                  : undefined
              })
            )
          : [],
        signatories: Array.isArray(signatories)
          ? (signatories as Array<Record<string, unknown>>).map((person) => ({
              fullName: isNonEmptyString(person.fullName) ? person.fullName : "",
              designation: isNonEmptyString(person.designation)
                ? person.designation
                : undefined,
              email: isNonEmptyString(person.email) ? person.email : undefined,
              phoneNumber: isNonEmptyString(person.phoneNumber)
                ? person.phoneNumber
                : undefined,
              nationalIdNumber: isNonEmptyString(person.nationalIdNumber)
                ? person.nationalIdNumber
                : undefined,
              residentialAddress: isNonEmptyString(person.residentialAddress)
                ? person.residentialAddress
                : undefined,
              isPrimarySignatory: Boolean(person.isPrimarySignatory)
            }))
          : []
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save payer contacts.", error);
    sendApplicationError(res, error, "Failed to save payer contacts.");
  }
};

export const upsertMerchantBanking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    accountName,
    bankName,
    branchName,
    branchCode,
    accountNumber,
    accountType,
    currency
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (
    !isNonEmptyString(accountName) ||
    !isNonEmptyString(bankName) ||
    !isNonEmptyString(accountNumber)
  ) {
    res.status(400).json({
      message:
        "accountName, bankName, and accountNumber are required."
    });
    return;
  }

  try {
    const response = await saveMerchantBanking(
      applicationId,
      {
        accountName,
        bankName,
        branchName: isNonEmptyString(branchName) ? branchName : undefined,
        branchCode: isNonEmptyString(branchCode) ? branchCode : undefined,
        accountNumber,
        accountType: isNonEmptyString(accountType) ? accountType : undefined,
        currency: isNonEmptyString(currency) ? currency : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save merchant banking details.", error);
    sendApplicationError(res, error, "Failed to save merchant banking details.");
  }
};

export const upsertAgentBanking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    accountName,
    bankName,
    branchName,
    branchCode,
    accountNumber,
    accountType,
    currency
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (
    !isNonEmptyString(accountName) ||
    !isNonEmptyString(bankName) ||
    !isNonEmptyString(accountNumber)
  ) {
    res.status(400).json({
      message: "accountName, bankName, and accountNumber are required."
    });
    return;
  }

  try {
    const response = await saveAgentBanking(
      applicationId,
      {
        accountName,
        bankName,
        branchName: isNonEmptyString(branchName) ? branchName : undefined,
        branchCode: isNonEmptyString(branchCode) ? branchCode : undefined,
        accountNumber,
        accountType: isNonEmptyString(accountType) ? accountType : undefined,
        currency: isNonEmptyString(currency) ? currency : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save agent banking details.", error);
    sendApplicationError(res, error, "Failed to save agent banking details.");
  }
};

export const upsertAgentOperations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    outlets,
    complianceContact,
    operationalDetails
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  try {
    const response = await saveAgentOperations(
      applicationId,
      {
        outlets: Array.isArray(outlets)
          ? (outlets as Array<Record<string, unknown>>).map((outlet) => ({
              name: isNonEmptyString(outlet.name) ? outlet.name : "",
              location: isNonEmptyString(outlet.location)
                ? outlet.location
                : undefined,
              contactPerson: isNonEmptyString(outlet.contactPerson)
                ? outlet.contactPerson
                : undefined,
              code: isNonEmptyString(outlet.code) ? outlet.code : undefined,
              phoneNumber: isNonEmptyString(outlet.phoneNumber)
                ? outlet.phoneNumber
                : undefined,
              email: isNonEmptyString(outlet.email) ? outlet.email : undefined,
              addressLine1: isNonEmptyString(outlet.addressLine1)
                ? outlet.addressLine1
                : undefined,
              addressLine2: isNonEmptyString(outlet.addressLine2)
                ? outlet.addressLine2
                : undefined,
              city: isNonEmptyString(outlet.city) ? outlet.city : undefined,
              province: isNonEmptyString(outlet.province)
                ? outlet.province
                : undefined,
              country: isNonEmptyString(outlet.country) ? outlet.country : undefined
            }))
          : [],
        complianceContact: isNonEmptyString(complianceContact)
          ? complianceContact
          : undefined,
        operationalDetails: isNonEmptyString(operationalDetails)
          ? operationalDetails
          : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save agent operations.", error);
    sendApplicationError(res, error, "Failed to save agent operations.");
  }
};

export const upsertPayerBanking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    accountName,
    bankName,
    branchName,
    branchCode,
    accountNumber,
    accountType,
    currency
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (
    !isNonEmptyString(accountName) ||
    !isNonEmptyString(bankName) ||
    !isNonEmptyString(accountNumber)
  ) {
    res.status(400).json({
      message: "accountName, bankName, and accountNumber are required."
    });
    return;
  }

  try {
    const response = await savePayerBanking(
      applicationId,
      {
        accountName,
        bankName,
        branchName: isNonEmptyString(branchName) ? branchName : undefined,
        branchCode: isNonEmptyString(branchCode) ? branchCode : undefined,
        accountNumber,
        accountType: isNonEmptyString(accountType) ? accountType : undefined,
        currency: isNonEmptyString(currency) ? currency : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save payer banking details.", error);
    sendApplicationError(res, error, "Failed to save payer banking details.");
  }
};

export const upsertPayerSettlement = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    settlementMethod,
    reconciliationEmail,
    integrationNotes
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  try {
    const response = await savePayerSettlement(
      applicationId,
      {
        settlementMethod: isNonEmptyString(settlementMethod)
          ? settlementMethod
          : undefined,
        reconciliationEmail: isNonEmptyString(reconciliationEmail)
          ? reconciliationEmail
          : undefined,
        integrationNotes: isNonEmptyString(integrationNotes)
          ? integrationNotes
          : undefined
      },
      getAuthenticatedActor(req)
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save payer settlement.", error);
    sendApplicationError(res, error, "Failed to save payer settlement.");
  }
};

export const submitMerchant = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    signerName,
    signerTitle,
    acceptedTerms,
    certifiedInformation,
    authorizedToAct
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (!isNonEmptyString(signerName)) {
    res.status(400).json({
      message: "signerName is required."
    });
    return;
  }

  try {
    const response = await submitMerchantApplication(
      applicationId,
      {
        signerName,
        signerTitle: isNonEmptyString(signerTitle) ? signerTitle : undefined,
        acceptedTerms: Boolean(acceptedTerms),
        certifiedInformation: Boolean(certifiedInformation),
        authorizedToAct: Boolean(authorizedToAct)
      },
      getAuthenticatedActor(req),
      req.ip
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to submit merchant application.", error);
    sendApplicationError(res, error, "Failed to submit merchant application.");
  }
};

export const submitAgent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    signerName,
    signerTitle,
    acceptedTerms,
    certifiedInformation,
    authorizedToAct
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (!isNonEmptyString(signerName)) {
    res.status(400).json({
      message: "signerName is required."
    });
    return;
  }

  try {
    const response = await submitAgentApplication(
      applicationId,
      {
        signerName,
        signerTitle: isNonEmptyString(signerTitle) ? signerTitle : undefined,
        acceptedTerms: Boolean(acceptedTerms),
        certifiedInformation: Boolean(certifiedInformation),
        authorizedToAct: Boolean(authorizedToAct)
      },
      getAuthenticatedActor(req),
      req.ip
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to submit agent application.", error);
    sendApplicationError(res, error, "Failed to submit agent application.");
  }
};

export const submitPayer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const applicationId = req.params.applicationId;
  const {
    signerName,
    signerTitle,
    acceptedTerms,
    certifiedInformation,
    authorizedToAct
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(applicationId)) {
    res.status(400).json({
      message: "applicationId is required."
    });
    return;
  }

  if (!isNonEmptyString(signerName)) {
    res.status(400).json({
      message: "signerName is required."
    });
    return;
  }

  try {
    const response = await submitPayerApplication(
      applicationId,
      {
        signerName,
        signerTitle: isNonEmptyString(signerTitle) ? signerTitle : undefined,
        acceptedTerms: Boolean(acceptedTerms),
        certifiedInformation: Boolean(certifiedInformation),
        authorizedToAct: Boolean(authorizedToAct)
      },
      getAuthenticatedActor(req),
      req.ip
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to submit payer application.", error);
    sendApplicationError(res, error, "Failed to submit payer application.");
  }
};
