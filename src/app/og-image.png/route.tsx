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
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 800,
              color: "white",
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            MyDex
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "#c4b5fd",
            marginBottom: "48px",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Digital Employee Experience Platform
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
          {["Real-time Monitoring", "Fleet Health", "SOC 2 Compliance", "DEX Scoring", "Auto-Remediation"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  padding: "10px 24px",
                  borderRadius: "999px",
                  background: "rgba(139, 92, 246, 0.2)",
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                  color: "#e9d5ff",
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
            color: "#a78bfa",
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
