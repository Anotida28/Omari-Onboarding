import { Router } from "express";
import multer from "multer";
import { requireApplicant, requireAuth } from "../middleware/auth";
import {
  createComment,
  downloadApplicationDocument,
  getActiveApplication,
  getApplication,
  submitAgent,
  submitPayer,
  submitMerchant,
  updateCommentResolution,
  upsertAgentBanking,
  upsertAgentContacts,
  upsertAgentDraft,
  upsertAgentOperations,
  upsertPayerBanking,
  upsertPayerContacts,
  upsertPayerDraft,
  upsertPayerSettlement,
  upsertMerchantBanking,
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

router.use(requireAuth);
router.get("/active", requireApplicant, getActiveApplication);
router.get("/documents/:documentId/download", downloadApplicationDocument);
router.post("/agent-draft", requireApplicant, upsertAgentDraft);
router.post("/payer-draft", requireApplicant, upsertPayerDraft);
router.post("/merchant-draft", requireApplicant, upsertMerchantDraft);
router.post("/:applicationId/comments", createComment);
router.patch("/comments/:commentId", updateCommentResolution);
router.post("/:applicationId/agent-contacts", requireApplicant, upsertAgentContacts);
router.post("/:applicationId/agent-banking", requireApplicant, upsertAgentBanking);
router.post("/:applicationId/agent-operations", requireApplicant, upsertAgentOperations);
router.post("/:applicationId/agent-submit", requireApplicant, submitAgent);
router.post("/:applicationId/payer-contacts", requireApplicant, upsertPayerContacts);
router.post("/:applicationId/payer-banking", requireApplicant, upsertPayerBanking);
router.post("/:applicationId/payer-settlement", requireApplicant, upsertPayerSettlement);
router.post("/:applicationId/payer-submit", requireApplicant, submitPayer);
router.post("/:applicationId/merchant-contacts", requireApplicant, upsertMerchantContacts);
router.post("/:applicationId/merchant-banking", requireApplicant, upsertMerchantBanking);
router.post("/:applicationId/merchant-submit", requireApplicant, submitMerchant);
router.get("/:applicationId", getApplication);
router.post(
  "/:applicationId/documents",
  requireApplicant,
  upload.array("files", 10),
  uploadApplicationDocuments
);

export default router;
