import { Request, Response } from "express";
import { getUsers } from "../services/userService";

export const listUsers = (_req: Request, res: Response): void => {
  res.status(200).json(getUsers());
};
