import type { PsychologistsDerivedView } from "../hooks/use-psychologists-derived-view";
import type { PsychologistsDirectory } from "../hooks/use-psychologists-directory";
import type { PsychologistsFavoriteActions } from "../hooks/use-psychologists-favorite-actions";
import type { PsychologistsFeedNavigation } from "../hooks/use-psychologists-feed-navigation";
import type { PsychologistsNavigation } from "../hooks/use-psychologists-navigation";
import type { PsychologistsOnboarding } from "../hooks/use-psychologists-onboarding";
import type { PsychologistsSetup } from "../hooks/use-psychologists-setup";
import type { PsychologistsVideoAnalytics } from "../hooks/use-psychologists-video-analytics";
import type { PsychologistsVideoGestures } from "../hooks/use-psychologists-video-gestures";

export type PsychologistsViewModel = {
  analytics: PsychologistsVideoAnalytics;
  derived: PsychologistsDerivedView;
  directory: PsychologistsDirectory;
  favorite: PsychologistsFavoriteActions;
  feed: PsychologistsFeedNavigation;
  gestures: PsychologistsVideoGestures;
  navigation: PsychologistsNavigation;
  onboarding: PsychologistsOnboarding;
  setup: PsychologistsSetup;
};
