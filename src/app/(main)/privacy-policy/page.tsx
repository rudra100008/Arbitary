export const metadata = {
  title: "Privacy Policy – Arbitrary",
};

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "sans-serif",
        lineHeight: 1.7,
      }}
    >
      <h1>Privacy Policy</h1>
      <p>Last updated: July 3, 2026</p>

      <p>
        This Privacy Policy describes how Arbitrary collects, uses, and
        discloses your personal data when you use our Service. By creating an
        account or using the Service, you agree to the collection and use of
        information in accordance with this policy.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Information You Provide</h3>
      <ul>
        <li><strong>Account Information:</strong> First name, last name, email address, password (bcrypt-hashed), and date of birth.</li>
        <li><strong>Profile Information:</strong> Biography, location, phone number, Instagram username, and profile picture (which may be imported from Google or Facebook).</li>
        <li><strong>Task Proofs:</strong> Screenshots and social media URLs submitted as proof of task completion. These may include EXIF metadata (camera make/model, software, timestamps) which we extract for duplicate detection.</li>
        <li><strong>Optional Referral Code:</strong> If you were referred by another user, their referral code is linked to your account.</li>
      </ul>

      <h3>1.2 Information from Third-Party Logins</h3>
      <p>When you sign in with Google or Facebook, we receive:</p>
      <ul>
        <li><strong>Google:</strong> Your name, email address, profile picture, Google account ID, and (with your consent) YouTube API tokens used solely for task verification.</li>
        <li><strong>Facebook:</strong> Your name, email address, profile picture, and Facebook account ID.</li>
      </ul>

      <h3>1.3 Information Collected Automatically</h3>
      <ul>
        <li><strong>Device Fingerprint:</strong> We use FingerprintJS to collect a browser fingerprint (visitorId) at signup and task submission for fraud prevention and duplicate-account detection.</li>
        <li><strong>IP Address:</strong> Your IP address is logged for rate limiting, fraud detection, and security monitoring.</li>
        <li><strong>Usage Data:</strong> Pages visited, time spent on pages, task completion times, and feature interactions.</li>
        <li><strong>Session Information:</strong> A session cookie (httpOnly JWT) is set to maintain your login state.</li>
        <li><strong>Referral Cookie:</strong> A temporary httpOnly cookie stores referral codes during OAuth signup flow (10-minute expiry).</li>
        <li><strong>Share Click Data:</strong> When you access a shared task link, we collect your IP address, browser fingerprint, and user agent for analytics and fraud prevention.</li>
      </ul>

      <h3>1.4 Uploaded Files</h3>
      <p>
        Screenshots, profile pictures, and media files you upload are stored on
        Cloudinary. We extract EXIF metadata and compute perceptual hashes from
        uploaded images for duplicate detection. The actual image files are
        retained on Cloudinary and may include any metadata embedded by your
        device or editing software.
      </p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li><strong>Service Operation:</strong> To create and manage your account, track task completions, award points, and process deal redemptions.</li>
        <li><strong>Task Verification:</strong> To verify that you have completed tasks as claimed, including checking YouTube subscriptions/likes/comments via the YouTube Data API, Facebook comments via the Facebook Graph API, and Instagram comments via the Instagram Graph API.</li>
        <li><strong>Fraud Prevention:</strong> To detect and prevent fraudulent activity, including duplicate accounts, fake submissions, and automated abuse. This includes analyzing device fingerprints, submission patterns, image metadata, and perceptual hashes.</li>
        <li><strong>Communication:</strong> To send you transactional emails (verification emails, password resets, notifications about your account and rewards).</li>
        <li><strong>Leaderboard and Rankings:</strong> To calculate and display points-based rankings on the leaderboard.</li>
        <li><strong>Service Improvement:</strong> To analyze usage patterns and improve the Service. No third-party analytics services (such as Google Analytics) are used.</li>
        <li><strong>Compliance:</strong> To comply with legal obligations and enforce our Terms of Service.</li>
      </ul>

      <h2>3. How We Share Your Information</h2>
      <p>We may share your information with:</p>
      <ul>
        <li><strong>Service Providers:</strong> Third-party services that help us operate the platform, including:
          <ul>
            <li>Neon (PostgreSQL database hosting)</li>
            <li>Cloudinary (file and image storage)</li>
            <li>Vercel (application hosting)</li>
            <li>Google (OAuth, YouTube Data API)</li>
            <li>Facebook / Instagram (OAuth, Graph API)</li>
            <li>Cloudflare Turnstile (bot detection)</li>
            <li>FingerprintJS (device fingerprinting)</li>
            <li>Nodemailer via Gmail SMTP (transactional emails)</li>
          </ul>
        </li>
        <li><strong>Partner Outlets:</strong> When you redeem a deal or reward, limited information (such as your name and redemption details) may be shared with the partner outlet for fulfillment purposes.</li>
        <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority.</li>
        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</li>
      </ul>
      <p>We do not sell your personal data to third parties.</p>

      <h2>4. Cookies and Tracking</h2>
      <p>We use the following cookies and similar technologies:</p>
      <ul>
        <li><strong>Session Cookie (httpOnly JWT):</strong> Essential for authentication. Set via our SessionProvider. Expires after 30 days of inactivity.</li>
        <li><strong>Referral Cookie (httpOnly):</strong> Stores a pending referral code during OAuth signup. Expires after 10 minutes.</li>
        <li><strong>Local Storage:</strong> We store a flag indicating whether you have claimed your daily login bonus today (no personal data).</li>
      </ul>
      <p>
        We do not use third-party cookies for advertising, analytics, or
        tracking across other websites. No Google Analytics, Facebook Pixel, or
        similar tracking scripts are used on the Service.
      </p>

      <h2>5. Data Retention</h2>
      <p>We retain your personal data for the following periods:</p>
      <ul>
        <li><strong>Account Data:</strong> For the duration of your account relationship plus up to 24 months after account closure, to handle post-termination issues and comply with legal obligations.</li>
        <li><strong>Task and Points Data:</strong> Retained indefinitely for leaderboard history and fraud audit purposes. Anonymized statistical data may be retained indefinitely.</li>
        <li><strong>Uploaded Files:</strong> Retained as long as your account is active, plus up to 24 months after deletion, to maintain proof records. Deleted images may remain in Cloudinary backups for a limited period.</li>
        <li><strong>Server Logs:</strong> IP addresses and access logs are retained for up to 24 months for security monitoring.</li>
        <li><strong>Rate Limit Data:</strong> Expired rate limit entries are periodically cleaned up.</li>
      </ul>

      <h2>6. Data Security</h2>
      <p>
        We implement the following security measures to protect your data:
      </p>
      <ul>
        <li>Passwords are hashed using bcrypt with 12 salt rounds.</li>
        <li>Google OAuth refresh tokens are encrypted at rest using AES-256-GCM.</li>
        <li>Deal codes are encrypted at rest using AES-256-GCM.</li>
        <li>All database connections use SSL/TLS encryption.</li>
        <li>Session tokens are httpOnly JWTs, preventing client-side script access.</li>
        <li>Verification tokens are stored as a combined SHA-256 hash and bcrypt hash.</li>
        <li>Rate limiting is applied to sensitive endpoints (signup, referral binding, deal redemption).</li>
      </ul>

      <h2>7. Your Rights</h2>
      <p>You have the following rights regarding your personal data:</p>
      <ul>
        <li><strong>Access:</strong> You can view your account information and activity history within the Service.</li>
        <li><strong>Correction:</strong> You can update your name, phone number, bio, location, and Instagram username through your profile settings.</li>
        <li><strong>Deletion:</strong> You can request account deletion by contacting us at arbitrary123@gmail.com. Upon deletion, your personal data will be removed within 30 days, subject to legal retention requirements.</li>
        <li><strong>Third-Party Disconnection:</strong> You can unlink your Facebook account from within the Service. Google account unlinking is available upon request.</li>
        <li><strong>Objection:</strong> You may object to the processing of your data for fraud detection purposes, though this may affect your ability to use the Service (fraud prevention is essential to the platform).</li>
        <li><strong>Data Portability:</strong> You may request a copy of your personal data by contacting us.</li>
      </ul>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        The Service is not intended for individuals under the age of 16. We do
        not knowingly collect personal data from anyone under 16. If you become
        aware that a child has provided us with personal data, please contact us
        immediately. If we discover that we have collected personal data from a
        child under 16 without verifiable parental consent, we will delete such
        data promptly.
      </p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be processed on servers located outside your country of
        residence, including in the United States and other jurisdictions where
        our service providers operate. By using the Service, you consent to the
        transfer of your data to these locations. Where required by applicable
        law, we ensure appropriate safeguards are in place for such transfers.
      </p>

      <h2>10. Third-Party Links</h2>
      <p>
        The Service may contain links to third-party websites. We are not
        responsible for the privacy practices or content of these third-party
        sites. We encourage you to review the privacy policies of any
        third-party sites you visit.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be
        posted on this page with an updated &quot;Last updated&quot; date.
        Material changes will be communicated via email or through the Service.
        Your continued use of the Service after changes constitutes your
        acceptance of the updated policy.
      </p>

      <h2>12. Contact</h2>
      <p>
        If you have any questions, concerns, or data subject requests, please
        contact us:
      </p>
      <ul>
        <li>Email: arbitrary123@gmail.com</li>
      </ul>
    </main>
  );
}
