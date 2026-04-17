import { Router } from "express";
import multer from "multer";
import {
  getApplication,
  upsertMerchantContacts,
  uploadApplicationDocuments,
  upsertMerchantDraft
} from "../controllers/applicationController";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
    files: 10
  },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF, JPG, JPEG, and PNG files are allowed."));
  }
});

const router = Router();

router.post("/merchant-draft", upsertMerchantDraft);
router.post("/:applicationId/merchant-contacts", upsertMerchantContacts);
router.get("/:applicationId", getApplication);
router.post(
  "/:applicationId/documents",
  upload.array("files", 10),
  uploadApplicationDocuments
);

export default router;
