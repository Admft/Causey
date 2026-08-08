import "server-only";

export type ProductEmailMessage = {
  subject: string;
  preview: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  recipientContext?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderProductEmail(message: ProductEmailMessage): {
  html: string;
  text: string;
} {
  const settingsUrl = `${new URL(message.actionUrl).origin}/account#alerts`;
  const context = message.recipientContext
    ? `<p style="margin:0 0 14px;color:#5a6570;font-size:14px;line-height:1.5">${escapeHtml(
        message.recipientContext
      )}</p>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light only">
    <title>${escapeHtml(message.subject)}</title>
  </head>
  <body style="margin:0;background:#f5f9fc;color:#14181c;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(
      message.preview
    )}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f9fc">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid rgba(20,24,28,.1);border-radius:12px">
            <tr>
              <td style="padding:28px">
                <p style="margin:0 0 20px;color:#c23b32;font-family:Georgia,serif;font-size:24px;font-weight:700">Causey</p>
                ${context}
                <h1 style="margin:0;color:#14181c;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escapeHtml(
                  message.heading
                )}</h1>
                <p style="margin:18px 0 0;color:#3a4450;font-size:16px;line-height:1.6">${escapeHtml(
                  message.body
                )}</p>
                <p style="margin:24px 0">
                  <a href="${escapeHtml(
                    message.actionUrl
                  )}" style="display:inline-block;border-radius:8px;background:#c23b32;color:#ffffff;font-size:15px;font-weight:700;line-height:1;padding:13px 18px;text-decoration:none">${escapeHtml(
                    message.actionLabel
                  )}</a>
                </p>
                <p style="margin:0;color:#5a6570;font-size:13px;line-height:1.5">
                  Causey is an early build. Confirm tournament details and registration on the organizer&rsquo;s official site.
                </p>
                <p style="margin:18px 0 0;color:#5a6570;font-size:13px;line-height:1.5">
                  Manage product-email choices in <a href="${escapeHtml(
                    settingsUrl
                  )}" style="color:#3a4450">Causey account settings</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Causey",
    message.recipientContext,
    message.heading,
    message.body,
    `${message.actionLabel}: ${message.actionUrl}`,
    "Causey is an early build. Confirm tournament details and registration on the organizer's official site.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}
