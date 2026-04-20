import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { attachCurrentUser } from "./middleware/auth";
import applicationRoutes from "./routes/applicationRoutes";
import authRoutes from "./routes/authRoutes";
import documentRequirementRoutes from "./routes/documentRequirementRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(attachCurrentUser);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/document-requirements", documentRequirementRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/users", userRoutes);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        message: error.message
      });
      return;
    }

    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      (error as { type?: string }).type === "entity.parse.failed"
    ) {
      res.status(400).json({
        message: "Invalid JSON payload."
      });
      return;
    }

    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as { status?: number }).status === "number"
    ) {
      const statusCode = (error as { status: number }).status;

      if (statusCode >= 400 && statusCode < 500) {
        res.status(statusCode).json({
          message:
            error instanceof Error && error.message
              ? error.message
              : "Request could not be completed."
        });
        return;
      }
    }

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof (error as { statusCode?: number }).statusCode === "number"
    ) {
      const statusCode = (error as { statusCode: number }).statusCode;

      if (statusCode >= 400 && statusCode < 500) {
        res.status(statusCode).json({
          message:
            error instanceof Error && error.message
              ? error.message
              : "Request could not be completed."
        });
        return;
      }
    }

    console.error("Unhandled application error.", error);
    res.status(500).json({
      message: "Internal server error."
    });
  }
);

export default app;
