import { ImageResponse } from "next/og";

export const alt = "Quish Family Explorer";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, #ede4d4 0%, #f7f2ea 55%, #e8efe8 100%)",
          color: "#132029",
          padding: 54,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            borderRadius: 36,
            border: "1px solid #d6cab8",
            background: "rgba(255,255,255,0.78)",
            padding: 42,
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "64%",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 18,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#5f6d76",
              }}
            >
              1901, 1911, and 1926-ready
            </div>
            <div
              style={{
                fontSize: 76,
                lineHeight: 1,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span>Quish Family</span>
              <span>Explorer</span>
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.4,
                color: "#42505a",
                display: "flex",
                maxWidth: "90%",
              }}
            >
              A shareable census-first family tree for Quish households in Ireland.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "30%",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {[
              ["Exact records", "163"],
              ["Households", "41"],
              ["Connected clusters", "13"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 24,
                  border: "1px solid #d6cab8",
                  background: "#efe6d6",
                  padding: "22px 24px",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    color: "#5f6d76",
                  }}
                >
                  {label}
                </span>
                <strong
                  style={{
                    marginTop: 8,
                    fontSize: 44,
                    fontWeight: 700,
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
