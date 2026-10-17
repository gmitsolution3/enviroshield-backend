
import { client } from "../../config/mongodb";
import { transporter } from "../../config/mail";
import { emailLayout } from "../../utils/email-layout";

type TLowStockNotification = {
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
};

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

export const notifyLowStockAdmins = async (
  product: TLowStockNotification,
): Promise<void> => {
  const db = client.db(process.env.MONGODB_DB);

  const admins = await db
    .collection("user")
    .find(
      { role: "admin" },
      {
        projection: {
          email: 1,
          _id: 0,
        },
      },
    )
    .toArray();

  const adminEmails = admins
    .map((admin) => admin.email)
    .filter(
      (email): email is string =>
        typeof email === "string" && email.length > 0,
    );

  if (adminEmails.length === 0) {
    console.warn(
      "Low-stock alert skipped: no admin email recipients found.",
    );
    return;
  }

  const subject = `Low Stock Alert: ${product.name}`;

  const preview = `${product.name} has reached its low-stock threshold. Current stock: ${product.stockQuantity}.`;


   const html = emailLayout({
    preview,
    children: `
      <div
        style="
          margin-bottom: 10px;
          color: #016edc;
          font-size: 11px;
          line-height: 16px;
          font-weight: 800;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        "
      >
        Inventory Notification
      </div>

      <div
        style="
          color: #00334e;
          font-size: 30px;
          line-height: 36px;
          font-weight: 800;
          letter-spacing: -0.8px;
        "
      >
        Low stock alert
      </div>

      <p
        style="
          margin: 18px 0 0;
          color: #18384a;
          font-size: 15px;
          line-height: 25px;
        "
      >
        A product has reached or fallen below its configured
        low-stock threshold. Please review the inventory and
        arrange replenishment if needed.
      </p>

      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          width: 100%;
          margin-top: 28px;
          border: 1px solid #dfe5e9;
          border-radius: 10px;
        "
      >
        <tr>
          <td
            colspan="2"
            style="
              padding: 16px 18px;
              background-color: #f0f0fa;
              color: #00334e;
              font-size: 15px;
              line-height: 22px;
              font-weight: 800;
              border-bottom: 1px solid #dfe5e9;
            "
          >
            Product details
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 14px 18px;
              color: #64748b;
              font-size: 13px;
              line-height: 20px;
              border-bottom: 1px solid #edf0f2;
            "
          >
            Product
          </td>
          <td
            align="right"
            style="
              padding: 14px 18px;
              color: #00334e;
              font-size: 13px;
              line-height: 20px;
              font-weight: 700;
              border-bottom: 1px solid #edf0f2;
            "
          >
            ${escapeHtml(product.name)}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 14px 18px;
              color: #64748b;
              font-size: 13px;
              line-height: 20px;
              border-bottom: 1px solid #edf0f2;
            "
          >
            SKU
          </td>
          <td
            align="right"
            style="
              padding: 14px 18px;
              color: #00334e;
              font-size: 13px;
              line-height: 20px;
              font-weight: 700;
              border-bottom: 1px solid #edf0f2;
            "
          >
            ${escapeHtml(product.sku)}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 14px 18px;
              color: #64748b;
              font-size: 13px;
              line-height: 20px;
              border-bottom: 1px solid #edf0f2;
            "
          >
            Current stock
          </td>
          <td
            align="right"
            style="
              padding: 14px 18px;
              color: #c2410c;
              font-size: 18px;
              line-height: 24px;
              font-weight: 800;
              border-bottom: 1px solid #edf0f2;
            "
          >
            ${product.stockQuantity}
          </td>
        </tr>

        <tr>
          <td
            style="
              padding: 14px 18px;
              color: #64748b;
              font-size: 13px;
              line-height: 20px;
            "
          >
            Low-stock threshold
          </td>
          <td
            align="right"
            style="
              padding: 14px 18px;
              color: #00334e;
              font-size: 14px;
              line-height: 20px;
              font-weight: 800;
            "
          >
            ${product.lowStockThreshold}
          </td>
        </tr>
      </table>

      <p
        style="
          margin: 26px 0 0;
          padding: 16px 18px;
          background-color: #fff7ed;
          border-left: 3px solid #f97316;
          color: #9a3412;
          font-size: 13px;
          line-height: 22px;
        "
      >
        <strong>Action recommended:</strong>
        Review this product's stock level and replenish it
        if necessary.
      </p>
    `,
  });

  const text = [
    "ENVIROSHIELD — LOW STOCK ALERT",
    "",
    "A product has reached or fallen below its low-stock threshold.",
    "",
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
    `Current stock: ${product.stockQuantity}`,
    `Low-stock threshold: ${product.lowStockThreshold}`,
    "",
    "Action recommended: Review inventory and replenish stock if needed.",
    "",
    "Enviroshield",
    "Environmental solutions for a better future.",
  ].join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: adminEmails,
    subject,
    text,
    html,
  });
};
