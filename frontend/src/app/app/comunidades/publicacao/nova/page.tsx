import { redirect } from "next/navigation";
import { COMMUNITY_CREATE_POST_HREF } from "@/utils/community";

export default function CreateCommunityPostPage() {
  redirect(COMMUNITY_CREATE_POST_HREF);
}
