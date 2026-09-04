import assert from "node:assert/strict";
import {
  createHash,
  createHmac,
  createPublicKey,
  createVerify,
  generateKeyPairSync,
} from "node:crypto";
import { describe, it } from "node:test";
import {
  CloudflareStreamAdapter,
  isCloudflareStreamVideoUid,
  VideoStreamProviderError,
} from "./cloudflare-stream";
import {
  getVideoStreamConfig,
  getVideoStreamMaxDurationSeconds,
  isVideoStreamEnabled,
  type VideoStreamConfig,
} from "./config";
import {
  normalizeVideoAssetPlaybackReference,
  videoAssetIdFromReference,
  videoAssetPlaybackReference,
} from "./reference";
import { createSignedVideoPlayback, signVideoPlaybackToken } from "./signing";
import { verifyVideoStreamWebhook } from "./webhook";

const createSigningMaterial = () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ format: "pem", type: "pkcs1" }).toString();
  return { pem, privateKey };
};

const createConfig = (): VideoStreamConfig => {
  const { privateKey } = createSigningMaterial();
  return {
    accountId: "account_123",
    allowedOrigins: ["homolog.lectum.com.br"],
    apiToken: "private-api-token",
    customerCode: "customer_code_123",
    playbackTtlSeconds: 1_800,
    requestTimeoutMs: 15_000,
    signingKey: privateKey,
    signingKeyId: "signing_key_123",
    uploadExpirySeconds: 7_200,
    webhookSecret: "webhook-secret",
  };
};

describe("Cloudflare Stream configuration", () => {
  it("fica desabilitada por padrão e falha fechada quando incompleta", () => {
    assert.equal(isVideoStreamEnabled({}), false);
    assert.equal(getVideoStreamConfig({ CLOUDFLARE_STREAM_ENABLED: "true" }), null);
  });

  it("aceita configuração completa e converte origens em hostnames", () => {
    const { pem } = createSigningMaterial();
    const env: NodeJS.ProcessEnv = {
      CLOUDFLARE_STREAM_ACCOUNT_ID: "account_123",
      CLOUDFLARE_STREAM_ALLOWED_ORIGINS:
        "https://homolog.lectum.com.br,https://homolog-admin.lectum.com.br",
      CLOUDFLARE_STREAM_API_TOKEN: "private-api-token",
      CLOUDFLARE_STREAM_CUSTOMER_CODE: "customer_code_123",
      CLOUDFLARE_STREAM_ENABLED: "true",
      CLOUDFLARE_STREAM_MAX_DURATION_SECONDS: "720",
      CLOUDFLARE_STREAM_SIGNING_KEY_ID: "signing_key_123",
      CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY_BASE64: Buffer.from(pem).toString("base64"),
      CLOUDFLARE_STREAM_WEBHOOK_SECRET: "webhook-secret",
      NODE_ENV: "homolog",
    };

    const config = getVideoStreamConfig(env);
    assert.ok(config);
    assert.deepEqual(config.allowedOrigins, [
      "homolog.lectum.com.br",
      "homolog-admin.lectum.com.br",
    ]);
    assert.equal(config.playbackTtlSeconds, 1_800);
    assert.equal(getVideoStreamMaxDurationSeconds(env), 720);
  });
});

