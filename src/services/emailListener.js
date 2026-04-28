import Imap from "imap";
import { simpleParser } from "mailparser";
import { IMAP_CONFIG } from "../config/config.js";
import { runAgent } from "../agent/agent.js";

const serverStartTime = new Date();
let lastSeen = 0;   
const CHECK_INTERVAL = 10000; // 10 seconds                 

export function startListener() {
  const imap = new Imap(IMAP_CONFIG);

  imap.once("ready", () => {
    console.log("📥 Listening...");

    imap.openBox("INBOX", false, (err, box) => {
      if (err) return console.error(err);

      lastSeen = box.messages.total;

      console.log("🚀 Ignoring old emails. Starting count:", lastSeen);

      setInterval(() => checkNewEmails(imap), CHECK_INTERVAL);
    });
  });

  imap.connect();
}


function checkNewEmails(imap) {
  // ✅ Use already selected mailbox
  const currentCount = imap._box.messages.total;

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
         await runAgent(body);

      } catch (err) {
        console.error("Processing error:", err);
      }
    });
  });

  // ✅ update pointer
  lastSeen = currentCount;
}