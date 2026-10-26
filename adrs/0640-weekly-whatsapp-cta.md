# ADR-0640 - Explicit weekly WhatsApp report action

Use a dedicated presentation component for weekly report notifications, with
an always-bold question, factual click counts and a primary rectangular link
styled by the existing Button. The container is not interactive, avoiding nested
links/buttons. The existing safe redirect opens the report modal.

Preserve weekly notification read semantics: viewing is not answering; only the
existing report submission marks it answered. Answered items retain the bold title
and offer Ver resposta. Other notifications and their click behavior are unchanged.

Update future push copy without generating notifications or resending old pushes.
No data model, fiscal integration or deployment configuration changes.
