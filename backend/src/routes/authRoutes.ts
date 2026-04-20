import { Router } from "express";
import {
  login,
  logout,
  me,
  register,
  updateCurrentPassword,
  updateCurrentProfile
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", me);
router.get("/session", requireAuth, me);
router.patch("/profile", requireAuth, updateCurrentProfile);
router.post("/change-password", requireAuth, updateCurrentPassword);

export default router;
