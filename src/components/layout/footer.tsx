export function Footer() {
  return (
    <footer className="mt-8" style={{ borderTop: "1px solid #262626" }}>
      <div
        className="container mx-auto px-4 py-4 text-xs flex flex-wrap gap-3 justify-between"
        style={{ color: "#9ca3af" }}
      >
        <span>MLB Data Dashboard (Non-commercial)</span>
        <span>
          Data source: MLB Stats API / Terms: https://gdx.mlb.com/components/copyright.txt
        </span>
      </div>
    </footer>
  );
}
