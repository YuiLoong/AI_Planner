import {v} from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateTripDetail = mutation({
    args:{
        tripId: v.string(),
        uid:v.id('UserTable'),
        tripDetail:v.any()
    },
    handler:async(convexToJson,args)=>{
        const result = await convexToJson.db.insert('TripDetailTable',{
            tripDetail:args.tripDetail,
            tripId: args.tripId,
            uid: args.uid

        });
    }
})

export const GetUserTrips = query({
    args:{
        uid:v.id('UserTable')
    },
    handler:async(ctx,args)=>{
        const result=await ctx.db.query('TripDetailTable')
        .filter(q=> q.eq(q.field('uid'),args.uid))
        .order('desc')
        .collect();

        return result;
    }
})

export const GetTripById = query({
    args:{
        uid:v.id('UserTable'),
        tripid: v.string()
    },
    handler:async(ctx,args)=>{
        const result=await ctx.db.query('TripDetailTable')
        .filter(q=> q.and(
            q.eq(q.field('uid'),args.uid),
            q.eq(q.field('tripId'),args?.tripid)
        ))
        .order('desc')
        .collect();

        return result[0];
    }
})


export const updateTripOptions = mutation({
  args: {
    tripDocId: v.id("TripDetailTable"), // 우리가 schema.ts에서 확인한 이름
    isPinned: v.optional(v.boolean()),
    isStamped: v.optional(v.boolean()),
    stampDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tripDocId, ...updates } = args;
    await ctx.db.patch(tripDocId, updates);
  },
});