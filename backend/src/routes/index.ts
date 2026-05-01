import { Router } from "express";
import profileRoutes from "./profile.js";
import { protectRoute } from "../middleware/protectRoute.js";
import messageRoutes from "./message.js"
import chatRoutes from "./chat.js"


const router = Router();

router.use("/profile", protectRoute, profileRoutes);
router.use("/messages", protectRoute, messageRoutes);
router.use("/chat", protectRoute, chatRoutes);



export default router;