export function outletInviteHtml(signupLink: string): string {
    return `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #d4d4d8;
            background: #070c08;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #0f2012 0%, #0b140d 100%);
            color: #c8e63c;
            padding: 22px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid rgba(200, 230, 60, 0.28);
          }
          .content {
            background: #0c1310;
            padding: 22px;
            margin: 16px 0;
            border-radius: 12px;
            border: 1px solid rgba(200, 230, 60, 0.16);
            color: #e4e4e7;
          }
          .footer {
            text-align: center;
            color: #a1a1aa;
            font-size: 12px;
            margin-top: 18px;
          }
          .button {
            background: #c8e63c;
            color: #0b140d;
            padding: 11px 20px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            margin: 10px 0;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }
          .kicker {
            margin-top: 6px;
            font-size: 11px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: rgba(200, 230, 60, 0.72);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">TILT YOUR MUSIC</h1>
            <p class="kicker">Outlet Partner Invite</p>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>You've been invited to join Tilt Your Music as an outlet partner. Click below to create your account.</p>
            <p style="text-align:center;"><a href="${signupLink}" class="button">Create Account</a></p>
            <p>If you weren't expecting this invite, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Tilt Your Music. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}