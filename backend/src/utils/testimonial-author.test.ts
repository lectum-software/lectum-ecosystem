import assert from "node:assert/strict";
import test from "node:test";
import { toTestimonialAuthor } from "./testimonial-author";

test("testimonial identity includes full profile name and avatar, never account data", () => {
  const author = {
    name: "  Ana Maria Pereira  ",
    avatar: "/public/files/avatar/ana.jpg",
    id: "internal-account",
    email: "private@example.test",
    password: "private",
  };
  assert.deepEqual(toTestimonialAuthor(author), {
    name: "Ana Maria Pereira",
    initials: "AP",
    avatar: author.avatar,
  });
});

test("missing photo preserves the name; legacy records tolerate absent avatar", () => {
  assert.deepEqual(toTestimonialAuthor({ name: "Ana Pereira" }), {
    name: "Ana Pereira",
    initials: "AP",
    avatar: null,
  });
  assert.deepEqual(toTestimonialAuthor({ name: "Ana", avatar: null }), {
    name: "Ana",
    initials: "AN",
    avatar: null,
  });
});
