import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Same mark as the home-screen icon, with proportions opened up so it still
// reads at favicon size.
export default function Icon() {
  const bars = [16, 23, 30, 39];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 5,
          paddingBottom: 13,
        }}
      >
        {bars.map((h) => (
          <div
            key={h}
            style={{
              width: 8,
              height: h,
              background: "#FFFFFF",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
