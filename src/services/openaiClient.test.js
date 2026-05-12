// openaiClient.test.js
import { jest } from "@jest/globals";

const mockOpenAIInstance = {
  responses: {
    create: jest.fn(),
  },
};

const mockOpenAI = jest.fn(() => mockOpenAIInstance);

jest.unstable_mockModule("openai", () => ({
  default: mockOpenAI,
}));

jest.unstable_mockModule("../config/config.js", () => ({
  OPENAI_KEY: "test-openai-key",
}));

describe("openaiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("should initialize OpenAI client with OPENAI_KEY", async () => {
    const { client } = await import("./openaiClient.js");

    expect(mockOpenAI).toHaveBeenCalledTimes(1);

    expect(mockOpenAI).toHaveBeenCalledWith({
      apiKey: "test-openai-key",
    });

    expect(client).toBe(mockOpenAIInstance);
  });

  it("should export initialized client instance", async () => {
    const { client } = await import("./openaiClient.js");

    expect(client).toEqual(mockOpenAIInstance);
  });

  it("should initialize client even when OPENAI_KEY is undefined", async () => {
    jest.resetModules();

    jest.unstable_mockModule("../config/config.js", () => ({
      OPENAI_KEY: undefined,
    }));

    const { client } = await import("./openaiClient.js");

    expect(mockOpenAI).toHaveBeenCalledWith({
      apiKey: undefined,
    });

    expect(client).toBe(mockOpenAIInstance);
  });
});