import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "path";
import applicationRoutes from "./routes/applicationRoutes";
import documentRequirementRoutes from "./routes/documentRequirementRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: frontendOrigin
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is running"
  });
});

app.use("/api/applications", applicationRoutes);
app.use("/api/document-requirements", documentRequirementRoutes);
app.use("/api/users", userRoutes);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        message: error.message
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        message: error.message
      });
      return;
    }

    next(error);
  }
);

export default app;
