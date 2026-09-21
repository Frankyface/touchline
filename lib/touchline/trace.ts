export type TracePoint = { x: number; y: number; t: number };
export type Trace = {
  points: TracePoint[];
  mode: "natural" | "polygon";
  edges: number;
  straighten: number;
};
const bounds = (n: number) => Math.max(3, Math.min(97, n));
const cache = new WeakMap<Trace, TracePoint[]>();
const anchoredCache = new WeakMap<
  Trace,
  { key: string; points: TracePoint[] }
>();

function projection(p: TracePoint, a: TracePoint, b: TracePoint) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const fraction =
    dx * dx + dy * dy
      ? Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy),
          ),
        )
      : 0;
  return { x: a.x + dx * fraction, y: a.y + dy * fraction };
}

// Split the most significant bend until N edges have N+1 vertices. Unlike
// sampling evenly in time, this retains sharp direction changes and loops.
export function polygonIndices(points: TracePoint[], edges: number): number[] {
  const indices = [0, points.length - 1];
  while (indices.length < Math.min(points.length, edges + 1)) {
    let split = -1,
      largest = -1;
    for (let n = 1; n < indices.length; n++) {
      const left = indices[n - 1],
        right = indices[n];
      for (let i = left + 1; i < right; i++) {
        const projected = projection(points[i], points[left], points[right]);
        const error = Math.hypot(
          points[i].x - projected.x,
          points[i].y - projected.y,
        );
        // Tie-break straight/stationary paths by the largest remaining interval.
        const score = error + Math.min(i - left, right - i) * 1e-9;
        if (score > largest) {
          largest = score;
          split = i;
        }
      }
    }
    if (split < 0) break;
    indices.push(split);
    indices.sort((a, b) => a - b);
  }
  return indices;
}

export function tracePoints(trace: Trace): TracePoint[] {
  const cached = cache.get(trace);
  if (cached) return cached;
  if (trace.mode === "natural" || !trace.straighten) return trace.points;
  const vertices = polygonIndices(trace.points, trace.edges);
  const amount = trace.straighten / 100;
  let segment = 1;
  const result = trace.points.map((p, i) => {
    while (segment < vertices.length - 1 && i > vertices[segment]) segment++;
    const projected = projection(
      p,
      trace.points[vertices[segment - 1]],
      trace.points[vertices[segment]],
    );
    return {
      t: p.t,
      x: p.x + (projected.x - p.x) * amount,
      y: p.y + (projected.y - p.y) * amount,
    };
  });
  cache.set(trace, result);
  return result;
}

export function traceAt(points: TracePoint[], progress: number) {
  if (progress <= 0) return { x: points[0].x, y: points[0].y };
  let low = 0,
    high = points.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].t < progress) low = mid + 1;
    else high = mid;
  }
  const b = points[low],
    a = points[Math.max(0, low - 1)];
  const fraction =
    b.t === a.t ? 1 : Math.max(0, Math.min(1, (progress - a.t) / (b.t - a.t)));
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

// Editing a recorded route's start/end gently adjusts its whole shape while
// retaining the original take and its timestamps.
export function anchoredTrace(
  trace: Trace,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const key = `${start.x},${start.y},${end.x},${end.y}`;
  const cached = anchoredCache.get(trace);
  if (cached?.key === key) return cached.points;
  const first = trace.points[0],
    last = trace.points[trace.points.length - 1];
  const points = tracePoints(trace).map((p) => ({
    t: p.t,
    x: bounds(p.x + (start.x - first.x) * (1 - p.t) + (end.x - last.x) * p.t),
    y: bounds(p.y + (start.y - first.y) * (1 - p.t) + (end.y - last.y) * p.t),
  }));
  anchoredCache.set(trace, { key, points });
  return points;
}

export function finishTrace(
  samples: TracePoint[],
  endTime: number,
  duration: number,
): TracePoint[] {
  const points: TracePoint[] = [];
  for (const sample of samples) {
    const point = {
      x: Number(bounds(sample.x).toFixed(3)),
      y: Number(bounds(sample.y).toFixed(3)),
      t: Number(Math.max(0, Math.min(1, sample.t / duration)).toFixed(6)),
    };
    const previous = points[points.length - 1];
    if (!previous || point.t > previous.t) points.push(point);
    else if (point.t === previous.t && points.length > 1)
      points[points.length - 1] = point;
  }
  points[0].t = 0;
  const last = points[points.length - 1];
  const end = Number(
    Math.min(1, Math.max(last.t, endTime / duration)).toFixed(6),
  );
  if (end > last.t) points.push({ ...last, t: end });
  if (points[points.length - 1].t < 1) points.push({ ...last, t: 1 });
  return points;
}
