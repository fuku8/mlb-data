// Gini係数: 分布の偏り（0=完全均等、1に近いほど偏り大）
export function gini(values: number[]): number {
  const xs = [...values].sort((a, b) => a - b);
  const n = xs.length;
  const sum = xs.reduce((a, b) => a + b, 0);
  if (n === 0 || sum === 0) return 0;
  let acc = 0;
  xs.forEach((x, i) => {
    acc += (2 * (i + 1) - n - 1) * x;
  });
  return acc / (n * sum);
}
