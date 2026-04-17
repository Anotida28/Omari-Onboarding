import { User } from "../models/userModel";

const users: User[] = [
  {
    id: 1,
    name: "Omari",
    role: "Admin",
    email: "omari@example.com"
  },
  {
    id: 2,
    name: "Tariro",
    role: "Editor",
    email: "tariro@example.com"
  },
  {
    id: 3,
    name: "Ashley",
    role: "Viewer",
    email: "ashley@example.com"
  }
];

export const getUsers = (): User[] => users;
