# 📧 EmailListner — An Agentic AI Email Agent in Node.js

> An autonomous email agent built from primitives. Receives email over IMAP, decides what the sender wants, picks a tool (summarize / report / chart), generates a response, and replies — all from a single agent loop in plain Node.js. **No framework dependencies.**

> Built as a reference implementation for understanding what's actually inside an "agentic" system, instead of treating frameworks like LangGraph or AutoGen as black boxes.

---

## 🎯 Why this exists

Most "agent" tutorials show you a framework call and stop. This project answers the questions the frameworks hide:

- How does the agent *decide* which tool to use?
- What happens when it picks the wrong one?
- How do you stop it from looping forever?
- How do you debug it when something goes wrong in production?

Every one of those questions is answered in code you can read in under an hour.

---

## 🏗 Architecture

```
                            ┌──────────────────────────┐
                            │      Incoming Email      │
                            │   (IMAP, real inbox)     │
                            └────────────┬─────────────┘
                                         │
                                         ▼
                            ┌──────────────────────────┐
                            │   Parser                 │
                            │   subject / body / from  │
                            └────────────┬─────────────┘
                                         │
                                         ▼
        ┌────────────────────────────────────────────────────────────┐
        │                      THE AGENT LOOP                        │
        │                                                            │
        │   ┌────────────┐   ┌─────────────┐   ┌─────────────────┐   │
        │   │ 1. Classify│──▶│ 2. Pick Tool│──▶│ 3. Execute Tool │   │
        │   │   Intent   │   │ (JSON schema│   │  (sandboxed)    │   │
        │   └────────────┘   │   forced)   │   └────────┬────────┘   │
        │                    └─────────────┘            │            │
        │                                               ▼            │
        │                                      ┌─────────────────┐   │
        │                                      │ 4. Validate     │   │
        │                                      │    Output       │   │
        │                                      └────────┬────────┘   │
        │                                               │            │
        │                          ┌────────────────────┘            │
        │                          ▼                                 │
        │                  ┌──────────────┐    retry (max 3)         │
        │                  │ 5. Critique  │─────────────┐            │
        │                  │   pass/fail  │             │            │
        │                  └──────┬───────┘             │            │
        │                         │ pass                │            │
        │                         ▼                     │            │
        │                  ┌──────────────┐             │            │
        │                  │ 6. Compose   │◀────────────┘            │
        │                  │    Reply     │                          │
        │                  └──────┬───────┘                          │
        └─────────────────────────┼──────────────────────────────────┘
                                  ▼
                       ┌─────────────────────┐
                       │    SMTP Sender      │
                       └──────────┬──────────┘
                                  ▼
                       ┌─────────────────────┐
                       │   Reply delivered   │
                       └─────────────────────┘

   Tool Registry (allow-list, schema-validated):
   ┌────────────────────────────────────────────┐
   │ summarize(text)        → string            │
   │ build_report(rows)     → html              │
   │ build_chart(data,type) → png (via svg)     │
   └────────────────────────────────────────────┘
```

**Key design choice:** the LLM never executes code or calls tools directly. It returns a structured JSON decision (`{"tool": "...", "args": {...}}`), which the runtime validates against an allow-list before invoking anything. This is the single most important guardrail against hallucinated tool calls.

---

## 🔁 The Agent Loop

The whole loop is small enough to read in one sitting. Here's the pseudocode (the real version lives in [`index.js`](./index.js)):

```js
async function runAgent(email) {
  const trace = startTrace(email);
  let stepBudget = 5;                          // hard cap — prevents runaway reasoning

  // 1. Classify intent — what does the sender actually want?
  const intent = await llm.classify(email, {
    schema: IntentSchema,                      // forces structured output
    allowedIntents: ["summary", "report", "chart", "unknown"]
  });
  trace.add("intent", intent);

  if (intent.name === "unknown" || intent.confidence < 0.6) {
    return composeFallback(email, intent);     // bail early — don't hallucinate
  }

  // 2. Pick a tool from the registry — schema-forced, allow-listed
  let decision = await llm.pickTool(intent, TOOL_REGISTRY, { schema: ToolCallSchema });
  trace.add("tool_pick", decision);

  if (!TOOL_REGISTRY[decision.tool]) {         // hallucinated tool name? abort.
    return composeFallback(email, { reason: "invalid_tool", decision });
  }

  // 3. Execute, validate, critique, retry — up to stepBudget times
  while (stepBudget-- > 0) {
    const output = await TOOL_REGISTRY[decision.tool](decision.args);
    trace.add("tool_output", { tool: decision.tool, ok: !!output });

    const validation = validateOutput(output, decision.tool);   // schema + sanity checks
    if (!validation.ok) {
      decision = await llm.repair(decision, validation.errors); // ask LLM to fix args
      continue;
    }

    const critique = await llm.critique(email, output);         // does this actually answer the email?
    if (critique.passes) {
      return composeReply(email, output, trace);
    }
    decision = await llm.refine(decision, critique.feedback);   // try again with feedback
  }

  // Step budget exhausted — fail loud, not silent
  return composeFallback(email, { reason: "step_budget_exhausted", trace });
}
```

That's it. Six numbered steps, one hard step budget, two validation gates (schema + critique), and a fallback path for every failure. Everything else in this repo is plumbing.

