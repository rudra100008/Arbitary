export default function TiltTermsPage() {
  return (
    <div
      className="min-h-screen px-6 py-20"
      style={{ background: "#0e1f10", color: "rgba(255,255,255,0.8)" }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1
          style={{
            color: "#c8e63c",
            fontSize: "20px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            marginBottom: "24px",
          }}
        >
          Terms of Participation
        </h1>

        <div style={{ fontSize: "14px", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: "16px" }}>
          <p>
            By submitting an entry, you agree to these Terms of participation.
            This promotion is operated by Tilt Your Music and is subject to all
            applicable laws and regulations.
          </p>

          <h2 style={{ color: "#c8e63c", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
            Eligibility
          </h2>
          <p>
            You must be 21 years of age or older to participate. Employees of
            Tilt Your Music and participating outlets are not eligible.
          </p>

          <h2 style={{ color: "#c8e63c", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
            Data Privacy & Utilization
          </h2>
          <p>
            Your contact information is strictly utilized to authenticate your entry, mitigate duplicate submissions, and facilitate communication exclusively in the event of a win. Under no circumstances will your personal data be distributed, sold, or shared with any third-party entities, regardless of consent status.
          </p>
          <p>
            Aggregated, non-personally identifiable analytics—such as registration volume and geographical outlet distribution—are retained solely for internal performance review and customer relationship management (CRM) enhancements.
          </p>

          {/* Adjusted to general "Perks & Experiences" and professional but clear text */}
          <h2 style={{ color: "#c8e63c", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
            Incentives & Experiences
          </h2>
          <p>
            Any instant incentives are valid exclusively at the participating outlet where the entry was submitted. Redemption of these incentives is subject to the venue's current stock availability and cannot be transferred to another person. Tilt Your Music reserves the right to determine the final selection for the primary campaign experiences. These perks hold no cash value and may not be exchanged for alternative compensation.
          </p>

          <h2 style={{ color: "#c8e63c", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
            General
          </h2>
          <p>
            Tilt Your Music reserves the right to modify or cancel this
            promotion at any time. These terms are specific to this promotion
            and do not replace the general Terms of Service of Arbitrary.
          </p>
        </div>
      </div>
    </div>
  );
}
