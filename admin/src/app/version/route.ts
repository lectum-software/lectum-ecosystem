import packageMetadata from "../../../package.json";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function GET() {
  return Response.json(
    {
      application: "admin",
      version: packageMetadata.version,
    },
    { headers: responseHeaders },
  );
}
