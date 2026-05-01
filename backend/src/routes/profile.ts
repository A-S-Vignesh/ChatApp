import { Router } from "express";
import User from "../models/User.js";
import {
  protectRoute,
  AuthenticatedRequest,
} from "../middleware/protectRoute.js";

const router = Router();

router.get("/me",async (req: AuthenticatedRequest, res) => {
  console.log("Auth user:", req.user);

  const user = await User.findOne({ email: req.user!.email });

  if (!user) {
    return res.status(404).json({ message: "User not found in app DB" });
  }

  res.json(user);
});

export default router;
