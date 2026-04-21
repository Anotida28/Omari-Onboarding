import { Request, Response } from "express";
import { getUsers } from "../services/userService";

export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await getUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("Failed to load internal users.", error);
    res.status(500).json({
      message: "Failed to load internal users."
    });
  }
};
