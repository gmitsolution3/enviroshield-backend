import { transporter } from "../../config/mail";
import { emailLayout } from "../../utils/email-layout";
import { ORDER_STATUS } from "./order.constant";
import type { TOrder, TOrderStatus } from "./order.types";

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

const formatBDT = (amount: number): string =>
  `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusLabels: Record<TOrderStatus, string> = {
  [ORDER_STATUS.PENDING]: "Pending",
  [ORDER_STATUS.CONFIRMED]: "Confirmed",
  [ORDER_STATUS.PROCESSING]: "Processing",
  [ORDER_STATUS.SHIPPED]: "Shipped",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
};

const sendCustomerEmail = async (
  email: string,
  subject: string,
  preview: string,
  children: string,
  text: string,
): Promise<void> => {
  const html = emailLayout({
    preview: escapeHtml(preview),
    children,
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject,
    text,
    html,
  });
};

const notifyOrderPlaced = async (order: TOrder): Promise<void> => {
  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #edf0f2;color:#18384a;">
            ${escapeHtml(item.name)}
            <div style="color:#64748b;font-size:12px;margin-top:4px;">
              SKU: ${escapeHtml(item.sku)} · Qty: ${item.quantity}
            </div>
          </td>
          <td align="right" style="padding:12px;border-bottom:1px solid #edf0f2;color:#00334e;font-weight:700;white-space:nowrap;">
            ${formatBDT(item.lineTotal)}
          </td>
        </tr>
      `,
    )
    .join("");

  const address = [
    order.deliveryAddress.addressLine,
    order.deliveryAddress.area,
    order.deliveryAddress.city,
    order.deliveryAddress.district,
    order.deliveryAddress.postalCode,
  ]
    .filter((value): value is string => Boolean(value))
    .map(escapeHtml)
    .join(", ");

  const subject = `Order confirmation — ${order.orderNumber}`;
  const preview = `Thank you for your order. Your order ${order.orderNumber} has been received.`;

  const children = `
    <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
      Order confirmation
    </div>

    <h1 style="color:#00334e;font-size:28px;line-height:36px;margin:12px 0;">
      Thank you, ${escapeHtml(order.customer.name)}!
    </h1>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      We've received your order and will keep you updated as it progresses.
    </p>

    <div style="margin:24px 0;padding:18px;background:#f0f0fa;border-radius:10px;">
      <div style="color:#64748b;font-size:12px;">Order number</div>
      <div style="margin-top:5px;color:#00334e;font-size:20px;font-weight:800;">
        ${escapeHtml(order.orderNumber)}
      </div>
      <div style="margin-top:10px;color:#64748b;font-size:12px;">Current status</div>
      <div style="margin-top:4px;color:#016edc;font-weight:700;">
        ${statusLabels[order.status]}
      </div>
    </div>

    <h2 style="color:#00334e;font-size:17px;">Order summary</h2>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;border:1px solid #dfe5e9;">
      ${itemsHtml}
      <tr>
        <td style="padding:12px;color:#64748b;">Subtotal</td>
        <td align="right" style="padding:12px;color:#00334e;">
          ${formatBDT(order.subtotal)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px;color:#64748b;">Delivery fee</td>
        <td align="right" style="padding:12px;color:#00334e;">
          ${formatBDT(order.deliveryFee)}
        </td>
      </tr>
      <tr>
        <td style="padding:14px 12px;color:#00334e;font-weight:800;border-top:1px solid #dfe5e9;">
          Total (BDT)
        </td>
        <td align="right" style="padding:14px 12px;color:#016edc;font-size:18px;font-weight:800;border-top:1px solid #dfe5e9;">
          ${formatBDT(order.totalAmount)}
        </td>
      </tr>
    </table>

    <h2 style="margin-top:28px;color:#00334e;font-size:17px;">Delivery details</h2>
    <p style="color:#18384a;font-size:14px;line-height:24px;">
      <strong>Recipient:</strong> ${escapeHtml(order.customer.name)}<br>
      <strong>Phone:</strong> ${escapeHtml(order.customer.phone)}<br>
      <strong>Address:</strong> ${address}<br>
      <strong>Payment:</strong> Cash on delivery
    </p>

    <p style="margin-top:26px;color:#64748b;font-size:13px;line-height:22px;">
      We'll email you when your order status changes. Thank you for choosing Enviroshield.
    </p>
  `;

  const text = [
    "ENVIROSHIELD — ORDER CONFIRMATION",
    "",
    `Hello ${order.customer.name},`,
    "Thank you for your order. We've received it successfully.",
    "",
    `Order number: ${order.orderNumber}`,
    `Status: ${statusLabels[order.status]}`,
    "",
    "Items:",
    ...order.items.map(
      (item) =>
        `- ${item.name} (SKU: ${item.sku}) x ${item.quantity}: ${formatBDT(item.lineTotal)}`,
    ),
    "",
    `Subtotal: ${formatBDT(order.subtotal)}`,
    `Delivery fee: ${formatBDT(order.deliveryFee)}`,
    `Total: ${formatBDT(order.totalAmount)}`,
    "Payment method: Cash on delivery",
    "",
    `Delivery address: ${address}`,
    `Phone: ${order.customer.phone}`,
    "",
    "We'll email you when your order status changes.",
    "Enviroshield",
  ].join("\n");

  await sendCustomerEmail(
    order.customer.email,
    subject,
    preview,
    children,
    text,
  );
};

