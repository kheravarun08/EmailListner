import nodemailer from "nodemailer";
import svg2img from "svg2img";

function convertSvgToPng(svg) {
  return new Promise((resolve, reject) => {
    svg2img(svg, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}

export async function sendEmail(subject, html, svgChart) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ACCOUNT,
      pass: process.env.PASSWORD
    }
  });

  let attachments = [];

  if (svgChart) {
    const pngBuffer = await convertSvgToPng(svgChart);

    attachments.push({
      filename: "chart.png",
      content: pngBuffer,
      cid: "chart"
    });

    // replace placeholder in HTML
    html = html.replace("{{chart}}", `<img src="cid:chart" width="700"/>`);
  }

  await transporter.sendMail({
    from: process.env.EMAIL_ACCOUNT,
    to: process.env.RECIPIENT,
    subject,
    html,
    attachments
  });
}