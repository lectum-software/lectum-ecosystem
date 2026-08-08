"use client";

import { PsychologistsSetupProvider, usePsychologistsSetupContext } from "./hooks/setup-context";
import { usePsychologistsDerivedView } from "./hooks/use-psychologists-derived-view";
import { usePsychologistsDirectory } from "./hooks/use-psychologists-directory";
import { usePsychologistsFavoriteActions } from "./hooks/use-psychologists-favorite-actions";
import { usePsychologistsFeedNavigation } from "./hooks/use-psychologists-feed-navigation";
import { usePsychologistsNavigation } from "./hooks/use-psychologists-navigation";
import { usePsychologistsOnboarding } from "./hooks/use-psychologists-onboarding";
import { usePsychologistsSetup } from "./hooks/use-psychologists-setup";
import { usePsychologistsVideoAnalytics } from "./hooks/use-psychologists-video-analytics";
import { usePsychologistsVideoGestures } from "./hooks/use-psychologists-video-gestures";
import { PsychologistsView } from "./view";

const PsychologistsController = () => {
  const setup = usePsychologistsSetupContext();
  const directory = usePsychologistsDirectory();
  const onboarding = usePsychologistsOnboarding({ directory });
  const analytics = usePsychologistsVideoAnalytics({ directory, onboarding });
  const navigation = usePsychologistsNavigation({ directory, onboarding });
  const feed = usePsychologistsFeedNavigation({ directory, onboarding, navigation });
  const favorite = usePsychologistsFavoriteActions({ directory });
  const gestures = usePsychologistsVideoGestures({
    analytics,
    directory,
    favorite,
    feed,
    navigation,
    onboarding,
  });
  const derived = usePsychologistsDerivedView({ directory, favorite, onboarding });

  return (
    <PsychologistsView
      model={{
        analytics,
        derived,
        directory,
        favorite,
        feed,
        gestures,
        navigation,
        onboarding,
        setup,
      }}
    />
  );
};

export const PsychologistsLogic = () => {
  const setup = usePsychologistsSetup();

  return (
    <PsychologistsSetupProvider value={setup}>
      <PsychologistsController />
    </PsychologistsSetupProvider>
  );
};
