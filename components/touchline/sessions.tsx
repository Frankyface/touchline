"use client";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock3,
  Copy,
  Play as PlayIcon,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uid,
  type Play,
  type Session,
  type Block,
  blockFromPlay,
  blockOffsets,
  equipmentList,
} from "@/lib/touchline/model";
import { Pitch } from "./pitch";

export function Sessions({
  sessions,
  plays,
  onChange,
  onNew,
  onDelete,
  onDuplicate,
  onPrint,
  disabled,
  selected,
  onSelect,
  onRun,
  activeRun,
  onRemoveBlock,
}: {
  sessions: Session[];
  plays: Play[];
  onChange: (s: Session) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (s: Session) => void;
  onPrint: (s: Session) => void;
  disabled: boolean;
  selected: string;
  onSelect: (id: string) => void;
  onRun: (s: Session) => void;
  activeRun?: string;
  onRemoveBlock: (sessionId: string, blockId: string) => void;
}) {
  const session = sessions.find((s) => s.id === selected) ?? sessions[0];
  if (!session)
    return (
      <div className="empty-state">
        <CalendarDays size={32} />
        <h2>Make a little time for a better game.</h2>
        <p>Give your plays a place in the next session.</p>
        <Button onClick={onNew} disabled={disabled}>
          <Plus />
          Create a session
        </Button>
      </div>
    );
  const total = session.blocks.reduce((sum, b) => sum + b.minutes, 0);
  const difference = session.targetMinutes - total;
  const offsets = blockOffsets(session);
  const equipment = equipmentList(session);
  const update = (patch: Partial<Session>) =>
    onChange({ ...session, ...patch });
  const blockUpdate = (id: string, patch: Partial<Block>) =>
    update({
      blocks: session.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  const addBlock = (play?: Play) => {
    if (session.blocks.length >= 50) return;
    update({
      blocks: [
        ...session.blocks,
        play
          ? blockFromPlay(play)
          : {
              id: uid(),
              title: "New practice block",
              minutes: 10,
              notes: "",
              equipment: "Balls · cones",
            },
      ],
    });
  };
  const move = (index: number, delta: number) => {
    const blocks = [...session.blocks];
    [blocks[index], blocks[index + delta]] = [
      blocks[index + delta],
      blocks[index],
    ];
    update({ blocks });
  };
  return (
    <div className="sessions-layout">
      <aside className="session-list">
        <div className="panel-heading">
          <span>YOUR SESSIONS</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNew}
            disabled={disabled || sessions.length >= 50}
            aria-label="New session"
          >
            <Plus />
          </Button>
        </div>
        {sessions.map((s) => (
          <button
            key={s.id}
            className={
              "play-list-item " + (s.id === session.id ? "active" : "")
            }
            onClick={() => onSelect(s.id)}
          >
            <CalendarDays size={17} />
            <span>
              <strong>{s.title}</strong>
              <small>
                {s.blocks.reduce((v, b) => v + b.minutes, 0)} min ·{" "}
                {s.blocks.length} blocks{s.completedAt ? " · Delivered" : ""}
              </small>
            </span>
          </button>
        ))}
        <div className="notebook-tip">
          <Clock3 size={20} />
          <p>A plan with room to play.</p>
          <small>Build the session around the ideas you want to explore.</small>
        </div>
      </aside>
      <section className="session-main">
        <div className="session-heading">
          <div>
            <p className="eyebrow">THE NEXT SESSION</p>
            <h2>{session.title}</h2>
          </div>
          <div className="icon-actions">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Plan next session from this plan"
              disabled={disabled}
              onClick={() => onDuplicate(session)}
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Print session plan"
              onClick={() => onPrint(session)}
            >
              <Printer />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete session"
              disabled={disabled}
              onClick={() => onDelete(session.id)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <fieldset disabled={disabled} className="session-meta">
          <label className="session-name">
            Session name
            <Input
              aria-label="Session name"
              value={session.title}
              maxLength={100}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label>
            Date
            <Input
              aria-label="Session date"
              type="date"
              value={session.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </label>
          <label>
            Players
            <Input
              aria-label="Number of players"
              type="number"
              min={1}
              max={60}
              value={session.players}
              onChange={(e) =>
                update({
                  players: Math.max(1, Math.min(60, Number(e.target.value))),
                })
              }
            />
          </label>
          <label>
            Time available
            <Input
              aria-label="Target minutes"
              type="number"
              min={5}
              max={300}
              value={session.targetMinutes}
              onChange={(e) =>
                update({
                  targetMinutes: Math.max(
                    5,
                    Math.min(300, Number(e.target.value)),
                  ),
                })
              }
            />
          </label>
        </fieldset>
        {session.carriedForward && (
          <div className="carry-note">
            <strong>From last time</strong>
            <p>{session.carriedForward}</p>
          </div>
        )}
        <fieldset disabled={disabled} className="session-purpose two-fields">
          <label>
            Session focus
            <Input
              value={session.focus ?? ""}
              maxLength={500}
              placeholder="What do you want players to explore?"
              onChange={(e) => update({ focus: e.target.value })}
            />
          </label>
          <label>
            Look for
            <Input
              value={session.success ?? ""}
              maxLength={500}
              placeholder="What would you see or hear if it’s working?"
              onChange={(e) => update({ success: e.target.value })}
            />
          </label>
        </fieldset>
        <div className="session-budget">
          <div>
            <strong>{total}</strong>
            <span> / {session.targetMinutes} min</span>
          </div>
          <span className={difference < 0 ? "over-budget" : ""}>
            {difference === 0
              ? "A perfect fit"
              : difference > 0
                ? difference + " minutes to play with"
                : Math.abs(difference) + " minutes over"}
          </span>
          <Button
            onClick={() => onRun(session)}
            disabled={!session.blocks.length || disabled}
          >
            <PlayIcon />
            {activeRun === session.id
              ? "Continue coaching"
              : "Coach this session"}
          </Button>
        </div>
        <div
          className="session-progress"
          aria-label={total + " minutes planned"}
        >
          {session.blocks.map((b, i) => (
            <div
              key={b.id}
              title={b.title + ": " + b.minutes + " min"}
              style={{
                flex: b.minutes,
                background: [
                  "#285747",
                  "#739173",
                  "#b1c39b",
                  "#b7a078",
                  "#56736b",
                ][i % 5],
              }}
            />
          ))}
        </div>
        <div className="session-blocks">
          {session.blocks.map((b, i) => {
            const linked = plays.find((p) => p.id === b.playId);
            return (
              <article className="session-block" key={b.id}>
                <div className="block-main">
                  <span className="block-index">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <small>
                      {String(Math.floor(offsets[i] / 60)).padStart(2, "0")}:
                      {String(offsets[i] % 60).padStart(2, "0")}
                    </small>
                  </span>
                  <div className="block-info">
                    <Input
                      aria-label={"Block " + (i + 1) + " name"}
                      value={b.title}
                      maxLength={100}
                      onChange={(e) =>
                        blockUpdate(b.id, { title: e.target.value })
                      }
                      disabled={disabled}
                    />
                    <span>
                      {linked
                        ? "From your playbook · " + linked.category
                        : "Practice block"}
                    </span>
                  </div>
                  <label className="block-minutes">
                    <Input
                      aria-label={"Block " + (i + 1) + " minutes"}
                      type="number"
                      min={1}
                      max={180}
                      value={b.minutes}
                      onChange={(e) =>
                        blockUpdate(b.id, {
                          minutes: Math.max(
                            1,
                            Math.min(180, Number(e.target.value)),
                          ),
                        })
                      }
                      disabled={disabled}
                    />
                    <span>min</span>
                  </label>
                  <div className="block-actions">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Move block " + (i + 1) + " up"}
                      disabled={i === 0 || disabled}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Move block " + (i + 1) + " down"}
                      disabled={i === session.blocks.length - 1 || disabled}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Remove block " + (i + 1)}
                      disabled={disabled}
                      onClick={() => onRemoveBlock(session.id, b.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <details>
                  <summary>Notes & setup</summary>
                  <div className="block-details">
                    {linked && (
                      <div className="block-diagram">
                        <Pitch play={linked} mini />
                      </div>
                    )}
                    <fieldset disabled={disabled}>
                      <label className="field-label">Linked diagram</label>
                      <Select
                        value={b.playId ?? "none"}
                        onValueChange={(id) =>
                          blockUpdate(b.id, {
                            playId: id === "none" ? undefined : id,
                          })
                        }
                      >
                        <SelectTrigger aria-label={`Block ${i + 1} diagram`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No diagram</SelectItem>
                          {plays.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="form-note">
                        Diagram changes follow the playbook. These coaching
                        notes stay with this session.
                      </p>
                      <label className="field-label">
                        Setup
                        <Textarea
                          aria-label={`Block ${i + 1} setup`}
                          value={b.setup ?? ""}
                          maxLength={1000}
                          rows={2}
                          onChange={(e) =>
                            blockUpdate(b.id, { setup: e.target.value })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Coaching notes
                        <Textarea
                          aria-label={"Block " + (i + 1) + " notes"}
                          value={b.notes}
                          maxLength={3000}
                          rows={3}
                          onChange={(e) =>
                            blockUpdate(b.id, { notes: e.target.value })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Equipment
                        <Input
                          aria-label={"Block " + (i + 1) + " equipment"}
                          value={b.equipment}
                          maxLength={500}
                          onChange={(e) =>
                            blockUpdate(b.id, { equipment: e.target.value })
                          }
                        />
                      </label>
                      <div className="two-fields">
                        <label className="field-label">
                          Make easier
                          <Textarea
                            aria-label={`Block ${i + 1} make easier`}
                            value={b.easier ?? ""}
                            maxLength={1000}
                            rows={2}
                            onChange={(e) =>
                              blockUpdate(b.id, { easier: e.target.value })
                            }
                          />
                        </label>
                        <label className="field-label">
                          Add challenge
                          <Textarea
                            aria-label={`Block ${i + 1} add challenge`}
                            value={b.challenge ?? ""}
                            maxLength={1000}
                            rows={2}
                            onChange={(e) =>
                              blockUpdate(b.id, { challenge: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </fieldset>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
        {sessions.some((s) => s.id !== session.id && s.blocks.length) && (
          <Select
            value=""
            disabled={disabled || session.blocks.length >= 50}
            onValueChange={(value) => {
              const source = sessions
                .flatMap((s) =>
                  s.blocks.map((b) => ({ key: s.id + ":" + b.id, block: b })),
                )
                .find((item) => item.key === value)?.block;
              if (source)
                update({
                  blocks: [
                    ...session.blocks,
                    { ...structuredClone(source), id: uid() },
                  ],
                });
            }}
          >
            <SelectTrigger
              className="reuse-block"
              aria-label="Reuse a block from a previous session"
            >
              <SelectValue placeholder="Reuse a block from a previous session" />
            </SelectTrigger>
            <SelectContent>
              {sessions
                .filter((s) => s.id !== session.id)
                .flatMap((s) =>
                  s.blocks.map((b) => (
                    <SelectItem
                      key={s.id + ":" + b.id}
                      value={s.id + ":" + b.id}
                    >
                      {s.title} · {b.title}
                    </SelectItem>
                  )),
                )}
            </SelectContent>
          </Select>
        )}
        {equipment.length > 0 && (
          <section className="equipment-summary">
            <h3>Bring to the pitch</h3>
            <ul>
              {equipment.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="form-note">
              From your block notes; quantities are not added together.
            </p>
          </section>
        )}
        <details
          className="session-reflection"
          open={session.completedAt ? true : undefined}
        >
          <summary>
            {session.completedAt
              ? "Delivered · reflection"
              : "After the session"}
          </summary>
          <div className="two-fields">
            <label>
              What worked?
              <Textarea
                value={session.review?.worked ?? ""}
                maxLength={2000}
                rows={3}
                disabled={disabled}
                onChange={(e) =>
                  update({
                    review: {
                      worked: e.target.value,
                      nextTime: session.review?.nextTime ?? "",
                    },
                  })
                }
              />
            </label>
            <label>
              Change or revisit next time
              <Textarea
                value={session.review?.nextTime ?? ""}
                maxLength={2000}
                rows={3}
                disabled={disabled}
                onChange={(e) =>
                  update({
                    review: {
                      worked: session.review?.worked ?? "",
                      nextTime: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="reflection-actions">
            <Button
              variant="outline"
              disabled={disabled || sessions.length >= 50}
              onClick={() => onDuplicate(session)}
            >
              <Copy />
              Plan next session
            </Button>
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() =>
                update({
                  completedAt: session.completedAt
                    ? undefined
                    : new Date().toISOString(),
                })
              }
            >
              {session.completedAt ? "Mark as planned" : "Mark as delivered"}
            </Button>
          </div>
        </details>
        <div className="add-block">
          <Button
            variant="outline"
            onClick={() => addBlock()}
            disabled={disabled || session.blocks.length >= 50}
          >
            <Plus />
            Practice block
          </Button>
          <Select
            value=""
            onValueChange={(id) => addBlock(plays.find((p) => p.id === id))}
            disabled={disabled || !plays.length || session.blocks.length >= 50}
          >
            <SelectTrigger aria-label="Add a play to this session">
              <SelectValue placeholder="Add from playbook" />
            </SelectTrigger>
            <SelectContent>
              {plays.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="session-footnote">
          Adapt the space and pace to your group. Example blocks use
          non-contact, shadow defence.
        </p>
      </section>
    </div>
  );
}
