import { getSummary, getResponse, getSVGChart } from "../services/llmTools.js";
import { sendEmail } from "../services/emailSender.js";

export const tools = {
  summarize: async (data) => {
    return await getSummary("query", data);
  },

  generateReport: async (data) => {
    return await getResponse(data);
  },

  generateChart: async ({ data, type }) => {
    return await getSVGChart({ data, type });
  },

  sendEmail: async ({ subject, html, chart }) => {
    await sendEmail(subject, html, chart);
    return "Email sent";
  }
};