# TASK-267 - Favorito transitorio e nascimento no cadastro

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-267 |
| Status | Done |
| Dependencias | TASK-266 |
| ADR alvo | ADR-0630 |

## Escopo aprovado

- Feed e respostas: favoritar confirma com um pequeno coracao que desaparece em fade out; favoritos existentes nao exibem acao nem indicador. Remocao pelo perfil ou pagina de favoritos.
- Modal de maioridade Google: data de nascimento e aviso de 18 anos ou mais, sem texto adicional. Mesmo CalendarController pt-BR do perfil profissional.
- Cadastro por email tambem coleta nascimento. Paciente e psicologo persistem no respectivo perfil.
- Paciente: campo editavel antes de Genero. Nao publicar nascimento no perfil publico.

## Implementacao e compatibilidade

- Reutiliza colunas birthdate existentes; nenhuma migration ou variavel nova.
- Contrato aditivo: ausencia de data aceita para clientes antigos. Novos formularios exigem data adulta; datas fornecidas sao validadas na API, inclusive edicao e onboarding do paciente.
- Google recebe data por POST e transporta state cifrado, vinculado ao navegador e com expiracao. Login existente nao sobrescreve nascimento.
- Datas civis ISO no transporte, DD/MM/AAAA no campo. Corte de maioridade pelo calendario UTC, sem conversao local que altere o dia salvo.
- Animacao apenas no sucesso da acao naquela instancia; erros preservam tentativa; reduced-motion sem escala. Slots vazios recolhidos.

## Referencias

Componentes existentes e capturas enviadas pelo usuario; inventario PROTO-INVENTORY consultado (Editar Perfil - Paciente e Editar Perfil - Psicologo). Builder indisponivel nesta sessao; nao ha redesign.

## Aceite

- [x] Testes de idade, persistencia de ambos os cadastros, edicao e privacidade.
- [x] Check e build backend/frontend.
- [x] Browser local 390/1440: modal, mascara, edicao e favorito com API real.
- [x] Alteracoes reunidas para commit local; sem push/deploy.

## Evidencias locais - 22/10/2026

- Backend check: 950 testes aprovados; build aprovado (.tmp/task267-backend-check.log e task267-backend-build.log).
- Frontend check completo e build aprovados (.tmp/task267-frontend-check-final.log e task267-frontend-build.log).
- Integracao PostgreSQL real: backend/scripts/birthdate-registration.integration.mjs confirma quatro caminhos de criacao (email/Google x paciente/psicologo), rejeicao de menores, edicao e preservacao da data ao omitir o campo.
- HTTP real da preparacao Google: POST com data valida, rejeicao de state sem nonce e redirect 302 para Google sem data em texto aberto. Autenticacao externa completa com conta Google real nao automatizada.
- Playwright/Edge 390 e 1440: modal e campo no email para ambos os papeis; data pre-preenchida em ambos os perfis; paciente salva e recarrega a data alterada. Capturas task267-modal-* e task267-profile-* em .tmp.
- Playwright/Edge com API real: favoritar, coracao transitorio, slot recolhido, recarga sem indicador; reduced-motion em desktop. Capturas task267-favorite-* em .tmp e log task267-favorite-browser.log.
- Registros temporarios criados somente no banco local e removidos ao final, incluindo notificacoes dependentes. Preview dev em localhost:3000, backend local em localhost:3001.
- Build de producao mantem bloqueio de API localhost; QA interativo usa next dev, sem enfraquecer essa protecao.

## Deploy e rollback

Backend antes do frontend: nova preparacao POST do OAuth precisa estar disponivel. Frontend antigo continua aceito. Sem mudanca de banco. Rollback de frontend preserva datas salvas; nao reverter backend enquanto o frontend novo estiver ativo. Politica de privacidade deve informar finalidade de analise etaria antes da publicacao; documento publicado nao alterado automaticamente.
