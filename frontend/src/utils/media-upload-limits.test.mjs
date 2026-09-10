import assert from "node:assert/strict";
import test from "node:test";
import { getApiErrorCode } from "../api/errors.ts";
import {
  assertMediaUploadFinalSize,
  assertMediaUploadSourceSize,
  formatMediaUploadSize,
  getMediaUploadFinalSizeError,
  getMediaUploadSourceSizeError,
  isMediaUploadApiSizeLimitError,
  resolveMediaUploadApiSizeLimitMessage,
} from "./media-upload-limits.ts";

const MEBIBYTE = 1024 * 1024;
const fileWithSize = (size) => ({ size });

test("mantém a validação client-side de imagens", () => {
  const finalLimit = 200 * MEBIBYTE;

  assert.equal(getMediaUploadSourceSizeError(fileWithSize(finalLimit), "image", finalLimit), null);

  const imageError = getMediaUploadSourceSizeError(
    fileWithSize(finalLimit + 1),
    "image",
    finalLimit,
  );
  assert.equal(imageError?.stage, "source");
  assert.equal(imageError?.limitBytes, finalLimit);

  const finalImageError = getMediaUploadFinalSizeError(
    fileWithSize(finalLimit + 1),
    "image",
    finalLimit,
  );
  assert.equal(finalImageError?.stage, "final");
  assert.throws(
    () => assertMediaUploadFinalSize(fileWithSize(finalLimit + 1), "image", finalLimit),
    { name: "MediaUploadSizeError" },
  );
});

test("não aplica limite numérico de vídeo no frontend", () => {
  const finalLimit = 200 * MEBIBYTE;
  const oversizedVideo = fileWithSize(5 * 1024 * MEBIBYTE);

  assert.equal(getMediaUploadSourceSizeError(oversizedVideo, "video", finalLimit), null);
  assert.equal(getMediaUploadFinalSizeError(oversizedVideo, "video", finalLimit), null);
  assert.doesNotThrow(() => assertMediaUploadSourceSize(oversizedVideo, "video", finalLimit));
  assert.doesNotThrow(() => assertMediaUploadFinalSize(oversizedVideo, "video", finalLimit));
});

test("limite inválido continua falhando para imagem e não interfere em vídeo", () => {
  assert.throws(() => getMediaUploadSourceSizeError(fileWithSize(1), "image", 0), TypeError);
  assert.equal(getMediaUploadSourceSizeError(fileWithSize(1), "video", 0), null);
});

test("arredonda tamanho excedente para cima sem aparentar igualdade com o limite", () => {
  assert.equal(formatMediaUploadSize(200 * MEBIBYTE), "200 MB");
  assert.equal(formatMediaUploadSize(200 * MEBIBYTE + 1), "200,1 MB");
});

test("lê apenas códigos semânticos das formas de erro suportadas", () => {
  assert.equal(getApiErrorCode({ data: { code: "exceeded_file_limit" } }), "exceeded_file_limit");
  assert.equal(
    getApiErrorCode({ response: { data: { code: "unexpected_type_file" } } }),
    "unexpected_type_file",
  );
  assert.equal(getApiErrorCode({ data: { code: 400 } }), undefined);
  assert.equal(getApiErrorCode(new Error("limite 200 em outro contexto")), undefined);
});

test("classifica limite da API sem inferir por palavras ou números incidentais", () => {
  assert.equal(
    isMediaUploadApiSizeLimitError({
      code: "exceeded_file_limit",
      message: "arquivo excede o limite de 200MB",
      status: 400,
    }),
    true,
  );
  assert.equal(isMediaUploadApiSizeLimitError({ message: "payload recusado", status: 413 }), true);
  assert.equal(
    isMediaUploadApiSizeLimitError({
      message: "O limite de comentários é 200 por período.",
      status: 400,
    }),
    false,
  );
  assert.equal(
    isMediaUploadApiSizeLimitError({ message: "Falha de tamanho temporária.", status: 400 }),
    false,
  );
});

test("preserva o limite efetivo informado com segurança pela API", () => {
  assert.equal(
    resolveMediaUploadApiSizeLimitMessage({
      code: "exceeded_file_limit",
      message: "arquivo excede o limite de 1000MB",
      status: 413,
    }),
    "Arquivo excede o limite de 1000MB.",
  );
  assert.equal(
    resolveMediaUploadApiSizeLimitMessage({ message: "", status: 413 }),
    "O arquivo excede o limite configurado para este envio.",
  );
  assert.equal(
    resolveMediaUploadApiSizeLimitMessage({
      message: "Content Too Large",
      status: 413,
    }),
    "O arquivo excede o limite configurado para este envio.",
  );
  assert.equal(
    resolveMediaUploadApiSizeLimitMessage({ message: "Falha temporária.", status: 400 }),
    null,
  );
});
