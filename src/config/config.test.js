// config.test.js
import { jest } from "@jest/globals";

const mockConfig = jest.fn();

jest.unstable_mockModule("dotenv", () => ({
  default: {
    config: mockConfig,
  },
}));

describe("config", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.EMAIL_ACCOUNT = "test@gmail.com";
    process.env.PASSWORD = "secret123";
    process.env.OPENAI_API_KEY = "openai-key";
  });

  it("should call dotenv.config with debug true", async () => {
    await import("./config.js");

    expect(mockConfig).toHaveBeenCalledTimes(1);

    expect(mockConfig).toHaveBeenCalledWith({
      debug: true,
    });
  });

  it("should export IMAP_CONFIG correctly", async () => {
    const { IMAP_CONFIG } = await import("./config.js");

    expect(IMAP_CONFIG).toEqual({
      user: "test@gmail.com",
      password: "secret123",
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    });
  });

  it("should export OPENAI_KEY correctly", async () => {
    const { OPENAI_KEY } = await import("./config.js");

    expect(OPENAI_KEY).toBe("openai-key");
  });

  it("should handle missing environment variables", async () => {
    delete process.env.EMAIL_ACCOUNT;
    delete process.env.PASSWORD;
    delete process.env.OPENAI_API_KEY;

    jest.resetModules();

    const { IMAP_CONFIG, OPENAI_KEY } = await import(
      "./config.js"
    );

    expect(IMAP_CONFIG.user).toBeUndefined();
    expect(IMAP_CONFIG.password).toBeUndefined();
    expect(OPENAI_KEY).toBeUndefined();
  });
});