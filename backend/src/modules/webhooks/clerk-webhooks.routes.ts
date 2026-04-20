import { verifyWebhook } from "@clerk/backend/webhooks";
import { Router, type Request as ExpressRequest, type Response } from "express";
import { provisionInvitedUserFromClerkUser } from "./clerk-provision.service.js";

export const clerkWebhooksRouter = Router();

function buildWebhookRequest(req: ExpressRequest): globalThis.Request {
  const bodyBuffer = req.body as Buffer | undefined;
  const payload = Buffer.isBuffer(bodyBuffer) ? bodyBuffer.toString("utf8") : String(bodyBuffer ?? "");
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  const url = `http://localhost${req.originalUrl}`;
  return new Request(url, {
    method: req.method,
    headers,
    body: payload,
  });
}

clerkWebhooksRouter.post("/", async (req: ExpressRequest, res: Response): Promise<void> => {
  try {
    const whreq = buildWebhookRequest(req);
    const evt = await verifyWebhook(whreq);
    if (evt.type === "user.created" || evt.type === "user.updated") {
      await provisionInvitedUserFromClerkUser(evt.data);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[clerk webhook]", e);
    res.status(400).json({ error: "invalid webhook" });
  }
});
