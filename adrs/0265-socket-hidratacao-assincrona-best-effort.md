# ADR-0265: Hidratação assíncrona de socket como best-effort

## Status

Accepted

## Task relacionada

Correção operacional solicitada em 2026-07-13 após falha de conexão do Admin ao backend local.

## Contexto

O backend caiu durante o uso local do Admin porque uma conexão Socket.IO do app principal disparou a rotina assíncrona de hidratação (`emitAsync`). Quando a consulta de background ao banco falhava, a Promise rejeitada não era tratada e o processo Node encerrava. Como consequência, o Admin em `localhost:3002` exibia "Não foi possível conectar ao backend".

A hidratação por socket é um efeito colateral para sincronizar sessões em tempo real; ela não deve derrubar a API HTTP nem o login administrativo.

## Decisão

Tratar erros das rotinas assíncronas de hidratação de socket como **best-effort**:

- `emitAsync` captura falhas de listagem/hidratação e registra aviso seguro em log;
- `emit_hidrate` captura falhas ao registrar/limpar eventos de background;
- a API HTTP continua no ar quando um efeito colateral de socket falha;
- nenhum payload sensível é incluído nos logs.

## Consequências

- Evita que uma falha transitória de banco em rotina de socket derrube o backend inteiro.
- Mantém o Admin e endpoints HTTP disponíveis para retornar erros reais da API quando aplicável.
- Eventos de hidratação podem ser perdidos em falhas transitórias; isso é aceitável porque a próxima hidratação/autenticação real recompõe o estado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `GET http://localhost:3001/health` retornou `200`.
- Preflight CORS de `http://localhost:3002` para `POST /api/admin/public/auth/login` retornou `204` com `Access-Control-Allow-Origin: http://localhost:3002`.
- Consulta Prisma somente leitura confirmou conectividade com o banco e administradores reais existentes.

## Pendências

- Se houver aumento de volume de eventos de hidratação, avaliar fila persistente/retry dedicado em task própria.
