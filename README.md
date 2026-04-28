# 📧 AI Email Agent (Node.js)

A **Node.js-based AI Email Listener** that reads incoming emails, understands intent using an LLM, and automatically generates intelligent responses including summaries, reports, and charts.

---

## 🚀 Features

- 📥 Listens to an email inbox in real-time  
- 🧠 Uses AI to interpret email content  
- 📊 Generates:
  - Summary  
  - HTML report (table)  
  - Charts (bar / pie / histogram)  
- 🖼 Converts charts (SVG → PNG) for email compatibility  
- 📧 Sends automated responses  
- ⚡ Built as a foundation for **Agentic AI workflows**

---

## 🧠 How It Works

1. The app connects to an email inbox using IMAP  
2. Continuously listens for new emails  
3. When a new email arrives:
   - Extracts subject, body, sender details  
   - Treats the email body as a query  
4. The AI Agent:
   - Breaks the task into steps  
   - Calls tools (summarize, report, chart)  
   - Decides the final response  
5. Generates an HTML email with insights  
6. Sends reply via SMTP  


---
## Generate .env File with this data

- EMAIL_ACCOUNT=your_email@gmail.com
- PASSWORD=your_app_password
- RECIPIENT=receiver@gmail.com
- OPENAI_API_KEY=sk-xxxxxxxxxxxx

---

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
