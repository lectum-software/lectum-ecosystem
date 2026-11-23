# ADR-0712 - Publicacao dos ajustes de reels e perfil sobre a base atual

Status: aceito para preparacao.

O checkout original possui uma base anterior aos releases de marketing.
Aplicar somente os deltas de reels, SEO, perfil, comunidades, checkout e aceite
por merge de tres vias no checkout de release atualizado. Preservar original.

Publicar backend primeiro: novos endpoints de video sao aditivos e o aceite
continua aceitando ambos os documentos. Frontend depende dos endpoints e do
aceite parcial, portanto aguarda confirmacao da versao do backend.

Nao ha nova migration ou variavel obrigatoria. Nao enviar eventos Meta nem
cobrar pagamentos para verificar o rollout. As previsualizacoes de componentes
nao substituem o smoke integrado dos fluxos de autenticacao e midia.
