import { Router } from "express";
import profileRoutes from "./profile.js";
import { protectRoute } from "../middleware/protectRoute.js";
import messageRoutes from "./message.js";
import chatRoutes from "./chat.js";
import pushRoutes from "./push.js";

const router = Router();

router.use("/profile", protectRoute, profileRoutes);
router.use("/messages", protectRoute, messageRoutes);
router.use("/chat", protectRoute, chatRoutes);
router.use("/push", protectRoute, pushRoutes);

export default router;