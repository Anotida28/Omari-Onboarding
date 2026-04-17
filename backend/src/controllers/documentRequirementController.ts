import { Request, Response } from "express";
import { getDocumentRequirements } from "../services/documentRequirementService";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const listDocumentRequirements = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { applicationType, entityType } = req.query;

  if (!isNonEmptyString(applicationType)) {
    res.status(400).json({
      message: "The applicationType query parameter is required."
    });
    return;
  }

  if (entityType !== undefined && !isNonEmptyString(entityType)) {
    res.status(400).json({
      message: "If provided, entityType must be a non-empty string."
    });
    return;
  }

  try {
    const response = await getDocumentRequirements(applicationType, entityType);

    if (
      response.entityType &&
      response.requirements.length === 0 &&
      !response.availableEntityTypes.includes(response.entityType)
    ) {
      res.status(404).json({
        message: "No document requirements were found for that entity type.",
        applicationType: response.applicationType,
        entityType: response.entityType,
        availableEntityTypes: response.availableEntityTypes
      });
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to load document requirements.", error);
    res.status(500).json({
      message: "Failed to load document requirements."
    });
  }
};
