import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 Generate HTML table (report)
export async function getResponse(data) {
  const res = await client.responses.create({
    model: "gpt-4.1",
    input: `
Convert dataset into HTML table.

Rules:
- Keep values unchanged
- Return only <table> HTML

Data:
${JSON.stringify(data)}
`
  });

  return res.output_text;
}

// 🔹 Generate summary
export async function getSummary(query, data) {
  const res = await client.responses.create({
    model: "gpt-4.1",
    input: `
Generate short summary.

Query: ${query}
Data: ${JSON.stringify(data)}
`
  });

  return res.output_text;
}

// 🔹 Generate SVG chart
export async function getSVGChart({ data, type }) {
  const res = await client.responses.create({
    model: "gpt-4.1",
    input: `
You are a chart rendering engine.

Generate a ${type} chart in STRICT SVG.

RULES:
- Output ONLY raw SVG (no markdown, no text)
- Must start with <svg
- Width: 700, Height: 350
- White background
- Include labels and values
- Use simple shapes (rect for bar, path/circle for pie)

CHART TYPES:
- bar → use <rect>
- pie → use <circle>/<path>
- histogram → grouped bars

DATA:
${JSON.stringify(data)}
`
  });

  return res.output_text
    .replace(/```svg|```/g, "") // clean markdown if any
    .trim();
}