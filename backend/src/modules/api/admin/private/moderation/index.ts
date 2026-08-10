import { Router } from "express";
import {
  communitySuggestionArchive,
  communitySuggestionBlockCreate,
  communitySuggestionBlockUpdate,
  communitySuggestionMove,
  communitySuggestions,
  detail,
  events,
  operationalAlerts,
  reportResolve,
  resolve,
  review,
  summary,
} from "./use-cases/controller";
import {
  communitySuggestionArchiveValidator,
  communitySuggestionBlockCreateValidator,
  communitySuggestionBlockUpdateValidator,
  communitySuggestionMoveValidator,
  communitySuggestionsValidator,
  eventsValidator,
  eventValidator,
  operationalAlertsValidator,
  reportResolveValidator,
  resolveValidator,
} from "./validator";

const routes = Router();

routes.get("/summary", summary);
routes.get("/operational-alerts", operationalAlertsValidator, operationalAlerts);
routes.post("/reports/:reportId/resolve", reportResolveValidator, reportResolve);
routes.get("/community-suggestions", communitySuggestionsValidator, communitySuggestions);
routes.post(
  "/community-suggestion-blocks",
  communitySuggestionBlockCreateValidator,
  communitySuggestionBlockCreate,
);
routes.put(
  "/community-suggestion-blocks/:blockId",
  communitySuggestionBlockUpdateValidator,
  communitySuggestionBlockUpdate,
);
routes.post(
  "/community-suggestions/:suggestionId/move",
  communitySuggestionMoveValidator,
  communitySuggestionMove,
);
routes.post(
  "/community-suggestions/:suggestionId/archive",
  communitySuggestionArchiveValidator,
  communitySuggestionArchive,
);
routes.get("/events", eventsValidator, events);
routes.get("/events/:id", eventValidator, detail);
routes.post("/events/:id/review", eventValidator, review);
routes.post("/events/:id/resolve", resolveValidator, resolve);

export default routes;
