import { guestDoorAction } from "@/server/modules/key-actions";

export const dynamic = "force-dynamic";

/** POST /api/guest/key/:token/lock  { doorId } — "lock now" button while unlocked. */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  return guestDoorAction(req, params.token, "lock");
}
