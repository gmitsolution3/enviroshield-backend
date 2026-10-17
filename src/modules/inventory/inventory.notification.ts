
import { client } from "../../config/mongodb";
import { transporter } from "../../config/mail";

type TLowStockNotification = {
  name: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
};

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

  const text = [
    "A product has reached its low-stock threshold.",
    "",
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
    `Current stock: ${product.stockQuantity}`,
    `Low-stock threshold: ${product.lowStockThreshold}`,
    "",
    "Please review inventory and replenish stock if needed.",
  ].join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: adminEmails,
    subject,
    text,
  });
};
