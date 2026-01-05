import dotenv from "dotenv";

dotenv.config();

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change_me",
  allowNegativeStock: (process.env.ALLOW_NEGATIVE_STOCK || "false").toLowerCase() === "true"
};

export default config;