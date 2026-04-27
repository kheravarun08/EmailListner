This project is a Node.js-based Email Listener application that monitors an inbox, processes incoming emails, and enables automation workflows.

🚀 Features
Listens to a configured email inbox in real-time
Detects and processes newly received emails
Extracts key email data:
Subject
Body
Sender (From)
Recipient (To)
Identifies and retrieves the latest email from the inbox
Integrates with APIs and LLMs for intelligent processing
Sends automated responses back to the sender
⚙️ How It Works
The server starts and connects to a specified email inbox.
It continuously listens for new incoming emails.
When a new email is received:
The application extracts relevant details (subject, body, sender, recipient).
The email body is treated as an input/query.
The query is sent to an API that interacts with an LLM for processing.
The LLM interprets the instructions and executes them step-by-step.
The final result is generated and sent back to the original sender via email.
💡 Use Cases
Email-based automation systems
Workflow execution via email commands
Customer support automation
Integration with AI/LLM-powered agents
Foundation for building Agentic AI applications

How to Install:
Do npm install in the directory
Set .env file with following values:
EMAIL_ACCOUNT=your_email@gmail.com
PASSWORD=your_app_password
RECIPIENT=receiver@gmail.com
OPENAI_API_KEY=sk-xxxxxxxxxxxx

Start the server as node emailServer.js