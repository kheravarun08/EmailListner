// tools.test.js
import { jest } from "@jest/globals";

const mockGetSummary = jest.fn();
const mockGetResponse = jest.fn();
const mockGetSVGChart = jest.fn();
const mockSendEmail = jest.fn();

jest.unstable_mockModule("../services/llmTools.js", () => ({
  getSummary: mockGetSummary,
  getResponse: mockGetResponse,
  getSVGChart: mockGetSVGChart,
}));

jest.unstable_mockModule("../services/emailSender.js", () => ({
  sendEmail: mockSendEmail,
}));

const { tools } = await import("./tools.js");

describe("tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("summarize", () => {
    it("should call getSummary with query and data", async () => {
      mockGetSummary.mockResolvedValue("summary response");

      const result = await tools.summarize("sales data");

      expect(mockGetSummary).toHaveBeenCalledTimes(1);

      expect(mockGetSummary).toHaveBeenCalledWith(
        "query",
        "sales data"
      );

      expect(result).toBe("summary response");
    });

    it("should propagate getSummary errors", async () => {
      mockGetSummary.mockRejectedValue(
        new Error("summary failed")
      );

      await expect(
        tools.summarize("data")
      ).rejects.toThrow("summary failed");
    });
  });

  describe("generateReport", () => {
    it("should call getResponse with data", async () => {
      mockGetResponse.mockResolvedValue("report response");

      const result = await tools.generateReport("report data");

      expect(mockGetResponse).toHaveBeenCalledTimes(1);

      expect(mockGetResponse).toHaveBeenCalledWith(
        "report data"
      );

      expect(result).toBe("report response");
    });

    it("should propagate getResponse errors", async () => {
      mockGetResponse.mockRejectedValue(
        new Error("report failed")
      );

      await expect(
        tools.generateReport("data")
      ).rejects.toThrow("report failed");
    });
  });

  describe("generateChart", () => {
    it("should call getSVGChart with data and type", async () => {
      const chartPayload = {
        data: [10, 20, 30],
        type: "bar",
      };

      mockGetSVGChart.mockResolvedValue("<svg></svg>");

      const result = await tools.generateChart(chartPayload);

      expect(mockGetSVGChart).toHaveBeenCalledTimes(1);

      expect(mockGetSVGChart).toHaveBeenCalledWith(
        chartPayload
      );

      expect(result).toBe("<svg></svg>");
    });

    it("should propagate getSVGChart errors", async () => {
      mockGetSVGChart.mockRejectedValue(
        new Error("chart failed")
      );

      await expect(
        tools.generateChart({
          data: [1, 2],
          type: "pie",
        })
      ).rejects.toThrow("chart failed");
    });
  });

  describe("sendEmail", () => {
    it("should call sendEmail service and return success message", async () => {
      mockSendEmail.mockResolvedValue();

      const payload = {
        subject: "Monthly Report",
        html: "<h1>Report</h1>",
        chart: "<svg></svg>",
      };

      const result = await tools.sendEmail(payload);

      expect(mockSendEmail).toHaveBeenCalledTimes(1);

      expect(mockSendEmail).toHaveBeenCalledWith(
        "Monthly Report",
        "<h1>Report</h1>",
        "<svg></svg>"
      );

      expect(result).toBe("Email sent");
    });

    it("should propagate sendEmail errors", async () => {
      mockSendEmail.mockRejectedValue(
        new Error("email failed")
      );

      await expect(
        tools.sendEmail({
          subject: "Test",
          html: "<p>Hi</p>",
          chart: "<svg></svg>",
        })
      ).rejects.toThrow("email failed");
    });
  });
});