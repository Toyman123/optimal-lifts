import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: four bars rising, the readout's core idea. Full-bleed
// black — iOS applies its own corner mask, so rounding it here would show a
// double corner. White on black keeps it legible over any wallpaper.
export default function AppleIcon() {
  const bars = [44, 62, 82, 108];

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
          gap: 14,
          paddingBottom: 38,
        }}
      >
        {bars.map((h) => (
          <div
            key={h}
            style={{
              width: 22,
              height: h,
              background: "#FFFFFF",
              borderRadius: 5,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