describe("Cloudflare Stream direct upload", () => {
  it("aceita apenas o formato limitado de UID antes de consultar o provider", () => {
    assert.equal(isCloudflareStreamVideoUid("0123456789abcdef0123456789abcdef"), true);
    assert.equal(isCloudflareStreamVideoUid("reservation_asset_12345678"), false);
    assert.equal(isCloudflareStreamVideoUid("x".repeat(65)), false);
  });

  it("provisiona TUS privado com limites sem devolver o token da conta", async () => {
    const config = createConfig();
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetcher = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(null, {
        headers: {
          Location: "https://upload.videodelivery.net/tus/capability-value",
          "stream-media-id": "0123456789abcdef0123456789abcdef",
        },
        status: 201,
      });
    }) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(config, fetcher);
    const expiresAt = new Date("2030-01-02T03:04:05.000Z");

    const result = await adapter.provisionUpload({
      assetId: "asset_internal_123",
      expiresAt,
      maxDurationSeconds: 600,
      purpose: "profile_presentation",
      sizeBytes: 222_553_640,
    });

    assert.equal(
      capturedUrl,
      "https://api.cloudflare.com/client/v4/accounts/account_123/stream?direct_user=true",
    );
    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get("authorization"), "Bearer private-api-token");
    assert.equal(headers.get("tus-resumable"), "1.0.0");
    assert.equal(headers.get("upload-length"), "222553640");
    assert.equal(headers.get("upload-creator"), "asset_internal_123");

    const metadata = headers.get("upload-metadata") ?? "";
    assert.match(metadata, /requiresignedurls/);
    assert.match(metadata, /maxdurationseconds NjAw/);
    assert.match(metadata, /expiry MjAzMC0wMS0wMlQwMzowNDowNS4wMDBa/);
    assert.match(
      metadata,
      new RegExp(
        `allowedorigins ${Buffer.from(JSON.stringify(config.allowedOrigins)).toString("base64")}`,
      ),
    );
    assert.deepEqual(result, {
      providerUid: "0123456789abcdef0123456789abcdef",
      uploadUrl: "https://upload.videodelivery.net/tus/capability-value",
    });
    assert.doesNotMatch(JSON.stringify(result), /private-api-token/);
  });

  it("rejeita URL de upload fora do domínio oficial", async () => {
    const fetcher = (async () =>
      new Response(null, {
        headers: {
          Location: "https://attacker.example/upload",
          "stream-media-id": "0123456789abcdef0123456789abcdef",
        },
        status: 201,
      })) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(createConfig(), fetcher);

    await assert.rejects(
      adapter.provisionUpload({
        assetId: "asset_internal_123",
        expiresAt: new Date("2030-01-02T03:04:05.000Z"),
        maxDurationSeconds: 600,
        purpose: "community_post",
        sizeBytes: 5_242_880,
      }),
      VideoStreamProviderError,
    );
  });

  it("só considera pronto quando estado e readyToStream confirmam reprodução", async () => {
    const providerUid = "0123456789abcdef0123456789abcdef";
    const responses = [
      { readyToStream: false, status: { state: "pendingupload" }, uid: providerUid },
      { readyToStream: true, status: { state: "inprogress" }, uid: providerUid },
      { readyToStream: true, status: { state: "ready" }, uid: providerUid },
    ];
    const fetcher = (async () =>
      Response.json({ result: responses.shift(), success: true })) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(createConfig(), fetcher);

    assert.equal((await adapter.getVideo(providerUid)).status, "uploading");
    assert.equal((await adapter.getVideo(providerUid)).status, "processing");
    assert.equal((await adapter.getVideo(providerUid)).status, "ready");
  });

  it("importa URL HTTPS como vídeo privado e associa o creator ao ativo interno", async () => {
    const providerUid = "0123456789abcdef0123456789abcdef";
    let capturedInit: RequestInit | undefined;
    let capturedUrl = "";
    const fetcher = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return Response.json({
        result: {
          creator: "r2m_asset_12345678",
          readyToStream: false,
          status: { state: "downloading" },
          uid: providerUid,
        },
        success: true,
      });
    }) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(createConfig(), fetcher);

    const result = await adapter.importVideoByUrl({
      assetId: "r2m_asset_12345678",
      sourceUrl: "https://homolog-api.lectum.com.br/public/files/posts/media/video.mp4",
    });

    assert.equal(
      capturedUrl,
      "https://api.cloudflare.com/client/v4/accounts/account_123/stream/copy",
    );
    const body = JSON.parse(String(capturedInit?.body));
    assert.deepEqual(body.allowedOrigins, ["homolog.lectum.com.br"]);
    assert.equal(body.creator, "r2m_asset_12345678");
    assert.equal(body.requireSignedURLs, true);
    assert.equal(body.thumbnailTimestampPct, 0.1);
    assert.equal(
      body.input,
      "https://homolog-api.lectum.com.br/public/files/posts/media/video.mp4",
    );
    assert.equal(result.providerUid, providerUid);
    assert.equal(result.status, "processing");
    assert.doesNotMatch(JSON.stringify(body), /private-api-token/);
  });

  it("reconcilia importação interrompida pelo creator sem criar uma segunda cópia", async () => {
    const providerUid = "fedcba9876543210fedcba9876543210";
    const fetcher = (async () =>
      Response.json({
        result: [
          {
            creator: "r2m_asset_12345678",
            readyToStream: true,
            status: { state: "ready" },
            uid: providerUid,
          },
        ],
        success: true,
      })) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(createConfig(), fetcher);

    assert.deepEqual(await adapter.findVideoByCreator("r2m_asset_12345678"), {
      durationSeconds: null,
      errorCode: null,
      height: null,
      providerUid,
      status: "ready",
      width: null,
    });
  });

  it("falha fechado quando a busca por creator devolve contrato ambíguo", async () => {
    const fetcher = (async () =>
      Response.json({
        result: [
          {
            readyToStream: true,
            status: { state: "ready" },
            uid: "fedcba9876543210fedcba9876543210",
          },
        ],
        success: true,
      })) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(createConfig(), fetcher);

    await assert.rejects(
      adapter.findVideoByCreator("r2m_asset_12345678"),
      VideoStreamProviderError,
    );
  });

  it("recusa origem não HTTPS antes de chamar o provider", async () => {
    let called = false;
    const fetcher = (async () => {
      called = true;
      return Response.json({ success: true });
    }) as typeof fetch;
    const adapter = new CloudflareStreamAdapter(createConfig(), fetcher);

    await assert.rejects(
      adapter.importVideoByUrl({
        assetId: "r2m_asset_12345678",
        sourceUrl: "http://localhost:3001/public/files/posts/media/video.mp4",
      }),
      VideoStreamProviderError,
    );
    assert.equal(called, false);
  });
});

