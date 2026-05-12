// emailListener.test.js
import { jest } from "@jest/globals";

const mockConnect = jest.fn();
const mockOnce = jest.fn();
const mockOpenBox = jest.fn();

const mockImapInstance = {
  once: mockOnce,
  openBox: mockOpenBox,
  connect: mockConnect,
  _box: {
    messages: {
      total: 0,
    },
  },
  seq: {
    fetch: jest.fn(),
  },
};

const mockSimpleParser = jest.fn();
const mockRunAgent = jest.fn();

jest.unstable_mockModule("imap", () => ({
  default: jest.fn(() => mockImapInstance),
}));

jest.unstable_mockModule("mailparser", () => ({
  simpleParser: mockSimpleParser,
}));

jest.unstable_mockModule("../config/config.js", () => ({
  IMAP_CONFIG: {
    user: "test@gmail.com",
  },
}));

jest.unstable_mockModule("../agent/agent.js", () => ({
  runAgent: mockRunAgent,
}));

describe("emailListener", () => {
  let startListener;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    global.setInterval = jest.fn();

    ({ startListener } = await import("./emailListener.js"));
  });

  describe("startListener", () => {
    it("should create IMAP instance and connect", () => {
      startListener();

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it("should register ready event", () => {
      startListener();

      expect(mockOnce).toHaveBeenCalledWith(
        "ready",
        expect.any(Function)
      );
    });

    it("should open inbox when ready event fires", () => {
      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      expect(mockOpenBox).toHaveBeenCalledWith(
        "INBOX",
        false,
        expect.any(Function)
      );
    });

    it("should start polling emails after inbox opens", () => {
      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      const openBoxCallback = mockOpenBox.mock.calls[0][2];

      openBoxCallback(null, {
        messages: {
          total: 5,
        },
      });

      expect(setInterval).toHaveBeenCalledTimes(1);

      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10000
      );
    });

    it("should log openBox errors", () => {
      console.error = jest.fn();

      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      const openBoxCallback = mockOpenBox.mock.calls[0][2];

      const error = new Error("openbox failed");

      openBoxCallback(error);

      expect(console.error).toHaveBeenCalledWith(error);
    });
  });

  describe("email processing", () => {
    it("should process newly fetched emails", async () => {
      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      const openBoxCallback = mockOpenBox.mock.calls[0][2];

      openBoxCallback(null, {
        messages: {
          total: 1,
        },
      });

      const intervalCallback = setInterval.mock.calls[0][0];

      mockImapInstance._box.messages.total = 2;

      const mockFetchOn = jest.fn();

      const mockFetch = {
        on: mockFetchOn,
      };

      mockImapInstance.seq.fetch.mockReturnValue(mockFetch);

      intervalCallback();

      expect(mockImapInstance.seq.fetch).toHaveBeenCalledWith(
        "2:2",
        { bodies: "" }
      );
    });

    it("should call runAgent with parsed email body", async () => {
      const stream = {};

      mockSimpleParser.mockResolvedValue({
        from: {
          text: "test@gmail.com",
        },
        subject: "Test Subject",
        text: "Email body",
      });

      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      const openBoxCallback = mockOpenBox.mock.calls[0][2];

      openBoxCallback(null, {
        messages: {
          total: 1,
        },
      });

      const intervalCallback = setInterval.mock.calls[0][0];

      mockImapInstance._box.messages.total = 2;

      let messageHandler;

      const mockFetch = {
        on: jest.fn((event, cb) => {
          if (event === "message") {
            messageHandler = cb;
          }
        }),
      };

      mockImapInstance.seq.fetch.mockReturnValue(mockFetch);

      intervalCallback();

      const bodyHandler = jest.fn();

      const msg = {
        on: jest.fn((event, cb) => {
          if (event === "body") {
            bodyHandler.mockImplementation(cb);
          }
        }),
      };

      messageHandler(msg);

      await bodyHandler(stream);

      expect(mockSimpleParser).toHaveBeenCalledWith(stream);

      expect(mockRunAgent).toHaveBeenCalledWith(
        "Email body"
      );
    });

    it("should log processing errors", async () => {
      console.error = jest.fn();

      mockSimpleParser.mockRejectedValue(
        new Error("parse failed")
      );

      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      const openBoxCallback = mockOpenBox.mock.calls[0][2];

      openBoxCallback(null, {
        messages: {
          total: 1,
        },
      });

      const intervalCallback = setInterval.mock.calls[0][0];

      mockImapInstance._box.messages.total = 2;

      let messageHandler;

      const mockFetch = {
        on: jest.fn((event, cb) => {
          if (event === "message") {
            messageHandler = cb;
          }
        }),
      };

      mockImapInstance.seq.fetch.mockReturnValue(mockFetch);

      intervalCallback();

      const bodyHandler = jest.fn();

      const msg = {
        on: jest.fn((event, cb) => {
          if (event === "body") {
            bodyHandler.mockImplementation(cb);
          }
        }),
      };

      messageHandler(msg);

      await bodyHandler({});

      expect(console.error).toHaveBeenCalledWith(
        "Processing error:",
        expect.any(Error)
      );
    });

    it("should not fetch emails when no new emails exist", () => {
      startListener();

      const readyCallback = mockOnce.mock.calls[0][1];

      readyCallback();

      const openBoxCallback = mockOpenBox.mock.calls[0][2];

      openBoxCallback(null, {
        messages: {
          total: 5,
        },
      });

      const intervalCallback = setInterval.mock.calls[0][0];

      mockImapInstance._box.messages.total = 5;

      intervalCallback();

      expect(
        mockImapInstance.seq.fetch
      ).not.toHaveBeenCalled();
    });
  });
  it("should handle missing parsed.from", async () => {
  mockSimpleParser.mockResolvedValue({
    subject: "No From",
    text: "Email body",
  });

  startListener();

  const readyCallback = mockOnce.mock.calls[0][1];
  readyCallback();

  const openBoxCallback = mockOpenBox.mock.calls[0][2];

  openBoxCallback(null, {
    messages: {
      total: 1,
    },
  });

  const intervalCallback = setInterval.mock.calls[0][0];

  mockImapInstance._box.messages.total = 2;

  let messageHandler;

  const mockFetch = {
    on: jest.fn((event, cb) => {
      if (event === "message") {
        messageHandler = cb;
      }
    }),
  };

  mockImapInstance.seq.fetch.mockReturnValue(mockFetch);

  intervalCallback();

  let bodyCallback;

  const msg = {
    on: jest.fn((event, cb) => {
      if (event === "body") {
        bodyCallback = cb;
      }
    }),
  };

  messageHandler(msg);

  await bodyCallback({});

  expect(mockRunAgent).toHaveBeenCalledWith(
    "Email body"
  );
});
});