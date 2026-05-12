// emailSender.test.js
import { jest } from "@jest/globals";

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn();

const mockSvg2Img = jest.fn();

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

jest.unstable_mockModule("svg2img", () => ({
  default: mockSvg2Img,
}));

describe("sendEmail", () => {
  let sendEmail;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    process.env.EMAIL_ACCOUNT = "sender@gmail.com";
    process.env.PASSWORD = "password";
    process.env.RECIPIENT = "receiver@gmail.com";

    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });

    ({ sendEmail } = await import("./emailSender.js"));
  });

  it("should send email without chart attachment", async () => {
    mockSendMail.mockResolvedValue({});

    await sendEmail(
      "Test Subject",
      "<h1>Hello</h1>",
      null
    );

    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: {
        user: "sender@gmail.com",
        pass: "password",
      },
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "sender@gmail.com",
      to: "receiver@gmail.com",
      subject: "Test Subject",
      html: "<h1>Hello</h1>",
      attachments: [],
    });
  });

  it("should convert svg to png and attach chart", async () => {
    const pngBuffer = Buffer.from("png-data");

    mockSvg2Img.mockImplementation((svg, cb) => {
      cb(null, pngBuffer);
    });

    mockSendMail.mockResolvedValue({});

    await sendEmail(
      "Chart Email",
      "<div>{{chart}}</div>",
      "<svg></svg>"
    );

    expect(mockSvg2Img).toHaveBeenCalledWith(
      "<svg></svg>",
      expect.any(Function)
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "sender@gmail.com",
      to: "receiver@gmail.com",
      subject: "Chart Email",
      html:
        '<div><img src="cid:chart" width="700"/></div>',
      attachments: [
        {
          filename: "chart.png",
          content: pngBuffer,
          cid: "chart",
        },
      ],
    });
  });

  it("should reject when svg2img fails", async () => {
    mockSvg2Img.mockImplementation((svg, cb) => {
      cb(new Error("svg conversion failed"));
    });

    await expect(
      sendEmail(
        "Chart Email",
        "<div>{{chart}}</div>",
        "<svg></svg>"
      )
    ).rejects.toThrow("svg conversion failed");
  });

  it("should propagate sendMail errors", async () => {
    mockSendMail.mockRejectedValue(
      new Error("mail failed")
    );

    await expect(
      sendEmail(
        "Test Subject",
        "<h1>Hello</h1>",
        null
      )
    ).rejects.toThrow("mail failed");
  });

  it("should handle empty html replacement correctly", async () => {
    const pngBuffer = Buffer.from("png-data");

    mockSvg2Img.mockImplementation((svg, cb) => {
      cb(null, pngBuffer);
    });

    mockSendMail.mockResolvedValue({});

    await sendEmail(
      "Chart Email",
      "",
      "<svg></svg>"
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "sender@gmail.com",
      to: "receiver@gmail.com",
      subject: "Chart Email",
      html: "",
      attachments: [
        {
          filename: "chart.png",
          content: pngBuffer,
          cid: "chart",
        },
      ],
    });
  });
});