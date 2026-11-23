import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const domRequire = createRequire(require.resolve("react-dom/client"));
const productionModule = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const modules = {
  react: productionModule("react", "react.production.js"),
  "react-dom": productionModule("react-dom", "react-dom.production.js"),
  "react-dom/client": productionModule("react-dom", "react-dom-client.production.js"),
  scheduler: productionModule("scheduler", "scheduler.production.js", domRequire),
  "@/api/req/posts": "exports.getPostContentVideos = (...args) => window.requestVideos(...args);",
  "@/api/req/community": `
    exports.getCommunities = (...args) => window.requestCommunities(...args);
    exports.getCommunityPosts = (...args) => window.requestCommunityPosts(...args);
  `,
  "./content-video-community-continuation": ts.transpileModule(
    readFileSync(new URL("./content-video-community-continuation.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  "./content-video-queue-interactions": ts.transpileModule(
    readFileSync(new URL("./content-video-queue-interactions.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  "@/api/errors": ts.transpileModule(
    readFileSync(new URL("../../api/errors.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
  queue: ts.transpileModule(
    readFileSync(new URL("./use-content-video-queue.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText,
};

// Emit static CommonJS factories as browser script source, not runtime string compilation.
const moduleFactories = Object.entries(modules)
  .map(
    ([name, source]) =>
      `${JSON.stringify(name)}: function(require, module, exports) {\n${source}\n}`,
  )
  .join(",\n");

// Real React/ReactDOM mount and effects. Only the network boundary is replaced by controlled data.
export const harness = `
  const factories = { ${moduleFactories} };
  const cache = {};
  function require(name) {
    if (cache[name]) return cache[name].exports;
    const module = cache[name] = { exports: {} };
    factories[name](require, module, module.exports);
    return module.exports;
  }
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { flushSync } = require('react-dom');
  const { useContentVideoQueue, contentVideoKey } = require('queue');
  let root;
  let initial;
  let watchedVideoKeys;
  window.calls = [];
  window.communityCalls = [];
  window.communityResponses = {};
  window.requestCommunities = async query => {
    communityCalls.push({ kind: 'catalog', ...query });
    return communityResponses['catalog:' + query.page] ?? { data: [], page: query.page, pages: 0 };
  };
  window.requestCommunityPosts = async (slug, query) => {
    communityCalls.push({ kind: 'posts', slug, ...query });
    const result = communityResponses[slug + ':' + query.page];
    if (!result) throw new Error('Unexpected community request: ' + slug);
    return result;
  };
  window.responses = {};
  window.requestVideos = async (id, query) => {
    window.calls.push({ id, ...query });
    if ('page' in query) throw new Error('Offset pagination is forbidden');
    const position = query.cursor ?? 1;
    const response = window.responses[id + ':' + position];
    if (!response) throw new Error('Unexpected API request: ' + id + ':' + position);
    return response;
  };
  window.video = (post, id, reply = null, media = id) => ({
    id, post_id: post, reply_id: reply, media_item_id: reply ? null : media,
    media_url: '/video/' + id, title: null, content: '', thumbnail_url: null,
    author: {}, community: {}, responding_to: null,
    current_user_vote: null, upvotes_count: 0, saved: false, replies_count: 0,
  });
  window.response = (data, page = 1, pages = 1) => ({
    data, page, pages, count: data.length, next_cursor: page < pages ? String(page + 1) : null,
  });
  function Harness({ source }) {
    window.queue = useContentVideoQueue(initial, source, watchedVideoKeys);
    return React.createElement('output', null, window.queue.items.map(contentVideoKey).join(','));
  }
  window.mount = (entry, source = null, watched = []) => {
    initial = entry;
    watchedVideoKeys = watched;
    root = createRoot(document.getElementById('root'));
    window.setSource(source);
  };
  window.setSource = source => flushSync(() => root.render(React.createElement(Harness, { source })));
  window.action = (name, ...args) => flushSync(() => window.queue[name](...args));
  window.snapshot = () => ({
    items: window.queue.items, index: window.queue.index, ended: window.queue.ended,
    error: window.queue.error, expired: window.queue.expired, loading: window.queue.loading,
    staleInteractions: window.queue.staleInteractions,
  });
  window.unmount = () => flushSync(() => root.unmount());
  window.key = contentVideoKey;
`;
