import { Router } from "express";
import { listDocumentRequirements } from "../controllers/documentRequirementController";

const router = Router();

router.get("/", listDocumentRequirements);

export default router;
