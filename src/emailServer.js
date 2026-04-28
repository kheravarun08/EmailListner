
require("dotenv").config();

const Imap = require("imap");
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");
const cheerio = require("cheerio");
const svg2img = require("svg2img");

// ==============================
// CONFIG
// ==============================

const IMAP_CONFIG = {
  user: process.env.EMAIL_ACCOUNT,
  password: process.env.PASSWORD,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false,
  },
};

const CHECK_INTERVAL = 10000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let lastUID = 0; // ✅ Tracks latest email at startup

// ==============================
// LLM FUNCTIONS
// ==============================

async function getResponse(query) {
  const res = await client.responses.create({
    model: "gpt-4.1",
    input: `Convert dataset to HTML table:\n${query}`,
  });
  return res.output_text;
}

async function getSummary(query, df) {
  const res = await client.responses.create({
    model: "gpt-4.1",
    input: `Summarize:\nQuery: ${query}\nData: ${df}`,
  });
  return res.output_text;
}

async function getSVGChart(df) {
  const res = await client.responses.create({
    model: "gpt-4.1",
    input: `Return ONLY SVG for data:\n${df}`,
  });
  return res.output_text.trim();
}

// ==============================
// SVG → PNG
// ==============================

function convertSvgToPng(svg) {
  return new Promise((resolve, reject) => {
    svg2img(svg, (error, buffer) => {
      if (error) reject(error);
      else resolve(buffer);
    });
  });
}

// ==============================
// CLEAN HTML
// ==============================

function cleanHtml(html) {
  const $ = cheerio.load(html);
  return $.text();
}

// ==============================
// EMAIL SENDER
// ==============================

async function sendEmail(query, result) {
  const dataframe = result?.dataframe || [];

  const summary = await getSummary(query, dataframe);
  const summaryHtml = summary.replace(/\n/g, "<br>");

  const svg = await getSVGChart(dataframe);
  const pngBuffer = await convertSvgToPng(svg);

  const tableHtmlRaw = await getResponse(dataframe);
  const tableMatch = tableHtmlRaw.match(/<table.*?>.*?<\/table>/s);
  const tableHtml = tableMatch ? tableMatch[0] : "";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ACCOUNT,
      pass: process.env.PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_ACCOUNT,
    to: process.env.RECIPIENT,
    subject: query,
    html: `
      <p>Dear Recipient,</p>
      <p>${summaryHtml}</p>
      <img src="cid:chart"/>
      ${tableHtml}
      <p>Regards</p>
    `,
    attachments: [
      {
        filename: "chart.png",
        content: pngBuffer,
        cid: "chart",
      },
    ],
  });

  console.log("✅ Email sent");
}

// ==============================
// MAIN LISTENER
// ==============================

function startListener() {
  const imap = new Imap(IMAP_CONFIG);

  imap.once("ready", () => {
    console.log("📥 Listening...");

    imap.openBox("INBOX", false, (err, box) => {
      if (err) return console.error(err);

      // ✅ Python equivalent: total message count
      lastSeen = box.messages.total;

      console.log("🚀 Ignoring old emails. Starting count:", lastSeen);

      // Start polling
      setInterval(() => checkNewEmails(imap), CHECK_INTERVAL);
    });
  });

  imap.once("error", (err) => {
    console.error("IMAP ERROR:", err);
  });

  imap.connect();
}

// ==============================
// CHECK NEW EMAILS
// ==============================

function checkNewEmails(imap) {
  imap.openBox("INBOX", false, (err, box) => {
    if (err) return console.error(err);

    const currentCount = box.messages.total;

    // ✅ Only process emails added AFTER server start
    if (currentCount <= lastSeen) return;

    const start = lastSeen + 1;
    const end = currentCount;

    const fetch = imap.seq.fetch(`${start}:${end}`, { bodies: "" });

    fetch.on("message", (msg) => {
      msg.on("body", async (stream) => {
        try {
          const parsed = await simpleParser(stream);

          console.log("\n====== NEW EMAIL ======");
          console.log("From:", parsed.from?.text);
          console.log("Subject:", parsed.subject);

          const body =
            parsed.text || cleanHtml(parsed.html || "");

          console.log("\nBody:\n", body);

          const result = {
            dataframe: [],
            answer: ["Sample"],
          };

        //   await sendEmail(body, result);
        } catch (err) {
          console.error("Processing error:", err);
        }
      });
    });

    // ✅ Update tracker (same as Python last_seen)
    lastSeen = currentCount;
  });
}

// ==============================
// START
// ==============================

startListener();