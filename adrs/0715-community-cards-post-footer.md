# ADR-0715 - Cards compactos e rodape do post

A cor aprovada da contagem e centralizada no token lectum-community-count, com variante escura baseada no muted existente, sem cor literal no componente.

Remover o indice PublicReelLinks em vez de oculta-lo: os videos continuam no post e no viewer, e PublicTranscript mantem os dados de transcricao. Nao alterar endpoints nem indexacao das rotas de reels. A remocao deixa de oferecer esses links adicionais no final do HTML.

Cards usam area fixa de duas linhas para centralizar titulos curtos e alinhar contagens e botoes. Nomes longos continuam acessiveis pelo aria-label do link. No post, retirar padding duplicado de 24px e substituir reserva de 144px por 104px mais safe area, preservando o campo fixo mobile.
