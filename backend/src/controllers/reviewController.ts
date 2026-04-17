import { Request, Response } from "express";
import {
  approveApplication,
  listReviewApplications,
  rejectApplication,
  reviewApplicationDocument,
  requestApplicationInformation
} from "../services/reviewService";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getErrorStatusCode = (error: unknown): number => {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message === "Application not found." ||
    error.message === "Document not found." ||
    error.message === "No document requirements were found for that entity type."
  ) {
    return 404;
  }

  if (
    error.message.includes("required") ||
    error.message.includes("must") ||
    error.message.includes("already in that status") ||
    error.message.includes("not available for review actions") ||
    error.message.includes("can no longer be edited")
  ) {
    return 400;
  }

  return 500;
};

const sendReviewError = (
  res: Response,
  error: unknown,
  fallbackMessage: string
): void => {
  if (error instanceof Error) {
    res.status(getErrorStatusCode(error)).json({
      message: error.message
    });
    return;
  }

  res.status(500).json({
    message: fallbackMessage
  });
};

export const listReviewQueue = async (
  req: Request,
  res: Response
): Promise<void> => {
  const scope = isNonEmptyString(req.query.scope) ? req.query.scope : "pending";

  try {
    const response = await listReviewApplications(scope);
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to load review queue.", error);
    res.status(500).json({
      message: "Failed to load review queue."
    });
  }
};

const getActionNote = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

const getDocumentReviewStatus = (
  value: unknown
): "pending" | "accepted" | "rejected" | null => {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "accepted" ||
    normalized === "rejected"
  ) {
    return normalized;
  }

  return null;
};

export const requestInfo = async (
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
    const response = await requestApplicationInformation(applicationId, {
      note: getActionNote((req.body as Record<string, unknown>).note)
    });
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to request more information.", error);
    sendReviewError(res, error, "Failed to request more information.");
  }
};

export const approve = async (
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
    const response = await approveApplication(applicationId, {
      note: getActionNote((req.body as Record<string, unknown>).note)
    });
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to approve application.", error);
    sendReviewError(res, error, "Failed to approve application.");
  }
};

export const reject = async (
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
    const response = await rejectApplication(applicationId, {
      note: getActionNote((req.body as Record<string, unknown>).note)
    });
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to reject application.", error);
    sendReviewError(res, error, "Failed to reject application.");
  }
};

export const reviewDocument = async (
  req: Request,
  res: Response
): Promise<void> => {
  const documentId = req.params.documentId;
  const body = req.body as Record<string, unknown>;
  const status = getDocumentReviewStatus(body.status);

  if (!isNonEmptyString(documentId)) {
    res.status(400).json({
      message: "documentId is required."
    });
    return;
  }

  if (!status) {
    res.status(400).json({
      message: "status must be pending, accepted, or rejected."
    });
    return;
  }

  try {
    const response = await reviewApplicationDocument(documentId, {
      status,
      note: getActionNote(body.note)
    });
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to review document.", error);
    sendReviewError(res, error, "Failed to review document.");
  }
};
