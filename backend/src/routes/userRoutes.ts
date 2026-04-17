import { Router } from "express";
import { listUsers } from "../controllers/userController";

const router = Router();

router.get("/", listUsers);

export default router;
