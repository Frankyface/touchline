import type { Play, Team } from "./model";

export type Starter = { id: string; title: string; detail: string; play: Play };
const formation = (
  id: string,
  title: string,
  category: string,
  points: [Team, string, number, number][],
  description: string,
): Starter => ({
  id,
  title,
  detail: description,
  play: {
    id,
    title,
    category,
    description,
    cues: "",
    setup: "",
    equipment: "Balls · cones",
    easier: "",
    challenge: "",
    ballId: points.find((p) => p[0] === "attack") ? "p0" : "",
    updatedAt: "2026-09-15T00:00:00.000Z",
    movements: [],
    players: points.map(([team, label, x, y], i) => ({
      id: `p${i}`,
      team,
      label,
      x,
      y,
    })),
  },
});
export const starters: Starter[] = [
  formation(
    "blank",
    "Blank pitch",
    "Attack",
    [],
    "Start with your own arrangement.",
  ),
  formation(
    "overload",
    "3 v 2",
    "Attack",
    [
      ["attack", "10", 26, 69],
      ["attack", "12", 50, 77],
      ["attack", "14", 77, 85],
      ["defence", "1", 37, 40],
      ["defence", "2", 66, 43],
    ],
    "Explore width, depth and the extra player.",
  ),
  formation(
    "backline",
    "Backline",
    "Attack",
    [
      ["attack", "9", 14, 60],
      ["attack", "10", 32, 68],
      ["attack", "12", 48, 75],
      ["attack", "13", 63, 80],
      ["attack", "14", 82, 86],
      ["defence", "1", 31, 40],
      ["defence", "2", 49, 42],
      ["defence", "3", 68, 44],
    ],
    "A passing shape ready for your pattern.",
  ),
  formation(
    "defence",
    "Connected defence",
    "Defence",
    [
      ["attack", "10", 30, 78],
      ["attack", "12", 52, 83],
      ["attack", "14", 75, 87],
      ["defence", "1", 24, 43],
      ["defence", "2", 42, 43],
      ["defence", "3", 60, 43],
      ["defence", "4", 78, 43],
    ],
    "Explore spacing and movement as a line.",
  ),
  formation(
    "channel",
    "Practice channel",
    "Skills",
    [
      ["attack", "1", 37, 77],
      ["attack", "2", 63, 85],
      ["defence", "1", 50, 40],
      ["cone", "C", 22, 22],
      ["cone", "C", 78, 22],
      ["cone", "C", 22, 92],
      ["cone", "C", 78, 92],
    ],
    "A simple area for passing and support.",
  ),
];
starters[1].play.cues =
  "Look before receiving.\nStay connected in support.\nCompare carrying with passing.";
starters[1].play.setup =
  "Three attackers and two shadow defenders. Choose a space and pace that suit your group.";
starters[1].play.easier =
  "Agree the defenders’ movement in advance and walk through the options.";
starters[1].play.challenge =
  "Let shadow defenders choose their channel. Ask attackers to explain the space they saw.";
export function createFromStarter(starter: Starter, title?: string): Play {
  return {
    ...structuredClone(starter.play),
    id: crypto.randomUUID(),
    title: title?.trim() || starter.title,
    updatedAt: new Date().toISOString(),
  };
}
