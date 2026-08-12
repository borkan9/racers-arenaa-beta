import type { BoardType, RaceMode } from "@/types/database.types";

export function getAllowedBoardTypes(mode: RaceMode): readonly BoardType[] {
  switch (mode) {
    case "FREE_RUN":
      return ["TOP_SPEED", "DISTANCE"];
    case "TOP_SPEED":
      return ["TOP_SPEED"];
    case "ZERO_TO_100":
    case "ZERO_TO_200":
    case "QUARTER_MILE":
      return ["BEST_TIME"];
    default:
      return [];
  }
}

export function isBoardTypeAllowed(mode: RaceMode, type: BoardType): boolean {
  return getAllowedBoardTypes(mode).includes(type);
}
