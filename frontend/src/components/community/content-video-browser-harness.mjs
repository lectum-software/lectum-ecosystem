import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const domRequire = createRequire(require.resolve("react-dom/client"));
const production = (name, file, resolver = require) =>
  readFileSync(path.join(path.dirname(resolver.resolve(name)), "cjs", file), "utf8");
const source = (file) =>
  ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    fileName: file,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const modules = {
  react: production("react", "react.production.js"),
  "react/jsx-runtime": production("react", "react-jsx-runtime.production.js"),
  "react-dom": production("react-dom", "react-dom.production.js"),
  "react-dom/client": production("react-dom", "react-dom-client.production.js"),
  scheduler: production("scheduler", "scheduler.production.js", domRequire),
  "@/lib/video-playback": source("../../lib/video-playback.ts"),
  "@/lib/video-sound-preference": source("../../lib/video-sound-preference.ts"),
  "@/components/analytics/attention":
    "exports.documentHasUserAttention = () => window.attention; exports.subscribeDocumentAttention = () => () => {};",
  "@/lib/modal-media-scope": "exports.isVideoBlockedByModal = () => window.blocked;",
  "@tanstack/react-query": "exports.useQueryClient = () => ({});",
  "@/api/callers/posts":
    "exports.useVotePost = exports.useSavePost = exports.useSaveReply = () => ({});",
  "@/components/analytics/content-video-watch-tracker": `exports.useContentVideoWatchTracking = () => {
      const React=require('react'), current=React.useRef(null);
      return React.useCallback(video => {
        if (!video && current.current) window.trackingDetached.push(current.current.getAttribute('src'));
        current.current=video;
      }, []);
    };`,
  "@/components/conversion/progressive-conversion-provider":
    "exports.useProgressiveConversion = () => ({});",
  "@/hooks/use-lectum-direct-share": "exports.useLectumDirectShare = () => ({});",
  "@/utils/community-display": "exports.getCommunityAuthorDisplayName = author => author.name;",
  "@/utils/media": "exports.resolvePublicMediaUrl = url => url;",
  "@/utils/public-routes":
    "exports.publicCommunityPostFocusedReplyHref = exports.publicCommunityPostHref = () => '/post';",
  "./community-whatsapp-cta": "exports.toCommunityWhatsAppIdentity = () => null;",
  "./content-video-interaction-refresh": `exports.refreshContentVideoInteraction = async () => ({});
     exports.isContentVideoInteractionBlocking = state => state === 'pending' || state === 'error';
     exports.useContentVideoInteractionSync = () => ({
       interactionSync: 'idle', refreshAfterSubmit: async () => {}, refreshInteractions: async () => {},
     });`,
  "./content-video-interaction-status": "exports.ContentVideoInteractionStatus = () => null;",
  "./content-video-comments-sheet": "exports.ContentVideoCommentsSheet = () => null;",
  "./use-content-video-ready": source("./use-content-video-ready.ts"),
  "./content-video-header": source("./content-video-header.tsx"),
  "./use-content-video-progress": source("./use-content-video-progress.ts"),
  "./content-video-history": source("./content-video-history.ts"),
  "./content-video-reading-text": source("./content-video-reading-text.tsx"),
  "./content-video-inline-composer": `exports.ContentVideoInlineComposer = props => {
    window.setComposerBusy = busy => require('react-dom').flushSync(() => {
      props.onBusyChange(busy);
      props.onStateChange({busy, hasDraft:busy, submitting:false});
    });
    return null;
  };`,
  "@/app/app/community/[slug]/post/[id]/modules/reply-support":
    "exports.confirmDiscardReplyDraft = () => true;",
  "./feed-favorite-button": "exports.FeedFavoriteButton = () => null;",
  "./content-video-author": "exports.ContentVideoAuthor = () => null;",
  "@/components/psychologists/psychologist-whatsapp-redirect-button":
    "exports.PsychologistWhatsAppRedirectButton = () => null;",
  "@/components/ui/verified-badge": "exports.VerifiedBadgeIcon = () => null;",
  "@/components/ui/whatsapp-icon": "exports.WhatsAppIcon = () => null;",
  "lucide-react": "module.exports = new Proxy({}, { get: () => () => null });",
  "next/link":
    "exports.default = ({children}) => require('react').createElement('span', null, children);",
  "./content-video-viewer.module.css":
    "exports.default = new Proxy({}, { get: (_, name) => name });",
  "./content-video-controls.module.css":
    "exports.default = new Proxy({}, { get: (_, name) => name });",
  "./content-video-player": `
    const React = require('react');
    exports.ContentVideoPlayer = ({videoProps, onVideoElementReady, onContentClick}) => {
      const ready = React.useCallback(node => {
        if (node) window.prepareVideo(node);
        onVideoElementReady(node);
      }, [onVideoElementReady]);
      return React.createElement(React.Fragment, null,
        React.createElement('video', {...videoProps, ref: ready, preload: 'none'}),
        React.createElement('button', {onClick: onContentClick, 'data-surface': true}, 'surface'));
    };
  `,
  slide: source("./content-video-slide.tsx"),
};
export function createHarness(persistent = false, realMedia = false) {
  const selectedModules = persistent
    ? {
        ...modules,
        "./content-video-player": source("./content-video-player.tsx"),
        "@/components/ui/persistent-feed-video-player": source(
          "../ui/persistent-feed-video-player.tsx",
        ),
        "./persistent-feed-video-policy": source("../ui/persistent-feed-video-policy.ts"),
        "@/components/video-captions/player-captions": source(
          "../video-captions/player-captions.tsx",
        ),
        "./caption-icon": source("../video-captions/caption-icon.tsx"),
        "./directory-preference": source("../video-captions/directory-preference.ts"),
        "@/components/ui/vertical-video-player-stream":
          "exports.VerticalVideoStreamStatus = () => null;",
        "@/components/ui/video-startup-cover": source("../ui/video-startup-cover.tsx"),
        "next/image":
          "exports.default = props => require('react').createElement('span', {'data-video-startup-cover':props['data-video-startup-cover'], 'data-poster':props.src});",
        "@/hooks/video-stream": source("../../hooks/video-stream/index.ts"),
        "@/utils/video-stream": source("../../utils/video-stream.ts"),
        "@/api/callers/video-assets": `
    exports.useVideoAssetPlayback = source => {
      const [,render] = require('react').useReducer(value => value + 1, 0);
      require('react').useLayoutEffect(() => {
        document.querySelectorAll('video').forEach(window.prepareVideo);
      });
      const failed = source && window.playbackFailure === source;
      return {
        data:source && !failed ? {hls_url:'/stream.m3u8',expires_at:'2099-01-01T00:00:00Z'} : undefined,
        error:failed ? new Error('metadata unavailable') : null,
        refetch:()=>{ window.playbackRetries=(window.playbackRetries||0)+1; window.playbackFailure=null; render(); }
      };
    };
  `,
        "hls.js": `exports.default = class Hls {
          static isSupported() { return true; }
          static Events = {MANIFEST_PARSED:'parsed', ERROR:'error'};
          static ErrorTypes = {};
          config = {}; handlers = {}; on(event, handler) { this.handlers[event]=handler; } startLoad() {} stopLoad() {}
          loadSource(source) { this.source=source; }
          attachMedia(video) { this.video=video; video.testHls=this; video.src=this.source; window.hlsAttached=(window.hlsAttached||0)+1; }
          destroy() { window.hlsDestroyed=(window.hlsDestroyed||0)+1; }
        };`,
      }
    : modules;
  const factories = Object.entries(selectedModules)
    .map(
      ([name, value]) =>
        `${JSON.stringify(name)}: function(require, module, exports) {\n${value}\n}`,
    )
    .join(",\n");
  // Mount the actual slide, shared preference and guarded play helper. Only media outcomes,
  // application services and unrelated visual children are controlled by this harness.
  return `
  const factories = {${factories}}, cache = {};
  function require(name) {
    if (cache[name]) return cache[name].exports;
    if (!factories[name]) throw new Error('Missing module ' + name);
    const module = cache[name] = {exports: {}};
    factories[name](require, module, module.exports);
    return module.exports;
  }
  const React = require('react'), {createRoot} = require('react-dom/client');
  const {flushSync} = require('react-dom');
  const {ContentVideoSlide} = require('slide');
  const {ContentVideoPlayerProvider} = require('./content-video-player');
  const persistent = ${persistent};
  if (persistent) window.IntersectionObserver = undefined;
  const sound = require('@/lib/video-sound-preference');
  window.attention = true; window.blocked = false;
  window.trackingDetached = [];
  window.attempts = []; window.outcomes = []; window.pending = [];
  window.prepareVideo = video => {
    if (video.prepared) return;
    video.prepared = true; video.testPaused = true; video.testEnded = false;
    video.load = () => { video.loads = (video.loads || 0) + 1; video.currentTime = 0; video.testEnded = false; };
    Object.defineProperty(video, 'paused', {get: () => video.testPaused});
    Object.defineProperty(video, 'ended', {get: () => video.testEnded});
    Object.defineProperty(video, 'error', {configurable: true, get: () => null});
    Object.defineProperty(video, 'currentSrc', {get: () => video.getAttribute('src') || ''});
    video.canPlayType = () => window.nativeHls ? 'probably' : '';
    Object.defineProperty(video, 'duration', {configurable: true, get: () => 60});
    video.pause = () => {
      if (video.testPaused) return;
      video.testPaused = true;
      video.dispatchEvent(new Event('pause'));
    };
    video.play = () => {
      attempts.push(video.muted);
      const outcome = outcomes.shift();
      if (outcome === 'pending') return new Promise((resolve, reject) => pending.push({resolve, reject, video}));
      if (outcome) return Promise.reject(new DOMException(outcome, outcome));
      video.testPaused = false; video.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
  };
  if (${realMedia}) window.prepareVideo = video => {
    if (video.prepared) return;
    video.prepared = true;
    const load = video.load.bind(video);
    video.load = () => { video.loads = (video.loads || 0) + 1; load(); };
  };
  const item = {id:'v',post_id:'p',media_url:'/video',content:'caption',title:'title',
    author:{id:'a',name:'Author'},community:{slug:'c'},upvotes_count:0,replies_count:0,saved:false};
  let root; let active = true; let creating = false; let selected = 0;
  window.nextCalls = 0;
  window.historyTools = require('./content-video-history');
  const slide = index => React.createElement(ContentVideoSlide, {
    key:index,item:{...item,id:'v'+index,media_url:window.mediaSources?.[index] || item.media_url},active:active && index === selected,initialTime:0,changedDiscussion:false,closeRef:{current:null},
    createPostOpen:creating,onCreatePost:()=>{},
    onNext:()=>{window.nextCalls++},onNavigate:()=>{},onPrevious:()=>{},onClose:()=>{},onInteraction:()=>{},onPanelChange:()=>{},onSeekingChange:()=>{}
  });
  const render = () => flushSync(() => root.render(persistent
    ? React.createElement(ContentVideoPlayerProvider, {nextAfterSource: window.mediaSources?.[selected], nextSource: window.prewarm ? window.mediaSources?.[selected + 1] : undefined}, [0,1,2].map(slide)) : slide(0)));
  window.select = index => {selected=index;render();};
  window.unmount = () => flushSync(() => root.unmount());
  window.mount = (enabled, initialActive = true) => {
    sound.setVideoSoundEnabledByUser(enabled); active = initialActive;
    root = createRoot(document.getElementById('root')); render();
  };
  window.activate = value => {active = value; render();};
  window.openCreate = value => {creating = value; render();};
  window.chooseSound = value => flushSync(() => sound.setVideoSoundEnabledByUser(value));
  window.mediaEvent = name => flushSync(() => {
    const video = document.querySelector('video');
    if (name === 'ended') video.testEnded = true;
    video.dispatchEvent(new Event(name));
  });
  window.surface = () => flushSync(() => document.querySelector('[data-surface]').click());
  window.snapshot = () => ({muted:document.querySelector('video').muted,
    paused:document.querySelector('video').paused, preference:sound.getVideoSoundEnabled(),attempts:[...attempts]});
  window.finish = (index, error) => {
    const request = pending[index];
    if (error) request.reject(new DOMException(error, error));
    else {request.video.testPaused=false;request.video.dispatchEvent(new Event('play'));request.resolve();}
  };
`;
}
