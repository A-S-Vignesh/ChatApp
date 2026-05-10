import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGO_URI, {
      autoIndex: true,
    });
    logger.info("mongodb connected");
  } catch (err) {
    logger.fatal({ err }, "mongodb connection failed");
    process.exit(1);
  }
};
