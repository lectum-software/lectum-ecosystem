import type { user } from "@/interfaces/objects";

export type DirectoryPsychologistVideoWatchPayload = {
  completed?: boolean;
  duration_seconds?: number;
  max_position_seconds?: number;
  milestone_25?: boolean;
  milestone_50?: boolean;
  milestone_75?: boolean;
  milestone_100?: boolean;
  replay_count?: number;
  session_key: string;
  watched_seconds?: number;
};

export type DirectoryPsychologistVideoWatchResponse = {
  tracked: boolean;
};

export interface IProfileVideoWatchDTO {
  p: {
    id: string;
  };
  b: DirectoryPsychologistVideoWatchPayload;
  auth?: user | null;
}
