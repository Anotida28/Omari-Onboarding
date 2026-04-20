"use client";

import { useRef } from "react";
import { Upload, X, File } from "lucide-react";
import { Button } from "components/ui/button";
import { Card } from "components/ui/card";
import { cn } from "lib/utils";

export interface FileWithMetadata {
  file: File;
  metadata?: {
    fileName: string;
    fileUrl: string;
    mimeType: string;
    uploadedAt: string;
    uploadedBy: number;
  };
}

interface FileUploadAreaProps {
  files: FileWithMetadata[];
  onFilesChange: (files: FileWithMetadata[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

export function FileUploadArea({
  files,
  onFilesChange,
  maxFiles = 10,
  acceptedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ],
  className,
  disabled = false,
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      e.target.value = "";
      return;
    }
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = selectedFiles.filter((file) => {
      const isValid = acceptedTypes.includes(file.type);
      if (!isValid) {
        alert(
          `File ${file.name} has invalid type. Allowed types: PDF, JPEG, PNG, WEBP`,
        );
      }
      return isValid;
    });

    if (files.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const sizeValidFiles = validFiles.filter((file) => {
      const isValid = file.size <= 10 * 1024 * 1024;
      if (!isValid) {
        alert(`File ${file.name} exceeds 10MB limit`);
      }
      return isValid;
    });

    const newFiles: FileWithMetadata[] = sizeValidFiles.map((file) => ({
      file,
    }));

    onFilesChange([...files, ...newFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    if (disabled) return;
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "border-2 border-dashed border-border/80 bg-muted/30 p-6 transition-colors",
          disabled
            ? "opacity-60"
            : "hover:border-primary/50 dark:hover:border-primary/40",
        )}
      >
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Click to upload files or drag and drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPEG, PNG, WEBP (Max 10MB per file, {maxFiles} files max)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload input"
            disabled={disabled}
          />
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Selected Files:</p>
          <div className="space-y-2">
            {files.map((fileWithMeta, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-card-foreground"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                    <File className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {fileWithMeta.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(fileWithMeta.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                  aria-label={`Remove ${fileWithMeta.file.name}`}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
