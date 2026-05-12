// llmTools.test.js
import { jest } from "@jest/globals";

const mockCreate = jest.fn();

const mockOpenAIInstance = {
  responses: {
    create: mockCreate,
  },
};

const mockOpenAI = jest.fn(() => mockOpenAIInstance);

jest.unstable_mockModule("openai", () => ({
  default: mockOpenAI,
}));

describe("llmTools", () => {
  let getResponse;
  let getSummary;
  let getSVGChart;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    process.env.OPENAI_API_KEY = "test-api-key";

    ({
      getResponse,
      getSummary,
      getSVGChart,
    } = await import("./llmTools.js"));
  });

  describe("OpenAI client initialization", () => {
    it("should initialize OpenAI client with api key", async () => {
      await import("./llmTools.js");

      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
      });
    });
  });

  describe("getResponse", () => {
    it("should generate HTML table response", async () => {
      mockCreate.mockResolvedValue({
        output_text: "<table></table>",
      });

      const data = [
        { name: "John", score: 90 },
      ];

      const result = await getResponse(data);

      expect(mockCreate).toHaveBeenCalledTimes(1);

      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4.1",
        input: expect.stringContaining(
          JSON.stringify(data)
        ),
      });

      expect(result).toBe("<table></table>");
    });

    it("should include table instructions in prompt", async () => {
      mockCreate.mockResolvedValue({
        output_text: "<table></table>",
      });

      await getResponse([{ value: 1 }]);

      const args = mockCreate.mock.calls[0][0];

      expect(args.input).toContain(
        "Convert dataset into HTML table"
      );

      expect(args.input).toContain(
        "Return only <table> HTML"
      );
    });

    it("should propagate API errors in getResponse", async () => {
      mockCreate.mockRejectedValue(
        new Error("response failed")
      );

      await expect(
        getResponse([{ value: 1 }])
      ).rejects.toThrow("response failed");
    });
  });

  describe("getSummary", () => {
    it("should generate summary response", async () => {
      mockCreate.mockResolvedValue({
        output_text: "Short summary",
      });

      const result = await getSummary(
        "sales report",
        [{ sales: 100 }]
      );

      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4.1",
        input: expect.stringContaining(
          "Query: sales report"
        ),
      });

      expect(result).toBe("Short summary");
    });

    it("should include query and data in prompt", async () => {
      mockCreate.mockResolvedValue({
        output_text: "summary",
      });

      const data = [{ amount: 200 }];

      await getSummary("finance", data);

      const args = mockCreate.mock.calls[0][0];

      expect(args.input).toContain(
        "Generate short summary"
      );

      expect(args.input).toContain(
        JSON.stringify(data)
      );
    });

    it("should propagate API errors in getSummary", async () => {
      mockCreate.mockRejectedValue(
        new Error("summary failed")
      );

      await expect(
        getSummary("query", [])
      ).rejects.toThrow("summary failed");
    });
  });

  describe("getSVGChart", () => {
    it("should generate cleaned SVG chart", async () => {
      mockCreate.mockResolvedValue({
        output_text:
          "```svg\n<svg>chart</svg>\n```",
      });

      const result = await getSVGChart({
        data: [1, 2, 3],
        type: "bar",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-4.1",
        input: expect.stringContaining(
          "Generate a bar chart in STRICT SVG"
        ),
      });

      expect(result).toBe("<svg>chart</svg>");
    });

    it("should trim whitespace from SVG output", async () => {
      mockCreate.mockResolvedValue({
        output_text:
          "   <svg>chart</svg>   ",
      });

      const result = await getSVGChart({
        data: [10],
        type: "pie",
      });

      expect(result).toBe("<svg>chart</svg>");
    });

    it("should support histogram chart type", async () => {
      mockCreate.mockResolvedValue({
        output_text: "<svg>histogram</svg>",
      });

      await getSVGChart({
        data: [1, 2, 3],
        type: "histogram",
      });

      const args = mockCreate.mock.calls[0][0];

      expect(args.input).toContain(
        "Generate a histogram chart"
      );
    });

    it("should clean markdown fences completely", async () => {
      mockCreate.mockResolvedValue({
        output_text:
          "```svg\n<svg>data</svg>\n```",
      });

      const result = await getSVGChart({
        data: [],
        type: "pie",
      });

      expect(result).not.toContain("```");
      expect(result).toBe("<svg>data</svg>");
    });

    it("should propagate API errors in getSVGChart", async () => {
      mockCreate.mockRejectedValue(
        new Error("chart failed")
      );

      await expect(
        getSVGChart({
          data: [],
          type: "bar",
        })
      ).rejects.toThrow("chart failed");
    });
  });
});