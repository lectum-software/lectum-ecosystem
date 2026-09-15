# ADR-0069 - Topo TikTok com Minha Busca na tela de Psicologos

Status: Accepted

## Contexto

A tela `/app/psychologists` evoluiu para um feed imersivo de videos. A barra de busca fixa e o botao de filtro isolado competiam visualmente com o conteudo e destoavam da experiencia tipo TikTok solicitada para descoberta de profissionais.

## Decisao

- Substituir a busca fixa por um seletor sobreposto ao video com os modos `Explorar` e `Minha Busca`, ambos em branco sobre gradiente escuro/transparente.
- Manter `Explorar` como feed padrao, sem parametros de filtro.
- Tratar `Minha Busca` como representacao dos filtros persistidos na URL existente de psicologos.
- Ao tocar em `Minha Busca` sem filtros ativos, abrir diretamente o painel de filtros.
- Ao tocar em `Minha Busca` com filtros ativos, manter o feed filtrado e abrir o painel para edicao.
- Renderizar chips horizontais somente quando houver filtros ativos; cada chip remove seu filtro individualmente e `+ Filtros` reabre o painel.
- Ocultar os controles antigos de busca/filtro da tela, preservando a action rail de desktop e o restante da experiencia de video.

## Consequencias

- O feed fica mais imersivo e alinhado ao padrao visual de videos verticais.
- A busca textual livre deixa de ser o principal ponto de entrada da tela; filtros estruturados passam a conduzir a `Minha Busca`.
- Os filtros continuam compatíveis com deep links e parametros de URL ja existentes.
- Remover todos os filtros volta automaticamente para o modo `Explorar`.

## Validacoes

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `Invoke-WebRequest http://localhost:3000/app/psychologists` retornou `200` no servidor local ja ativo.
