"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Line,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

Font.register({
  family: "Helvetica",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/helvetica-neue/v5/1Ptsg8zYS_SKggPNyC0ITQ.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/helvetica-neue/v5/1Ptsg8zYS_SKggPNyC0ITQ.woff2",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#f1f5f9",
    padding: 0,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  card: {
    width: "85%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    position: "relative",
  },

  // ── Dark top section ──────────────────────────────────────
  topSection: {
    backgroundColor: "#0c1222",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: "relative",
    overflow: "hidden",
  },
  decorCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(250,204,21,0.07)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: 20,
    left: -40,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(250,204,21,0.04)",
  },
  brandLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: "rgba(250,204,21,0.6)",
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "Courier",
  },
  eventTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    lineHeight: 1.15,
    marginBottom: 2,
  },
  eventSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    marginBottom: 20,
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    gap: 24,
    paddingBottom: 22,
  },
  metaItem: {
    flexDirection: "column",
    gap: 3,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Courier",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  metaValueAccent: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#FACC15",
  },

  // ── Perforation ────────────────────────────────────────────
  perfRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c1222",
    height: 22,
  },
  perfCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
  },
  perfLine: {
    flex: 1,
    marginHorizontal: 3,
    height: 2,
    justifyContent: "center",
  },

  // ── White bottom section ───────────────────────────────────
  bottomSection: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 18,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FACC15",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0c1222",
  },
  attendeeName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0c1222",
  },
  attendeeEmail: {
    fontSize: 9.5,
    color: "#64748b",
    fontFamily: "Courier",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 16,
  },

  // ── Access & verification area ─────────────────────────────
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftCol: {
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 7.5,
    fontFamily: "Courier",
    letterSpacing: 1.2,
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: "#0c1222",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Courier",
    color: "#FACC15",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  issuedText: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "#64748b",
  },
  qrContainer: {
    width: 90,
    height: 90,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  qrImage: {
    width: 72,
    height: 72,
  },
  scanHint: {
    marginTop: 14,
    fontSize: 8.5,
    fontFamily: "Courier",
    color: "#94a3b8",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ── Yellow footer ──────────────────────────────────────────
  stub: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 28,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  stubId: {
    fontSize: 10,
    fontFamily: "Courier",
    color: "#0c1222",
    letterSpacing: 0.5,
    fontWeight: 700,
  },
  stubScan: {
    fontSize: 9,
    fontFamily: "Courier",
    color: "rgba(12,18,34,0.5)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // ── Floating download circle ───────────────────────────────
  floatingBtn: {
    position: "absolute",
    bottom: -18,
    right: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0c1222",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  floatingArrow: {
    fontSize: 16,
    color: "#FACC15",
    lineHeight: 1,
    marginTop: -2,
  },
});

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TicketPDFProps {
  ticket: { id: number; redemptionToken: string };
  event: {
    title: string;
    eventDate: string;
    venue: string | null;
    description: string | null;
    heroImageUrl: string | null;
  };
  user: { name: string | null; email: string };
  accessType: string;
}

export default function TicketPDF({
  ticket,
  event,
  user,
  accessType,
}: TicketPDFProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const redemptionUrl = `${window.location.origin}/admin/tickets/redeem?token=${ticket.redemptionToken}`;
    QRCode.toDataURL(redemptionUrl, {
      width: 300,
      margin: 1,
      color: { dark: "#0c1222", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [ticket.redemptionToken]);

  const formattedDate = new Date(event.eventDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedIssued = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const ticketId = `#${ticket.id.toString().padStart(6, "0")}`;

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.card}>
          {/* ── Dark top section ── */}
          <View style={styles.topSection}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <Text style={styles.brandLabel}>arbitary.com</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventSub}>Event Ticket — Digital Pass</Text>

            {/* 3-column metadata */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>
              {event.venue && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Venue</Text>
                  <Text style={styles.metaValue}>{event.venue}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Ticket</Text>
                <Text style={styles.metaValueAccent}>{ticketId}</Text>
              </View>
            </View>
          </View>

          {/* ── Perforation ── */}
          <View style={styles.perfRow}>
            <View style={[styles.perfCircle, { marginLeft: -11 }]} />
            <View style={styles.perfLine}>
              <Svg style={{ width: "100%", height: 2 }}>
                <Line
                  x1="0" y1="1" x2="1000" y2="1"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
              </Svg>
            </View>
            <View style={[styles.perfCircle, { marginRight: -11 }]} />
          </View>

          {/* ── White bottom section ── */}
          <View style={styles.bottomSection}>
            {/* Attendee */}
            <View style={styles.attendeeRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
              <View>
                <Text style={styles.attendeeName}>{user.name || "Guest"}</Text>
                <Text style={styles.attendeeEmail}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Access + QR */}
            <View style={styles.contentRow}>
              <View style={styles.leftCol}>
                <View>
                  <Text style={styles.fieldLabel}>Access Level</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {accessType || "General"}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.fieldLabel}>Issue Date</Text>
                  <Text style={styles.issuedText}>{formattedIssued}</Text>
                </View>
              </View>

              {qrDataUrl ? (
                <View style={styles.qrContainer}>
                  <Image style={styles.qrImage} src={qrDataUrl} />
                </View>
              ) : (
                <View style={styles.qrContainer}>
                  <Text
                    style={{
                      fontSize: 8,
                      color: "#94a3b8",
                      fontFamily: "Courier",
                    }}
                  >
                    Loading...
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.scanHint}>
              Present this QR code at the entrance · Non-transferable
            </Text>
          </View>

          {/* ── Yellow footer ── */}
          <View style={styles.stub}>
            <Text style={styles.stubId}>TICKET {ticketId}</Text>
            <Text style={styles.stubScan}>Scan at Entry</Text>
          </View>

          {/* ── Floating circle ── */}
          <View style={styles.floatingBtn}>
            <Text style={styles.floatingArrow}>↓</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
