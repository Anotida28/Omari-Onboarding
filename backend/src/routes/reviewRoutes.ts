import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import {
  approve,
  listReviewQueue,
  reject,
  reviewDocument,
  requestInfo
} from "../controllers/reviewController";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/applications", listReviewQueue);
router.post("/documents/:documentId/review", reviewDocument);
router.post("/applications/:applicationId/request-info", requestInfo);
router.post("/applications/:applicationId/approve", approve);
router.post("/applications/:applicationId/reject", reject);

export default router;
