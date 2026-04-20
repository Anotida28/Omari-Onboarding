import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { listUsers } from "../controllers/userController";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/", listUsers);

export default router;
