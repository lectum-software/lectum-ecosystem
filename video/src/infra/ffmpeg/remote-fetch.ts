import { lookup } from "node:dns/promises";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { Readable } from "node:stream";
import {
  isFirstPartyLectumPublicPostMediaUrl,
  isSafeResolvedVideoAddress,
  parseRemoteVideoSourceUrl,
} from "./source-url.js";

const safeLookup =
  (url: URL): LookupFunction =>
  (hostname, options, callback) => {
    // Validate the answers used by the socket, not an earlier DNS lookup followed
    // by fetch's independent resolution (a DNS-rebinding window).
    void lookup(hostname, { all: true, verbatim: true }).then(
      (addresses) => {
        const first = addresses[0];
        if (
          hostname !== url.hostname ||
          !first ||
          (!isFirstPartyLectumPublicPostMediaUrl(url) &&
            addresses.some(({ address, family }) => !isSafeResolvedVideoAddress(address, family)))
        ) {
          callback(new Error("remote_video_source_invalid"), "");
          return;
        }
        if (options.all) callback(null, addresses);
        else callback(null, first.address, first.family);
      },
      () => callback(new Error("remote_video_source_invalid"), ""),
    );
  };

export const fetchRemoteVideo: typeof fetch = async (source, init) => {
  const url = parseRemoteVideoSourceUrl(String(source));
  if (!url) throw new Error("remote_video_source_invalid");

  return new Promise<Response>((resolve, reject) => {
    const outgoing = request(
      url,
      {
        agent: false,
        headers: Object.fromEntries(new Headers(init?.headers)),
        lookup: safeLookup(url),
        method: "GET",
        rejectUnauthorized: true,
        ...(init?.signal ? { signal: init.signal } : {}),
      },
      (incoming) => {
        const status = incoming.statusCode ?? 502;
        if (status >= 300 && status < 400) {
          incoming.destroy();
          reject(new Error("remote_video_redirect_refused"));
          return;
        }
        const headers = new Headers();
        for (const name of ["content-type", "content-length"]) {
          const value = incoming.headers[name];
          if (typeof value === "string") headers.set(name, value);
        }
        if (status < 200 || status >= 300 || status === 204 || status === 205) {
          incoming.destroy();
          resolve(new Response(null, { headers, status }));
          return;
        }
        resolve(
          new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, { headers, status }),
        );
      },
    );
    outgoing.once("error", reject);
    outgoing.end();
  });
};
