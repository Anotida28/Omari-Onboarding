import { Request, Response } from "express";
import {
  getApplicationDetail,
  replaceApplicationDocuments,
  saveMerchantContacts,
  saveMerchantDraft
} from "../services/applicationService";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

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
    const response = await saveMerchantDraft({
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
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save merchant draft.", error);
    res.status(500).json({
      message: "Failed to save merchant draft."
    });
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
    const application = await getApplicationDetail(applicationId);

    if (!application) {
      res.status(404).json({
        message: "Application not found."
      });
      return;
    }

    res.status(200).json(application);
  } catch (error) {
    console.error("Failed to load application.", error);
    res.status(500).json({
      message: "Failed to load application."
    });
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
      files
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to upload application documents.", error);
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to upload application documents."
    });
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
    const response = await saveMerchantContacts(applicationId, {
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
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to save merchant contacts.", error);
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to save merchant contacts."
    });
  }
};
