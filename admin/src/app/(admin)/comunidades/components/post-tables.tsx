"use client";

import { ArrowUp, Eye, MessageCircle } from "lucide-react";
import Link from "next/link";
import type {
  CommunitiesDashboardPopularPost,
  CommunitiesDashboardRecentPost,
  CommunitiesDashboardTopCommunity,
} from "@/api/req/communities";
import { formatDateTime } from "../modules/period-support";
import { numberFormatter } from "../modules/statistics-config";
import { CardShell } from "./common";
import {
  BlockPeriodLabel,
  DashboardPostActions,
  DashboardPostAuthorIdentity,
  formatCountLabel,
  TopCommunityActions,
  TopCommunityAvatar,
} from "./post-actions";

export const RecentPostsTable = ({ posts }: { posts: CommunitiesDashboardRecentPost[] }) => {
  return (
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Postagens mais recentes</h2>
        </div>
        <span className="text-xs font-semibold text-primary">Ver todas</span>
      </div>

      {posts.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma postagem encontrada em todo o período.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {posts.map((post) => {
              const title = post.title.trim() || "Post sem título";

              return (
                <article
                  className="rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
                  key={post.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {post.community_name} · {formatDateTime(post.created_at)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostAuthorIdentity author={post.author} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Visualizações</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <Eye aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.views_count)}
                      </strong>
                    </p>
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Comentários</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <MessageCircle aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.comments_count)}
                      </strong>
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostActions layout="labels" post={post} />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[28%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b border-border py-3 pr-3 font-semibold">Título</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Autor</th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Visualizações
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Comentários
                  </th>
                  <th className="border-b border-border py-3 pl-3 text-right font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const title = post.title.trim() || "Post sem título";

                  return (
                    <tr className="align-top transition hover:bg-surface-muted/50" key={post.id}>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="min-w-0 py-4 pr-3">
                          <p className="truncate font-semibold text-foreground">{title}</p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {post.community_name} · {formatDateTime(post.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="block min-w-0 px-3 py-4">
                          <DashboardPostAuthorIdentity author={post.author} />
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                            <Eye aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.views_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                            <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.comments_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-right align-top">
                        <div className="py-4 pl-3">
                          <DashboardPostActions layout="icons" post={post} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  );
};

export const PopularPostsTable = ({ posts }: { posts: CommunitiesDashboardPopularPost[] }) => {
  return (
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Posts mais populares</h2>
        </div>
        <span className="text-xs font-semibold text-primary">Ver todas</span>
      </div>

      {posts.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum post popular encontrado em todo o período.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {posts.map((post) => {
              const title = post.title.trim() || "Post sem título";

              return (
                <article
                  className="rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
                  key={post.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {post.community_name} · {formatDateTime(post.created_at)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostAuthorIdentity author={post.author} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Upvotes</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <ArrowUp aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.upvotes_count)}
                      </strong>
                    </p>
                    <p className="rounded-xl bg-surface p-3">
                      <span className="block">Comentários</span>
                      <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <MessageCircle aria-hidden className="h-3.5 w-3.5 text-primary" />
                        {numberFormatter.format(post.comments_count)}
                      </strong>
                    </p>
                  </div>
                  <div className="mt-3">
                    <DashboardPostActions layout="labels" post={post} />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[28%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b border-border py-3 pr-3 font-semibold">Título</th>
                  <th className="border-b border-border px-3 py-3 font-semibold">Autor</th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Upvotes
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Comentários
                  </th>
                  <th className="border-b border-border py-3 pl-3 text-right font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const title = post.title.trim() || "Post sem título";

                  return (
                    <tr className="align-top transition hover:bg-surface-muted/50" key={post.id}>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="py-4 pr-3">
                          <p className="truncate font-semibold text-foreground">{title}</p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {post.community_name} · {formatDateTime(post.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="min-w-0 border-b border-border align-top">
                        <div className="block px-3 py-4">
                          <DashboardPostAuthorIdentity author={post.author} />
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                            <ArrowUp aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.upvotes_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-center align-top">
                        <div className="px-3 py-4">
                          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                            <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                            {numberFormatter.format(post.comments_count)}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-border text-right align-top">
                        <div className="py-4 pl-3">
                          <DashboardPostActions layout="icons" post={post} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  );
};

export const TopCommunitiesTable = ({
  communities,
  periodLabel,
}: {
  communities: CommunitiesDashboardTopCommunity[];
  periodLabel: string;
}) => (
  <div className="scroll-mt-6" id="lista-de-comunidades">
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Principais comunidades</h2>
          <BlockPeriodLabel>{periodLabel}</BlockPeriodLabel>
        </div>
        <Link
          className="shrink-0 text-xs font-semibold text-primary transition hover:text-primary-hover"
          href="/comunidades/lista"
        >
          Ver todas
        </Link>
      </div>

      {communities.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma comunidade com posts, acessos ou ações foi encontrada no período selecionado.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {communities.map((community) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
                key={community.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TopCommunityAvatar community={community} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{community.name}</p>
                      <p className="text-xs text-muted">
                        {formatCountLabel(community.activity_count, "atividade", "atividades")} no
                        período
                      </p>
                    </div>
                  </div>
                  <TopCommunityActions community={community} layout="icons" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Seguidores</span>
                    <strong className="text-sm text-foreground">
                      {numberFormatter.format(community.members_count)}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Posts</span>
                    <strong className="text-sm text-foreground">
                      {numberFormatter.format(community.posts_count)}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Acessos</span>
                    <strong className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      <Eye aria-hidden className="h-3.5 w-3.5 text-primary" />
                      {numberFormatter.format(community.accesses_count)}
                    </strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full max-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col className="w-[42%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b border-border py-3 pr-3 font-semibold">Comunidade</th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Seguidores
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Posts
                  </th>
                  <th className="border-b border-border px-3 py-3 text-center font-semibold">
                    Acessos
                  </th>
                  <th className="border-b border-border py-3 pl-3 text-right font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {communities.map((community) => (
                  <tr className="align-top transition hover:bg-surface-muted/50" key={community.id}>
                    <td className="border-b border-border py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <TopCommunityAvatar community={community} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{community.name}</p>
                          <p className="truncate text-xs text-muted">
                            {formatCountLabel(community.activity_count, "atividade", "atividades")}{" "}
                            no período
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-border px-3 py-4 text-center font-semibold">
                      {numberFormatter.format(community.members_count)}
                    </td>
                    <td className="border-b border-border px-3 py-4 text-center font-semibold">
                      {numberFormatter.format(community.posts_count)}
                    </td>
                    <td className="border-b border-border px-3 py-4 text-center font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <Eye aria-hidden className="h-4 w-4 text-primary" />
                        {numberFormatter.format(community.accesses_count)}
                      </span>
                    </td>
                    <td className="border-b border-border py-4 pl-3 text-right">
                      <TopCommunityActions community={community} layout="icons" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  </div>
);
