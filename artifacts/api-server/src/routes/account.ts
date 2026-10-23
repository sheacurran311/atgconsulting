import { Router } from "express";
import { withUser, type AuthedRequest } from "../lib/auth";

const router = Router();

router.get("/account", withUser, async (req, res) => {
  const user = (req as AuthedRequest).atgUser;
  if (!user) {
    res.status(401).json({ error: "Sign in to view your account." });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    role: user.role,
    isAdmin: user.role === "ADMIN",
    clientId: user.clientId,
  });
});

export default router;
