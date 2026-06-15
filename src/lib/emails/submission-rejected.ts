export function submissionRejectedEmailHtml(params: {
    name: string;
    taskTitle: string;
    reason: string;
    timestamp: string;
    dashboardUrl: string;
}): string {
    const { name, taskTitle, reason, timestamp, dashboardUrl } = params;

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #FACC15; padding: 20px; border-radius: 8px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .status-badge { display: inline-block; background: #FEE2E2; color: #B91C1C; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 999px; }
          .details { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
          .details p { margin: 6px 0; font-size: 14px; }
          .label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .button { background: #000; color: #FACC15; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ARBITRARY</h1>
            <p>Submission Update</p>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your proof submission for the task below was reviewed and <span class="status-badge">Rejected</span>.</p>
            <div class="details">
              <p><span class="label">Task</span><br/>${taskTitle}</p>
              <p><span class="label">Status</span><br/>Rejected</p>
              <p><span class="label">Reason</span><br/>${reason}</p>
              <p><span class="label">Reviewed at</span><br/>${timestamp}</p>
            </div>
            <p>If this was a mistake or the issue has been fixed, you can resubmit your proof for this task from your dashboard.</p>
            <p style="text-align:center;"><a href="${dashboardUrl}" class="button">Go to Dashboard</a></p>
          </div>
          <div class="footer">
            <p>© 2026 Arbitrary. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}