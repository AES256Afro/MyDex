import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "white",
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            MyDex
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: "white",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          IT Support Portal
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            fontWeight: 500,
            color: "#93c5fd",
            marginBottom: "48px",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Self-service remediation, ticketing, and device management
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Ticket Queue", "Auto-Remediation", "Device Diagnostics", "SLA Tracking", "Knowledge Base"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  padding: "10px 24px",
                  borderRadius: "999px",
                  background: "rgba(59, 130, 246, 0.2)",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  color: "#bfdbfe",
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "#60a5fa",
          }}
        >
          mydexnow.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
