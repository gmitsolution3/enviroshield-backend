
import "dotenv/config";

const logoUrl = process.env.EMAIL_LOGO_URL;

type TEmailLayout = {
  preview: string;
  children: string;
};

export function emailLayout({
  preview,
  children,
}: TEmailLayout): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>Enviroshield</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f0f0fa;
          color: #18384a;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <div
          style="
            display: none;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
          "
        >${preview}</div>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width: 100%; background-color: #f0f0fa;"
        >
          <tr>
            <td align="center" style="padding: 42px 20px;">
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="width: 100%; max-width: 600px;"
              >
                <tr>
                  <td align="center" style="padding: 0 0 26px;">
                    ${
                      logoUrl
                        ? `
                          <img
                            src="${logoUrl}"
                            alt="Enviroshield"
                            width="56"
                            height="56"
                            style="
                              display: block;
                              width: 56px;
                              height: 56px;
                              object-fit: contain;
                              border: 0;
                            "
                          />
                        `
                        : `
                          <div
                            style="
                              color: #00334e;
                              font-size: 24px;
                              line-height: 30px;
                              font-weight: 800;
                              letter-spacing: -0.7px;
                            "
                          >
                            Enviro<span style="color: #016edc;">shield</span>
                          </div>
                        `
                    }
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 0 0 20px;">
                    <div
                      style="
                        width: 28px;
                        height: 2px;
                        background-color: #016edc;
                        font-size: 0;
                        line-height: 0;
                      "
                    >&nbsp;</div>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      background-color: #ffffff;
                      border: 1px solid #dfe5e9;
                      border-radius: 16px;
                      padding: 42px;
                    "
                  >
                    ${children}
                  </td>
                </tr>

                <tr>
                  <td
                    align="center"
                    style="
                      padding: 26px 10px 0;
                      color: #18384a;
                      font-size: 12px;
                      line-height: 20px;
                    "
                  >
                    <div
                      style="
                        color: #00334e;
                        font-size: 12px;
                        line-height: 20px;
                        font-weight: 800;
                      "
                    >
                      Enviroshield
                    </div>

                    <div style="margin-top: 4px;">
                      Environmental solutions for a better future.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
