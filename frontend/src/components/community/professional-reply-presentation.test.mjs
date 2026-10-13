import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { ReplyVoteBar } from "../../app/app/community/[slug]/post/[id]/components/reply-card.tsx";

// Reuse the real provider harness and Next bridges from community-post-controls.test.mjs.
export const registerProfessionalReplyPresentationTests = ({
  renderRelations,
  CommunityPostCard,
  AppRouterContext,
}) => {
  test("profile replies share the question header across text, video and image", () => {
    const author = { id: "psi", name: "Professional", role: "psicologo" };
    const reply = {
      id: "reply",
      author,
      content: "Professional answer",
      created_at: "2026-10-01T12:00:00Z",
      upvotes_count: 0,
    };
    const post = {
      id: "post",
      author,
      title: "Question",
      content: "Original post",
      created_at: reply.created_at,
      contribution_type: "reply",
      highlighted_professional_reply: reply,
      upvotes_count: 0,
      community: { slug: "topic", name: "Topic", category: "Topic" },
    };
    const render = (props) =>
      renderRelations({
        children: createElement(
          AppRouterContext.Provider,
          { value: {} },
          createElement(CommunityPostCard, {
            post,
            onShare() {},
            showWhatsappCta: false,
            ...props,
          }),
        ),
      });
    for (const media_type of [null, "video", "image"]) {
      const html = render({
        profilePublicationMode: true,
        post: {
          ...post,
          highlighted_professional_reply: {
            ...reply,
            media_type,
            media_url: media_type
              ? `/public/files/answer.${media_type === "video" ? "mp4" : "jpg"}`
              : null,
          },
        },
      });
      assert.match(html, /data-profile-reply-question/);
      assert.ok(html.indexOf("Question") < html.indexOf(author.name));
      assert.ok(html.indexOf("Original post") < html.indexOf("Professional answer"));
      assert.doesNotMatch(html, /data-profile-video-question|data-profile-question-plane/);
      if (media_type === "video") assert.match(html, /<video/);
    }
  });
  test("professional reply actions preserve WhatsApp order and do not repeat media contact", () => {
    for (const role of ["psicologo", "paciente"]) {
      for (const media_url of [null, "https://example.com/answer.mp4"]) {
        for (const saved of [true, false]) {
          const reply = {
            id: "reply",
            saved,
            media_url,
            upvotes_count: 12,
            author: {
              id: "author",
              name: "Professional",
              role,
              whatsapp_url: "https://wa.me/5511999999999",
            },
          };
          const calls = [];
          const bar = ReplyVoteBar({
            currentVote: null,
            reply,
            savePending: true,
            onReply: () => calls.push("reply"),
            onVote: () => calls.push("vote"),
            onShare: () => calls.push("share"),
            onToggleSave: () => calls.push("save"),
          });
          const html = renderRelations({ children: bar });
          if (role === "psicologo") {
            assert.match(html, /lucide-bookmark/);
            assert.match(html, /aria-label="Compartilhar"/);
            assert.match(
              html,
              new RegExp(`aria-label="${saved ? "Remover dos salvos" : "Salvar"}"`),
            );
            assert.equal(bar.props.save.disabled, true);
            assert.match(bar.props.className, /flex-wrap/);
            bar.props.save.onClick();
            bar.props.share.onClick();
            assert.deepEqual(calls, ["save", "share"]);
            if (!media_url) {
              const comment = html.indexOf('aria-label="Responder"');
              const whatsapp = html.indexOf('aria-label="Fale com Professional pelo WhatsApp"');
              const save = html.indexOf(`aria-label="${saved ? "Remover dos salvos" : "Salvar"}"`);
              assert.ok(comment >= 0 && whatsapp > comment && save > whatsapp);
            }
          } else {
            assert.doesNotMatch(html, /lucide-bookmark|aria-label="Compartilhar"/);
            assert.equal(bar.props.save, undefined);
            assert.equal(bar.props.share, undefined);
          }
          if (role !== "psicologo" || media_url) assert.doesNotMatch(html, /Fale com/);
        }
      }
    }
  });
};
