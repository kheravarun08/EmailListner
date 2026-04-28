import { client } from "../services/openaiClient.js";

export async function decideNextStep(context) {
  const response = await client.responses.create({
    model: "gpt-4.1",
    input: `
You are an AI Email Agent.

You must:
1. Read email
2. Decide next action
3. Use previous tool outputs if available

Available tools:
- summarize(data)
- generateReport(data)
- generateChart(data, type: "bar" | "pie" | "histogram")
- sendEmail(subject, html, chart)

Rules:
- Use outputs from previous steps
- When all data is ready → call sendEmail
- html MUST include summary/report/chart
- Always include "type" when calling generateChart
- Always display generateReport(data) in table format

Choose chart type:
- categorical → pie
- comparison → bar
- distribution → histogram

Return JSON:
{
  "action": "...",
  "input": { ... }
}

Context:
${JSON.stringify(context, null, 2)}
`
  });

  return JSON.parse(response.output_text);
}