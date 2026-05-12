// decision.test.js
import { jest } from "@jest/globals";

const mockCreate = jest.fn();

jest.unstable_mockModule("../services/openaiClient.js", () => ({
  client: {
    responses: {
      create: mockCreate,
    },
  },
}));

const { decideNextStep } = await import("./decision.js");

describe("decideNextStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call OpenAI client with correct payload", async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        action: "summarize",
        input: {
          data: "sales data",
        },
      }),
    });

    const context = {
      email: "Generate sales summary",
    };

    const result = await decideNextStep(context);

    expect(mockCreate).toHaveBeenCalledTimes(1);

    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-4.1",
      input: expect.stringContaining(
        JSON.stringify(context, null, 2)
      ),
    });

    expect(result).toEqual({
      action: "summarize",
      input: {
        data: "sales data",
      },
    });
  });

  it("should parse and return JSON response", async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        action: "generateChart",
        input: {
          data: [1, 2, 3],
          type: "bar",
        },
      }),
    });

    const result = await decideNextStep({
      email: "Create chart",
    });

    expect(result.action).toBe("generateChart");
    expect(result.input.type).toBe("bar");
  });

  it("should throw error for invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      output_text: "invalid-json",
    });

    await expect(
      decideNextStep({
        email: "Bad response",
      })
    ).rejects.toThrow(SyntaxError);
  });

  it("should propagate OpenAI API errors", async () => {
    mockCreate.mockRejectedValue(
      new Error("OpenAI API failed")
    );

    await expect(
      decideNextStep({
        email: "Test email",
      })
    ).rejects.toThrow("OpenAI API failed");
  });

  it("should include tools and rules in prompt", async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        action: "sendEmail",
        input: {},
      }),
    });

    await decideNextStep({
      email: "Send report",
    });

    const callArgs = mockCreate.mock.calls[0][0];

    expect(callArgs.input).toContain("Available tools:");
    expect(callArgs.input).toContain("generateChart");
    expect(callArgs.input).toContain("sendEmail");
    expect(callArgs.input).toContain("Return JSON:");
  });
});