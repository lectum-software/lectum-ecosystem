# ADR 0681: Context-specific discovery and card refresh

Date: 2026-11-07

Directory search now matches only the professional user name. CRP remains available in profile
data and administrative search; no database or response contract changes are required.

The existing pull gesture is enabled only for the canonical card route and its legacy alias.
It reloads the document to restart the card form, instead of only refreshing server components.
Input gestures and modal surfaces remain protected. Payment-method submission blocks the
gesture, including a submission that starts between touch start and touch end. Reloading
otherwise discards unfinished card input as requested.

Community recommendations use the existing current-community context to retain followed
destinations. The current community and duplicates remain excluded. Feed selection is
unchanged. This preserves a navigation exit without adding a separate carousel implementation.

Frontend and backend changes are backward compatible; deployment remains separately approved.
