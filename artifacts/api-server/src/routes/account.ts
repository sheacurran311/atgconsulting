import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";

const router = Router();

router.get("/account", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to view your account." });
    return;
  }
  // Identity always comes from the verified session, never a submitted user ID.
  const user = await clerkClient.users.getUser(userId);
  res.json({
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ?? "",
  });
});

export default router;
