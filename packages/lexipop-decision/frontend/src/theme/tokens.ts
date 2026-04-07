export const THEME = {
  primary:        "#1a7a4a",
  primaryMid:     "#145f39",
  primaryDim:     "#2a9a5a",
  primaryFixed:   "#d0f0e0",

  coral:          "#e85d4a",
  coralLight:     "#fde8e5",
  gold:           "#f5c842",
  goldLight:      "#fef8e1",

  surface:        "#f2f0ed",
  surfaceLow:     "#eae8e4",
  surfaceCard:    "#ffffff",
  surfaceMid:     "#e0deda",
  surfaceHigh:    "#d4d2ce",
  surfaceHighest: "#c8c6c2",

  onSurface:      "#1a1a1a",
  onMuted:        "#4a4a4a",
  outline:        "#8a8a8a",
  outlineVariant: "#c8c6c2",

  error:          "#c0392b",
  errorBg:        "#fdecea",

  fontHead:  "'Inter', system-ui, sans-serif",
  fontBody:  "'Inter', system-ui, sans-serif",

  space: {
    1:"0.25rem", 2:"0.5rem",  3:"0.75rem", 4:"1rem",
    5:"1.25rem", 6:"1.5rem",  8:"2rem",    10:"2.5rem",
    12:"3rem",   16:"4rem",   20:"5rem",
  },
  radius: {
    sm:"0.375rem", md:"0.75rem", lg:"1rem",
    xl:"1.25rem",  "2xl":"1.75rem", full:"9999px",
  },
  shadow: {
    ambient: "0 2px 12px rgba(0,0,0,0.06)",
    float:   "0 8px 32px rgba(0,0,0,0.10)",
    card:    "0 1px 4px rgba(0,0,0,0.08)",
  },
} as const;

export type Theme = typeof THEME;
