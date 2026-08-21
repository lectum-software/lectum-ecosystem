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
  resolveMediaUploadSourceLimitBytes,
  resolveVideoUploadSourceLimitBytes,
  VIDEO_UPLOAD_SOURCE_ABSOLUTE_LIMIT_BYTES,
} from "./media-upload-limits.ts";

const MEBIBYTE = 1024 * 1024;
const fileWithSize = (size) => ({ size });

test("mantém imagens no limite final e expande apenas a entrada de vídeo", () => {
  const finalLimit = 200 * MEBIBYTE;

  assert.equal(resolveMediaUploadSourceLimitBytes("image", finalLimit), finalLimit);
  assert.equal(resolveMediaUploadSourceLimitBytes("video", finalLimit), 400 * MEBIBYTE);
  assert.equal(getMediaUploadSourceSizeError(fileWithSize(finalLimit), "image", finalLimit), null);

  const imageError = getMediaUploadSourceSizeError(
    fileWithSize(finalLimit + 1),
    "image",
    finalLimit,
  );
  assert.equal(imageError?.stage, "source");
  assert.equal(imageError?.limitBytes, finalLimit);
});

test("aceita vídeo convertido acima do limite final até o teto defensivo", () => {
  const finalLimit = 200 * MEBIBYTE;
  const sourceLimit = 400 * MEBIBYTE;

  assert.doesNotThrow(() =>
    assertMediaUploadSourceSize(fileWithSize(finalLimit + 1), "video", finalLimit),
  );
  assert.doesNotThrow(() =>
    assertMediaUploadSourceSize(fileWithSize(sourceLimit), "video", finalLimit),
  );

  const sourceError = getMediaUploadSourceSizeError(
    fileWithSize(sourceLimit + 1),
    "video",
    finalLimit,
  );
  assert.equal(sourceError?.stage, "source");
  assert.equal(sourceError?.actualBytes, sourceLimit + 1);
  assert.equal(sourceError?.limitBytes, sourceLimit);
});

test("limita a folga de apresentação a 500 MB sem ficar abaixo do limite final", () => {
  assert.equal(resolveVideoUploadSourceLimitBytes(300 * MEBIBYTE), 500 * MEBIBYTE);
  assert.equal(resolveVideoUploadSourceLimitBytes(600 * MEBIBYTE), 600 * MEBIBYTE);
  assert.equal(VIDEO_UPLOAD_SOURCE_ABSOLUTE_LIMIT_BYTES, 500 * MEBIBYTE);
});

test("valida o arquivo preparado no limite final antes do transporte", () => {
  const finalLimit = 200 * MEBIBYTE;

  assert.doesNotThrow(() =>
    assertMediaUploadFinalSize(fileWithSize(finalLimit), "video", finalLimit),
  );
  assert.equal(
    getMediaUploadFinalSizeError(fileWithSize(80 * MEBIBYTE), "video", finalLimit),
    null,
  );

  const fallbackError = getMediaUploadFinalSizeError(
    fileWithSize(220 * MEBIBYTE),
    "video",
    finalLimit,
  );
  assert.equal(fallbackError?.stage, "final");
  assert.equal(fallbackError?.limitBytes, finalLimit);
  assert.throws(
    () => assertMediaUploadFinalSize(fileWithSize(finalLimit + 1), "video", finalLimit),
    { name: "MediaUploadSizeError" },
  );
});

test("recusa limites inválidos em vez de desativar o guard silenciosamente", () => {
  assert.throws(() => resolveVideoUploadSourceLimitBytes(0), TypeError);
  assert.throws(() => resolveVideoUploadSourceLimitBytes(Number.NaN), TypeError);
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
