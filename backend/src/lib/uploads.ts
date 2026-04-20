import { access, mkdir, unlink } from "fs/promises";
import path from "path";

export const uploadRoot = path.resolve(process.cwd(), "uploads");

export const ensureUploadDirectory = async (
  ...segments: string[]
): Promise<string> => {
  const fullPath = path.join(uploadRoot, ...segments);
  await mkdir(fullPath, { recursive: true });
  return fullPath;
};

export const deleteStoredFile = async (
  relativePath: string | null | undefined
): Promise<void> => {
  if (!relativePath) {
    return;
  }

  try {
    await unlink(path.join(uploadRoot, relativePath));
  } catch {
    // If the file has already been removed, we can safely continue.
  }
};

export const resolveStoredFilePath = (relativePath: string): string => {
  const resolvedPath = path.resolve(uploadRoot, relativePath);
  const normalizedUploadRoot = `${uploadRoot}${path.sep}`;

  if (
    resolvedPath !== uploadRoot &&
    !resolvedPath.startsWith(normalizedUploadRoot)
  ) {
    throw new Error("Stored file path is invalid.");
  }

  return resolvedPath;
};

export const ensureStoredFileExists = async (absolutePath: string): Promise<void> => {
  await access(absolutePath);
};
