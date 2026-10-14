# ADR-0621 - Contexto de origem dos comentarios salvos

- Status: Accepted
- Data: 2026-10-13
- Task: TASK-259

## Contexto

Salvos mistura pergunta original e comentario profissional, enquanto comentarios
de pacientes nao mostram a origem. O WhatsApp textual fica separado dos controles
e o menu nao destaca visualmente o estado salvo.

## Decisao

Compartilhar o componente OriginLink entre Minhas publicacoes e Salvos, preservando
o destino existente: comentario pai com foco, ou post raiz. Remover apenas as previas
de pergunta do card salvo, sem alterar videos gerados para compartilhamento social.
Usar beforeSaveSlot da barra existente para posicionar WhatsApp textual depois de
comentarios. Manter CTA anexado a midias e restringir contato a psicologos. Manter
controles em linha unica. Reusar tokens primary/primary-soft no estado salvo do menu,
com aria-checked, icone preenchido e bloqueio durante requisicao.

## Consequencias

Posts comuns salvos e perfil profissional nao mudam. Nao ha API, banco, dependencia
ou variavel nova. Testes SSR reais verificam hierarquia, links, papeis, midias e estado
do menu; QA autenticada em dispositivo continua necessaria antes da promocao.
