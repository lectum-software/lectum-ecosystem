export const formatE2eSummary = (cancellationValidated = false) => [
  "[video-e2e] OK: autenticação, recusas, fila, FFmpeg, Range e remoção validados.",
  cancellationValidated === true
    ? "[video-e2e] OK: cancelamento de job em andamento validado."
    : "[video-e2e] NÃO TESTADO: cancelamento (VIDEO_E2E_CANCEL_FILE não informado).",
];
