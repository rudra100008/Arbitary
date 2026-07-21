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
} from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

const CARD_RADIUS = 32;
const PERF_SIZE = 24;
const YELLOW = "#FACC15";
const NAVY = "#0f172a";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#e2e8f0",
    padding: 0,
    paddingVertical: 30,
    alignItems: "center",
  },

  // ── Card wrapper ──────────────────────────────────────────
  card: {
    width: "85%",
    backgroundColor: "#ffffff",
    borderRadius: CARD_RADIUS,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 30,
  },

  // ── Header Section (Dark Theme) ──────────────────────────────────────
  topSection: {
    backgroundColor: NAVY,
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 0,
    position: "relative",
    overflow: "hidden",
  },
  decorCircle1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(250,204,21,0.08)",
  },
  decorCircle2: {
    position: "absolute",
    bottom: -20,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(250,204,21,0.05)",
  },
  brandLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    marginBottom: 8,
    fontFamily: "Courier",
  },
  eventTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    lineHeight: 1.2,
    marginBottom: 4,
  },
  eventSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 24,
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 24,
  },
  metaItem: {
    flexDirection: "column",
    gap: 4,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Courier",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  metaValueAccent: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: YELLOW,
  },

  // ── Perforation ────────────────────────────────────────────
  perfRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    height: PERF_SIZE,
  },
  perfCircle: {
    width: PERF_SIZE,
    height: PERF_SIZE,
    borderRadius: PERF_SIZE / 2,
    backgroundColor: "#e2e8f0",
  },
  perfLineWrap: {
    flex: 1,
    marginHorizontal: 4,
    height: 2,
    justifyContent: "center",
  },

  // ── Body Section (Light Theme) ───────────────────────────────────
  body: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 24,
  },
  
  // ── Two-Column Layout ─────────────────────────────
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftCol: {
    flexDirection: "column",
    gap: 16,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 7.5,
    fontFamily: "Courier",
    letterSpacing: 1.2,
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: NAVY,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Courier",
    color: YELLOW,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  issuedText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginTop: 4,
  },
  qrContainer: {
    width: 110,
    height: 110,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 20,
  },
  qrImage: {
    width: 90,
    height: 90,
  },
  scanHint: {
    marginTop: 24,
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "left",
  },

  // ── Footer Strip ──────────────────────────────────────────
  footerStrip: {
    backgroundColor: YELLOW,
    paddingHorizontal: 32,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  footerId: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  footerScan: {
    fontSize: 10,
    color: "rgba(15, 23, 42, 0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

interface TicketData {
  id: number;
  redemptionToken: string;
}

interface TicketPDFProps {
  tickets: TicketData[];
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

function TicketCard({
  ticket,
  event,
  user: _user,
  accessType,
  qrDataUrl,
}: {
  ticket: TicketData;
  event: TicketPDFProps["event"];
  user: TicketPDFProps["user"];
  accessType: string;
  qrDataUrl: string;
}) {
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
    <View style={styles.card}>
      {/* ── Dark header ── */}
      <View style={styles.topSection}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <Text style={styles.brandLabel}>arbitrary.com</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventSub}>Event Ticket — Digital Pass</Text>

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
        <View style={[styles.perfCircle, { marginLeft: -PERF_SIZE / 2 }]} />
        <View style={styles.perfLineWrap}>
          <Svg style={{ width: "100%", height: 2 }}>
            <Line
              x1="0" y1="1" x2="1000" y2="1"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          </Svg>
        </View>
        <View style={[styles.perfCircle, { marginRight: -PERF_SIZE / 2 }]} />
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
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
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt prop */}
              <Image style={styles.qrImage} src={qrDataUrl} />
            </View>
          ) : (
            <View style={styles.qrContainer}>
              <Text style={{ fontSize: 7, color: "#94a3b8", fontFamily: "Courier" }}>
                Loading...
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.scanHint}>
          Present this QR code at the entrance · Non-transferable
        </Text>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footerStrip}>
        <Text style={styles.footerId}>TICKET {ticketId}</Text>
        <Text style={styles.footerScan}>SCAN AT ENTRY</Text>
      </View>
    </View>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export default function TicketPDF({
  tickets,
  event,
  user,
  accessType,
}: TicketPDFProps) {
  const [qrDataUrls, setQrDataUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      const map: Record<number, string> = {};
      for (const t of tickets) {
        if (cancelled) return;
        map[t.id] = await QRCode.toDataURL(t.redemptionToken, {
          width: 360,
          margin: 1,
          color: { dark: NAVY, light: "#ffffff" },
        });
      }
      if (!cancelled) setQrDataUrls(map);
    };
    generate();
    return () => { cancelled = true; };
  }, [tickets]);

  const pages = chunkArray(tickets, 2);

  return (
    <Document>
      {pages.map((pageTickets, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          {pageTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              event={event}
              user={user}
              accessType={accessType}
              qrDataUrl={qrDataUrls[ticket.id] || ""}
            />
          ))}
        </Page>
      ))}
    </Document>
  );
}
