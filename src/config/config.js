import dotenv from "dotenv";
dotenv.config({ debug: true });

export const IMAP_CONFIG = {
  user: process.env.EMAIL_ACCOUNT,
  password: process.env.PASSWORD,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

export const OPENAI_KEY = process.env.OPENAI_API_KEY;