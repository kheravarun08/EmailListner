import { decideNextStep } from "./decision.js";
import { tools } from "./tools.js";

export async function runAgent(emailText) {
  let context = {
    email: emailText,
    steps: [],
    result: null
  };

  while (true) {
    const decision = await decideNextStep(context);
    if (decision.action === "sendEmail") {
      if (!decision.input?.html) {
        console.log("❌ Missing html, forcing recompute with updated context");
        break; // or continue (explained below)
      }
    }

    if (decision.action === "done") break;

    const tool = tools[decision.action];

    if (!tool) {
      console.log("Unknown tool:", decision.action);
      break;
    }

    const result = await tool(decision.input);

    context.steps.push({
      action: decision.action,
      input: decision.input,
      output: result
    });

    context.result = result;
  }

  console.log("✅ Agent completed");
}