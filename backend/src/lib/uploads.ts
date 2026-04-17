import { mkdir, unlink } from "fs/promises";
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
