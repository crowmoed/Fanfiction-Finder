import { redirect } from "next/navigation";

/**
 * /vote merged into /sponsor (the combined "Add your fandom" page) so the
 * sidebar carries one entry for both. Permanent redirect for old links.
 */
export default function VotePage() {
  redirect("/sponsor");
}
