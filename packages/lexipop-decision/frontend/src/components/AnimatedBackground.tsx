export function AnimatedBackground() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      backgroundImage: "url('/cabello.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: 0.18,
      pointerEvents: "none",
    }} />
  );
}