const notifyOrderStatusUpdated = async (
  order: TOrder,
  previousStatus: TOrderStatus,
): Promise<void> => {
  const currentStatus = statusLabels[order.status];
  const oldStatus = statusLabels[previousStatus];
  const subject = `Order update — ${order.orderNumber}: ${currentStatus}`;
  const preview = `Your order ${order.orderNumber} is now ${currentStatus.toLowerCase()}.`;

  const statusMessage: Record<TOrderStatus, string> = {
    [ORDER_STATUS.PENDING]: "Your order is awaiting confirmation.",
    [ORDER_STATUS.CONFIRMED]:
      "Your order has been confirmed and is awaiting processing.",
    [ORDER_STATUS.PROCESSING]: "We're preparing your order.",
    [ORDER_STATUS.SHIPPED]: "Your order has been shipped.",
    [ORDER_STATUS.DELIVERED]:
      "Your order has been delivered. Thank you for choosing Enviroshield!",
    [ORDER_STATUS.CANCELLED]:
      "Your order has been cancelled. Please contact us if you have any questions.",
  };

  const children = `
    <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
      Order status update
    </div>

    <h1 style="color:#00334e;font-size:27px;line-height:35px;margin:12px 0;">
      Your order status has changed
    </h1>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      Hello ${escapeHtml(order.customer.name)}, there's an update to your Enviroshield order.
    </p>

    <div style="margin:24px 0;padding:20px;background:#f0f0fa;border-radius:10px;">
      <div style="color:#64748b;font-size:12px;">Order number</div>
      <div style="margin:5px 0 18px;color:#00334e;font-size:20px;font-weight:800;">
        ${escapeHtml(order.orderNumber)}
      </div>

      <div style="color:#64748b;font-size:12px;">Previous status</div>
      <div style="margin:5px 0 16px;color:#18384a;font-weight:700;">
        ${oldStatus}
      </div>

      <div style="color:#64748b;font-size:12px;">New status</div>
      <div style="margin-top:5px;color:#016edc;font-size:20px;font-weight:800;">
        ${currentStatus}
      </div>
    </div>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      ${statusMessage[order.status]}
    </p>

    <p style="margin-top:24px;color:#64748b;font-size:13px;line-height:22px;">
      Your order total is <strong>${formatBDT(order.totalAmount)}</strong>.
      Payment method: Cash on delivery.
    </p>
  `;

  const text = [
    "ENVIROSHIELD — ORDER STATUS UPDATE",
    "",
    `Hello ${order.customer.name},`,
    "",
    `Order number: ${order.orderNumber}`,
    `Previous status: ${oldStatus}`,
    `New status: ${currentStatus}`,
    "",
    statusMessage[order.status],
    "",
    `Order total: ${formatBDT(order.totalAmount)}`,
    "Payment method: Cash on delivery",
    "",
    "Thank you for choosing Enviroshield.",
  ].join("\n");

  await sendCustomerEmail(
    order.customer.email,
    subject,
    preview,
    children,
    text,
  );
};


const notifyPaymentConfirmed = async (order: TOrder): Promise<void> => {
  const subject = `Payment confirmed — ${order.orderNumber}`;
  const preview = `Your payment for order ${order.orderNumber} has been confirmed.`;

  const children = `
    <div style="color:#016edc;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
      Payment confirmation
    </div>

    <h1 style="color:#00334e;font-size:28px;line-height:36px;margin:12px 0;">
      Payment received!
    </h1>

    <p style="color:#18384a;font-size:15px;line-height:25px;">
      Hello ${escapeHtml(order.customer.name)}, we've confirmed receipt of your
      cash-on-delivery payment. Thank you for choosing Enviroshield.
    </p>

    <div style="margin:24px 0;padding:20px;background:#f0f0fa;border-radius:10px;">
      <div style="color:#64748b;font-size:12px;">Order number</div>
      <div style="margin:5px 0 18px;color:#00334e;font-size:20px;font-weight:800;">
        ${escapeHtml(order.orderNumber)}
      </div>

      <div style="color:#64748b;font-size:12px;">Payment status</div>
      <div style="margin-top:5px;color:#016edc;font-size:20px;font-weight:800;">
        Paid
      </div>

      <div style="margin-top:16px;color:#64748b;font-size:12px;">Amount paid</div>
      <div style="margin-top:5px;color:#00334e;font-size:24px;font-weight:800;">
        ${formatBDT(order.totalAmount)}
      </div>
    </div>

    <p style="color:#18384a;font-size:14px;line-height:24px;">
      <strong>Payment method:</strong> Cash on delivery
    </p>

    <p style="margin-top:24px;color:#64748b;font-size:13px;line-height:22px;">
      Keep this email for your records. If you have any questions about your
      payment, please contact our team.
    </p>
  `;

  const text = [
    "ENVIROSHIELD — PAYMENT CONFIRMATION",
    "",
    `Hello ${order.customer.name},`,
    "We've confirmed receipt of your cash-on-delivery payment.",
    "",
    `Order number: ${order.orderNumber}`,
    "Payment status: Paid",
    `Amount paid: ${formatBDT(order.totalAmount)}`,
    "Payment method: Cash on delivery",
    "",
    "Thank you for choosing Enviroshield.",
  ].join("\n");

  await sendCustomerEmail(
    order.customer.email,
    subject,
    preview,
    children,
    text,
  );
};

export const orderNotification = {
  notifyOrderPlaced,
  notifyOrderStatusUpdated,
  notifyPaymentConfirmed,
};
