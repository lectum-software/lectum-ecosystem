# Discovery and card refresh adjustments

## Scope

- Name-only search in the psychologists directory, without CRP, headline or bio matches.
- Pull-to-refresh on the card insertion page, preserving other billing route restrictions.
- Community exit carousel includes followed communities inside a community, never itself.
- Feed recommendations continue to exclude already followed communities.

## Acceptance

- [x] Implement name-only directory search and update field copy.
- [x] Allow full card-page reload by pulling from the top; block while saving the payment method.
- [x] Retain followed destinations inside community recommendations.
- [x] Complete local automated and browser validation.

Validation: 23 focused regressions passed; root check and frontend production build passed.
Real local mobile browser confirmed the card document reload, name-only filter and community
exit carousel. The all-followed case is covered by the selection regression. Physical iPhone
validation remains pending. No payment was submitted during validation.

No production deployment in this batch. Existing layout is retained; Builder is not available
in this session. See ADR 0681.
