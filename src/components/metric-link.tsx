import Link from "next/link";
import { CircleHelp } from "lucide-react";

// 指標カードのタイトル横に付ける、/metrics の該当解説セクションへ飛ぶ「?」リンク
export function MetricLink({ anchor }: { anchor: string }) {
  return (
    <Link
      href={`/metrics#${anchor}`}
      title="この指標の解説を見る"
      aria-label="この指標の解説を見る"
      style={{ color: "var(--muted-foreground)", display: "inline-flex", alignItems: "center" }}
    >
      <CircleHelp size={16} />
    </Link>
  );
}
