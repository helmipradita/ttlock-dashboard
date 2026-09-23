import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  clientId: process.env.CLIENT_ID || "",
  clientSecret: process.env.CLIENT_SECRET || "",
  username: process.env.USERNAME || "",
  password: process.env.PASSWORD || "",
  port: parseInt(process.env.PORT || "5757", 10),
  ttlockBaseUrl: "https://api.sciener.com",
};