---

## 📨 Example Traces

Three real email-in / action-out walkthroughs showing the reasoning at each step. *(Logs are abbreviated for readability.)*

### Trace 1 — Happy path: a clear summarization request

```
INPUT EMAIL
  From:    alice@example.com
  Subject: Can you summarize the attached Q3 notes?
  Body:    "Hey, please give me a TL;DR of the meeting notes below..."
           [600 words of notes]

[step 1] classify_intent
  → { name: "summary", confidence: 0.94 }

[step 2] pick_tool
  → { tool: "summarize", args: { text: "<600 words>", style: "tldr" } }

[step 3] execute summarize()
  → "Q3 closed 12% above target. Three blockers identified: ..."

[step 4] validate_output
  → ok: true (non-empty, < 800 chars, no fabricated bullet points)

[step 5] critique
  → passes: true ("addresses the TL;DR request, length appropriate")

[step 6] compose_reply
  → SMTP sent to alice@example.com

TOTAL: 4.2s, 1 LLM round-trip for intent + 1 for summarize + 1 for critique
```

### Trace 2 — Failure mode #1: confident-but-wrong tool pick

This is the failure I had to design around the most. The LLM would confidently pick `chart` for emails that contained zero numeric data.

```
INPUT EMAIL
  From:    bob@example.com
  Subject: Quick update on the launch
  Body:    "Launch is going well. Team morale high. No blockers."

[step 1] classify_intent
  → { name: "chart", confidence: 0.71 }     ← ⚠ wrong, but confident

[step 2] pick_tool
  → { tool: "build_chart", args: { data: [], type: "bar" } }

[step 3] execute build_chart()
  → returns empty SVG (no data)

[step 4] validate_output
  → ok: false    ← caught by validator: "chart has zero data points"

[step 5] repair() — LLM asked to fix args
  → "I cannot generate a chart from this email — no numeric data present"

[step 6] fallback path triggered
  → reply: "I read your email but didn't find data to chart. Here's a short summary instead: ..."

LESSON: schema validation alone wasn't enough. I needed
domain-aware output validators (e.g. "a chart with zero
data points is never a valid chart") to catch this class
of failure.
```

### Trace 3 — Failure mode #3: runaway reasoning loop (caught by step budget)

```
INPUT EMAIL
  From:    carol@example.com
  Subject: Build a report from the data below
  Body:    [ambiguous, semi-structured data]

[step 1] classify_intent → { name: "report", confidence: 0.82 }
[step 2] pick_tool      → { tool: "build_report", args: {...} }
[step 3] execute        → output produced
[step 4] validate       → ok: true
[step 5] critique       → passes: false ("columns don't match request")
[step 6] refine         → new args
[step 7] execute        → output produced
[step 8] critique       → passes: false ("still not aligned")
[step 9] refine         → new args
[step 10] execute       → output produced
[step 11] critique      → passes: false

STEP BUDGET EXHAUSTED (5 critique iterations cap)
→ fallback: send the best output so far + an honest note:
  "I generated a report but wasn't fully confident in
  the column mapping. Here it is — please confirm or
  send a clearer schema."

LESSON: without the step budget this loop would have
burned tokens until the API timed out. The budget is
the difference between "agent had a bad day" and
"agent racked up a $200 bill overnight."
```

---

## 🛡 Guardrails (the boring stuff that actually matters)

| Failure mode | Guardrail |
|---|---|
| LLM picks a tool that doesn't exist | Tool registry allow-list; reject before execution |
| LLM picks wrong tool with high confidence | Domain-aware output validators (e.g. "chart needs ≥1 data point") |
| LLM produces malformed args | JSON schema enforcement + one repair attempt |
| Reasoning loops forever | Hard step budget (default: 5) |
| Silent SMTP failure | Send-receipt logging + dead-letter retry queue |
| Token blowout | Per-email token cap + circuit breaker |

---

## 🚀 Features

- 📥 Real-time IMAP inbox listening
- 🧠 LLM-driven intent classification with confidence thresholds
- 🛠 Tool registry with three built-in tools (summarize, report, chart)
- 📊 SVG → PNG chart conversion for email compatibility
- 🔒 Schema-validated tool calls (no arbitrary code execution)
- 📝 Full trace logging — every decision, every retry, every fallback
- ✉️ SMTP reply with HTML formatting
- ⚡ Zero framework dependencies — readable Node.js end to end

---

## 🛠 Installation

```bash
git clone https://github.com/kheravarun08/EmailListner.git
cd EmailListner
npm install
```

Create a `.env` file:

```
EMAIL_ACCOUNT=your_email@gmail.com
PASSWORD=your_app_password
RECIPIENT=receiver@gmail.com
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

Run:

```bash
node index.js
```

Send an email to the configured inbox and watch the trace in your console.

---

## 🗺 Roadmap

- [ ] Pluggable tool registry (`tools/` directory, auto-discovery)
- [ ] Configurable LLM provider (currently OpenAI; Anthropic + local model adapters planned)
- [ ] Web dashboard for trace inspection
- [ ] Persistent memory across emails from the same sender

---

## 🤝 Contributing

PRs welcome — especially new tools, new validators, and new failure-mode traces. Open an issue if you'd like to discuss a design change first.

---

## 📄 License

MIT
