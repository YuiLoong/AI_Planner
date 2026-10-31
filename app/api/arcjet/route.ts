import arcjet, { tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";

// export const aj = arcjet({
//   key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
//   rules: [
//     // Create a token bucket rate limit. Other algorithms are supported.
//     tokenBucket({
//       mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
//       characteristics: ["userId"], // track requests by a custom user ID
//       refillRate: 100, // refill 5 tokens per interval
//       interval: 10, // refill every 10 seconds
//       capacity: 100, // bucket maximum capacity of 10 tokens
//     }),
//   ],
// });

const aj = arcjet({
  key: process.env.ARCJET_KEY!, 
  rules: [
    tokenBucket({
      mode: "LIVE", 
      characteristics: ["userId"], 
      refillRate: 100, 
      interval: 10, 
      capacity: 100, 
    }),
  ],
});

export async function GET(req: Request) {
  const userId = "user123"; 
  const decision = await aj.protect(req, { userId, requested: 1 }); 
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Too Many Requests", reason: decision.reason },
      { status: 429 },
    );
  }

  return NextResponse.json({ message: "Hello world" });
}