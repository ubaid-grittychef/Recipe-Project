import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || siteConfig.name;
  const description = searchParams.get("description") || siteConfig.description || "Delicious recipes for every occasion";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fffdf7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: "#f97316" }} />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 80px",
            maxWidth: "100%",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 16,
              backgroundColor: "#f97316",
              fontSize: 48,
              marginBottom: 32,
            }}
          >
            🍳
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#0f172a",
              textAlign: "center",
              lineHeight: 1.1,
              maxWidth: 900,
              letterSpacing: "-0.02em",
            }}
          >
            {title.length > 60 ? title.slice(0, 57) + "..." : title}
          </div>

          {/* Description */}
          {description && (
            <div
              style={{
                fontSize: 24,
                color: "#64748b",
                textAlign: "center",
                marginTop: 16,
                maxWidth: 700,
                lineHeight: 1.4,
              }}
            >
              {description.length > 100 ? description.slice(0, 97) + "..." : description}
            </div>
          )}

          {/* Site name */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f97316",
              marginTop: 32,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {siteConfig.name}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
