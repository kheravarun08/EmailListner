import OpenAI from "openai";
import { OPENAI_KEY } from "../config/config.js";

export const client = new OpenAI({
  apiKey: OPENAI_KEY
});