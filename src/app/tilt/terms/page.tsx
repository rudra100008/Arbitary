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
          Terms of participation
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
            Data Use
          </h2>
          <p>
            Your email and phone number are used solely to manage your entry,
            prevent duplicate accounts, and contact you if you win. Your data
            will not be shared with third parties or used for marketing without
            your explicit consent.
          </p>

          <h2 style={{ color: "#c8e63c", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
            Prizes
          </h2>
          <p>
            Prizes are awarded at the discretion of Tilt Your Music and
            participating outlets. Instant rewards are valid only at the outlet
            where the entry was submitted and are non-transferable.
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
