import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getOrCreateConversation = mutation({
  args: {
    myUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find existing 1-1 conversation
    const existing = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("isGroup"), false),
          q.or(
            q.and(
              q.eq(
                q.field("participantIds"),
                [args.myUserId, args.otherUserId]
              )
            )
          )
        )
      )
      .collect();

    // Check if any existing conversation has both participants
    for (const conv of existing) {
      if (
        conv.participantIds.includes(args.myUserId) &&
        conv.participantIds.includes(args.otherUserId) &&
        conv.participantIds.length === 2
      ) {
        return conv._id;
      }
    }

    // Create new conversation
    return await ctx.db.insert("conversations", {
      participantIds: [args.myUserId, args.otherUserId],
      isGroup: false,
      lastMessageTime: Date.now(),
    });
  },
});

export const createGroupConversation = mutation({
  args: {
    participantIds: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      participantIds: args.participantIds,
      isGroup: true,
      groupName: args.groupName,
      lastMessageTime: Date.now(),
    });
  },
});

export const getMyConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();

    const myConvs = conversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    // Sort by lastMessageTime desc
    myConvs.sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0));

    // Enrich with participant info and last message
    const enriched = await Promise.all(
      myConvs.map(async (conv) => {
        const participants = await Promise.all(
          conv.participantIds.map((id) => ctx.db.get(id))
        );

        const lastMsg = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .first();

        // Get unread count
        const readReceipt = await ctx.db
          .query("readReceipts")
          .withIndex("by_conversation_user", (q) =>
            q.eq("conversationId", conv._id).eq("userId", args.userId)
          )
          .first();

        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();

        const unreadCount = allMessages.filter(
          (m) =>
            m.senderId !== args.userId &&
            m._creationTime > (readReceipt?.lastReadTime ?? 0)
        ).length;

        return {
          ...conv,
          participants: participants.filter(Boolean),
          lastMessage: lastMsg,
          unreadCount,
        };
      })
    );

    return enriched;
  },
});
