import type { BadgeTone } from "@/components/ui";
import type { PostStatus } from "@/lib/admin/post-rules";

/** Color de la insignia de cada estado de noticia. */
export const POST_STATUS_TONE: Record<PostStatus, BadgeTone> = {
  draft: "neutral",
  scheduled: "info",
  published: "success",
};
