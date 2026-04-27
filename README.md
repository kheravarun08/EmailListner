# 📧 Email Listener Application

This project is a Node.js-based Email Listener application that monitors an inbox, processes incoming emails, and enables automation workflows.

---

## 🚀 Features

- Listens to a configured email inbox in real-time  
- Detects and processes newly received emails  
- Extracts key email data:
  - Subject  
  - Body  
  - Sender (From)  
  - Recipient (To)  
- Identifies and retrieves the latest email from the inbox  
- Integrates with APIs and LLMs for intelligent processing  
- Sends automated responses back to the sender  

---

## ⚙️ How It Works

1. The server starts and connects to a specified email inbox  
2. It continuously listens for new incoming emails  
3. When a new email is received:
   - Extracts relevant details (subject, body, sender, recipient)  
   - Treats the email body as an input/query  
   - Sends the query to an API interacting with an LLM  
   - The LLM processes the request step-by-step  
   - Generates a final response  
   - Sends the response back via email  

---

## 💡 Use Cases

- Email-based automation systems  
- Workflow execution via email commands  
- Customer support automation  
- Integration with AI/LLM-powered agents  
- Foundation for building Agentic AI applications  

---

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
