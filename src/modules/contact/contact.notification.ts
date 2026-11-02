import { transporter } from "../../config/mail";
import { client } from "../../config/mongodb";
import { emailLayout } from "../../utils/email-layout";
import type { TContact } from "./contact.types";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

export const notifyNewContactInquiry = async (
  contact: TContact,
): Promise<void> => {
  try {
    const db = client.db(process.env.MONGODB_DB);
    const admins = await db
      .collection("user")
      .find({ role: "admin" }, { projection: { email: 1, _id: 0 } })
      .toArray();

    const adminEmails = admins
      .map((admin) => admin.email)
      .filter((email): email is string => typeof email === "string" && email.length > 0);

    if (adminEmails.length === 0) {
      return;
    }

    const subject = `New Inquiry: ${contact.fullName} — ${contact.projectName || "General Inquiry"}`;
    const preview = `A new contact inquiry has been submitted by ${contact.fullName} (${contact.email}).`;

    const children = `
      <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
        New Contact Inquiry
      </div>

      <h1 style="color:#00334e;font-size:26px;line-height:34px;margin:12px 0;">
        Inquiry from ${escapeHtml(contact.fullName)}
      </h1>

      <div style="background-color:#ffffff;border:1px solid #edf0f2;border-radius:12px;padding:20px;margin:20px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:#18384a;">
          <tr>
            <td style="color:#64748b;width:130px;font-weight:600;">Full Name:</td>
            <td style="font-weight:700;color:#00334e;">${escapeHtml(contact.fullName)}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:600;">Email:</td>
            <td><a href="mailto:${escapeHtml(contact.email)}" style="color:#016edc;">${escapeHtml(contact.email)}</a></td>
          </tr>
          <tr>
            <td style="color:#64748b;font-weight:600;">Phone:</td>
            <td>${escapeHtml(contact.phoneNumber)}</td>
          </tr>
          ${
            contact.projectName
              ? `<tr><td style="color:#64748b;font-weight:600;">Project Name:</td><td>${escapeHtml(contact.projectName)}</td></tr>`
              : ""
          }
          ${
            contact.projectAreaSize
              ? `<tr><td style="color:#64748b;font-weight:600;">Area Size:</td><td>${contact.projectAreaSize} ${escapeHtml(contact.projectAreaUnit || "sqft")}</td></tr>`
              : ""
          }
          ${
            contact.siteVisitRequired
              ? `<tr><td style="color:#64748b;font-weight:600;">Site Visit:</td><td style="color:#016edc;font-weight:700;">Required</td></tr>`
              : ""
          }
        </table>

        ${
          contact.message
            ? `
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #edf0f2;">
                <div style="color:#64748b;font-size:12px;font-weight:600;margin-bottom:6px;">Message:</div>
                <div style="color:#18384a;font-size:14px;line-height:22px;background:#f8fafc;padding:12px;border-radius:8px;">
                  ${escapeHtml(contact.message)}
                </div>
              </div>
            `
            : ""
        }
      </div>

      <p style="color:#64748b;font-size:13px;line-height:20px;">
        You can view and manage this lead in the Enviroshield Admin Dashboard under Contact Management.
      </p>
    `;

    const text = [
      "ENVIROSHIELD — NEW CONTACT INQUIRY",
      "",
      `From: ${contact.fullName}`,
      `Email: ${contact.email}`,
      `Phone: ${contact.phoneNumber}`,
      ...(contact.projectName ? [`Project: ${contact.projectName}`] : []),
      ...(contact.message ? [`Message: ${contact.message}`] : []),
      "",
      "Manage this lead in the Admin Dashboard: /dashboard/contacts",
    ].join("\n");

    const html = emailLayout({
      preview,
      children,
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: adminEmails.join(", "),
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("Failed to send contact inquiry admin email:", error);
  }
};