describe("Cloudflare Stream private playback", () => {
  it("gera JWT RS256 curto e URLs de HLS/capa sem habilitar download", () => {
    const config = createConfig();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);
    const providerUid = "0123456789abcdef0123456789abcdef";
    const token = signVideoPlaybackToken(config, providerUid, expiresAt);
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    assert.ok(encodedHeader && encodedPayload && encodedSignature);

    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    assert.deepEqual(header, { alg: "RS256", kid: config.signingKeyId, typ: "JWT" });
    assert.equal(payload.sub, providerUid);
    assert.equal(payload.downloadable, undefined);

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    assert.equal(
      verifier.verify(
        createPublicKey(config.signingKey),
        Buffer.from(encodedSignature, "base64url"),
      ),
      true,
    );

    const playback = createSignedVideoPlayback(config, providerUid);
    assert.match(playback.hlsUrl, /\/manifest\/video\.m3u8$/);
    assert.match(playback.thumbnailUrl, /\/thumbnails\/thumbnail\.jpg\?/);
  });

  it("verifica HMAC sobre os bytes crus e rejeita alteração ou timestamp vencido", () => {
    const body = Buffer.from('{"uid":"provider_video_1234","readyToStream":true}\n');
    const timestamp = 1_900_000_000;
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(body)
      .digest("hex");
    const header = `time=${timestamp},sig1=${signature}`;
    const now = timestamp * 1_000;

    assert.equal(verifyVideoStreamWebhook({ body, header, now, secret }), true);
    assert.equal(
      verifyVideoStreamWebhook({
        body: Buffer.concat([body, Buffer.from(" ")]),
        header,
        now,
        secret,
      }),
      false,
    );
    assert.equal(verifyVideoStreamWebhook({ body, header, now: now + 301_000, secret }), false);
    assert.equal(createHash("sha256").update(body).digest("hex").length, 64);
  });
});

describe("referência interna de vídeo", () => {
  it("aceita somente o contrato Lectum sem query ou fragmento", () => {
    const reference = videoAssetPlaybackReference("asset_12345678");
    assert.equal(reference, "/api/private/video-assets/asset_12345678/playback");
    assert.equal(videoAssetIdFromReference(reference), "asset_12345678");
    assert.equal(
      videoAssetIdFromReference(`https://api.lectum.com.br${reference}`),
      "asset_12345678",
    );
    assert.equal(
      normalizeVideoAssetPlaybackReference(`https://attacker.example${reference}`),
      reference,
    );
    assert.equal(videoAssetIdFromReference(`${reference}?token=secret`), null);
    assert.equal(videoAssetIdFromReference("https://attacker.example/video"), null);
  });
});
