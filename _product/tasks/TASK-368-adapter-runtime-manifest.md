# TASK-368 - Manifesto runtime do adapter

Bloqueio identificado ao publicar a TASK-367: manifesto runtime do Next omite config.repoRoot.

- [x] Reutilizar descoberta de raiz do Next quando repoRoot estiver ausente.
- [x] Preservar limpeza de source maps e rejeitar raiz fora do build.
- [x] Validar casos standalone, monorepo, override e manifesto invalido.
- [x] Validar check e build antes de publicar o frontend.

Sem alteracao visual, banco ou contrato. ADR-0732 documenta a compatibilidade.
