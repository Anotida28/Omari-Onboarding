import { prisma } from "../lib/prisma";

export interface DocumentRequirementItem {
  code: string;
  label: string;
  description: string | null;
  allowedExtensions: string[];
  maxFiles: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface DocumentRequirementResponse {
  applicationType: string;
  entityType: string | null;
  availableEntityTypes: string[];
  requirements: DocumentRequirementItem[];
}

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const mapAllowedExtensions = (extensions: string): string[] =>
  extensions
    .split(",")
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean);

export const getDocumentRequirements = async (
  applicationType: string,
  entityType?: string
): Promise<DocumentRequirementResponse> => {
  const normalizedApplicationType = normalizeValue(applicationType);
  const normalizedEntityType = entityType ? normalizeValue(entityType) : null;

  const entityTypeRows = await prisma.documentRequirement.groupBy({
    by: ["entityType"],
    where: {
      applicationType: normalizedApplicationType
    },
    orderBy: {
      entityType: "asc"
    }
  });

  const availableEntityTypes = entityTypeRows
    .map((row) => row.entityType)
    .filter((rowEntityType) => rowEntityType !== "any");

  if (!normalizedEntityType) {
    return {
      applicationType: normalizedApplicationType,
      entityType: null,
      availableEntityTypes,
      requirements: []
    };
  }

  const requirements = await prisma.documentRequirement.findMany({
    where: {
      applicationType: normalizedApplicationType,
      OR: [{ entityType: normalizedEntityType }, { entityType: "any" }]
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
  });

  return {
    applicationType: normalizedApplicationType,
    entityType: normalizedEntityType,
    availableEntityTypes,
    requirements: requirements.map((requirement) => ({
      code: requirement.code,
      label: requirement.label,
      description: requirement.description,
      allowedExtensions: mapAllowedExtensions(requirement.allowedExtensions),
      maxFiles: requirement.maxFiles,
      isRequired: requirement.isRequired,
      sortOrder: requirement.sortOrder
    }))
  };
};
