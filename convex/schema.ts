import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
//import { SubscriptIcon } from "lucide-react";

export default defineSchema({
    UserTable:defineTable({
        name: v.string(),
        imageUrl: v.string(),
        email: v.string(),
        Subscription: v.optional(v.string()),
    }),
 
    TripDetailTable:defineTable({
        tripId:v.string(),
        tripDetail:v.any(),
        uid:v.id('UserTable'),
        isPinned: v.optional(v.boolean()),
        isStamped: v.optional(v.boolean()),
        stampDate: v.optional(v.string()),
    })
      
})