"use client";
import { useId } from "react";
import { ballAt, positionAt, type Play } from "@/lib/touchline/model";
export function Pitch({
  play,
  time = 0,
  mini = false,
  selected,
  onPlayer,
  onCanvas,
  onDrag,
  onNudge,
  onMovement,
  focusPlayer,
}: {
  play: Play;
  time?: number;
  mini?: boolean;
  selected?: string;
  onPlayer?: (id: string) => void;
  onCanvas?: (x: number, y: number) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onNudge?: (id: string, x: number, y: number) => void;
  onMovement?: (id: string) => void;
  focusPlayer?: string;
}) {
  const id = useId().replaceAll(":", "");
  const ball = ballAt(play, time);
  return (
    <svg
      className={`pitch ${mini ? "mini-pitch" : ""}`}
      viewBox="0 0 700 620"
      role={mini ? "img" : "group"}
      aria-label={`${play.title} rugby diagram`}
      onClick={(e) => {
        if (!onCanvas) return;
        const p = e.currentTarget.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        const c = p.matrixTransform(e.currentTarget.getScreenCTM()!.inverse());
        onCanvas(c.x / 7, c.y / 6.2);
      }}
    >
      <defs>
        {["run", "pass"].map((kind) => (
          <marker
            key={kind}
            id={`${id}-${kind}`}
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path
              d="M0 0 L6 3 L0 6"
              fill="none"
              stroke={kind === "run" ? "#e9f3d6" : "#f3c76e"}
              strokeWidth="1.5"
            />
          </marker>
        ))}
      </defs>
      <rect width="700" height="620" rx="6" fill="#285747" />
      {[0, 2, 4, 6].map((n) => (
        <rect
          key={n}
          x="20"
          y={20 + n * 83}
          width="660"
          height="83"
          fill="#ffffff"
          opacity=".026"
        />
      ))}
      <g fill="none" stroke="#d4e2d7" strokeOpacity=".46" strokeWidth="1.6">
        <rect x="25" y="25" width="650" height="570" />
        <path d="M25 85H675 M25 291H675 M25 585H675" />
        <path
          d="M72 25V595 M628 25V595 M165 25V595 M535 25V595 M25 133H675 M25 527H675"
          strokeDasharray="12 18"
          strokeOpacity=".22"
        />
        <path d="M320 74V93 M380 74V93 M320 85H380" strokeWidth="3" />
      </g>
      {!mini && (
        <g fontSize="12" fill="#d0e2d7" opacity=".68" fontFamily="Arial">
          <text x="40" y="280">
            22
          </text>
          <text x="641" y="280">
            22
          </text>
          <text x="314" y="47" letterSpacing="3">
            TRY LINE
          </text>
          <text x="302" y="568" letterSpacing="3">
            ATTACK ↑
          </text>
        </g>
      )}
      {play.movements.map((m) => {
        const p = positionAt(play, m.playerId, m.start);
        const to =
          m.kind === "pass" && m.targetId
            ? positionAt(play, m.targetId, m.start + m.duration)
            : { x: m.x, y: m.y };
        return (
          <g
            key={m.id}
            className="pitch-movement"
            opacity={focusPlayer && m.playerId !== focusPlayer ? 0.15 : 1}
          >
            {onMovement && (
              <path
                d={`M${p.x * 7} ${p.y * 6.2} L${to.x * 7} ${to.y * 6.2}`}
                fill="none"
                stroke="transparent"
                strokeWidth={18}
                role="button"
                tabIndex={0}
                aria-label={`Edit ${m.kind} by ${play.players.find((p) => p.id === m.playerId)?.label} at ${m.start.toFixed(1)} seconds`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMovement(m.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onMovement(m.id);
                  }
                }}
              />
            )}
            <path
              key={m.id}
              d={`M${p.x * 7} ${p.y * 6.2} L${to.x * 7} ${to.y * 6.2}`}
              fill="none"
              stroke={m.kind === "pass" ? "#f3c76e" : "#e9f3d6"}
              strokeWidth={mini ? 3 : 2.6}
              strokeDasharray={m.kind === "pass" ? "6 7" : undefined}
              opacity={time > m.start + m.duration ? 0.3 : 0.85}
              markerEnd={`url(#${id}-${m.kind})`}
              pointerEvents="none"
            />
          </g>
        );
      })}
      {play.players.map((p) => {
        const pos = positionAt(play, p.id, time);
        return (
          <g
            key={p.id}
            data-player={p.id}
            opacity={focusPlayer && p.id !== focusPlayer ? 0.3 : 1}
            transform={`translate(${pos.x * 7},${pos.y * 6.2})`}
            role={onPlayer ? "button" : undefined}
            tabIndex={onPlayer ? 0 : undefined}
            aria-label={`${p.team} ${p.label}`}
            className={onPlayer ? "pitch-player interactive" : "pitch-player"}
            onClick={(e) => {
              e.stopPropagation();
              onPlayer?.(p.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPlayer?.(p.id);
              }
              if (
                onNudge &&
                ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                onNudge(
                  p.id,
                  p.x +
                    (e.key === "ArrowRight"
                      ? 1
                      : e.key === "ArrowLeft"
                        ? -1
                        : 0),
                  p.y +
                    (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0),
                );
              }
            }}
            onPointerDown={(e) => {
              if (!onDrag) return;
              e.preventDefault();
              e.stopPropagation();
              const svg = e.currentTarget.ownerSVGElement!;
              const el = e.currentTarget;
              el.setPointerCapture(e.pointerId);
              const origin = { x: e.clientX, y: e.clientY };
              let moved = false;
              const move = (ev: PointerEvent) => {
                if (
                  Math.abs(ev.clientX - origin.x) +
                    Math.abs(ev.clientY - origin.y) <
                    4 &&
                  !moved
                )
                  return;
                moved = true;
                const point = svg.createSVGPoint();
                point.x = ev.clientX;
                point.y = ev.clientY;
                const c = point.matrixTransform(svg.getScreenCTM()!.inverse());
                onDrag(p.id, c.x / 7, c.y / 6.2);
              };
              const up = () => {
                el.removeEventListener("pointermove", move);
                el.removeEventListener("pointerup", up);
                el.removeEventListener("pointercancel", up);
              };
              el.addEventListener("pointermove", move);
              el.addEventListener("pointerup", up);
              el.addEventListener("pointercancel", up);
            }}
          >
            {selected === p.id && (
              <circle r="25" fill="none" stroke="#f4d083" strokeWidth="2" />
            )}
            {p.team === "cone" ? (
              <path
                d="M0 -13 L12 11 H-12 Z"
                fill="#f1ba69"
                stroke="#fff0cb"
                strokeWidth="2"
              />
            ) : (
              <>
                <circle
                  r="19"
                  fill={p.team === "attack" ? "#f6f8ef" : "#285747"}
                  stroke={p.team === "attack" ? "#ffffff" : "#a9c6b4"}
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={p.team === "attack" ? "#254f40" : "#e4eee6"}
                  fontSize="15"
                  fontWeight="650"
                  fontFamily="Arial"
                >
                  {p.label}
                </text>
              </>
            )}
          </g>
        );
      })}
      {play.players.some((p) => p.id === play.ballId) && (
        <g
          transform={`translate(${ball.x * 7 + 19},${ball.y * 6.2 - 17})`}
          pointerEvents="none"
        >
          <ellipse
            rx="8"
            ry="5"
            transform="rotate(-35)"
            fill="#efc36d"
            stroke="#594221"
            strokeWidth="1.5"
          />
        </g>
      )}
    </svg>
  );
}
