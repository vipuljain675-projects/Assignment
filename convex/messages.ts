import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      isDeleted: false,
      reactions: [],
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageTime: Date.now(),
    });

    return msgId;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return { ...msg, sender };
      })
    );

    return enriched;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.senderId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.messageId, { isDeleted: true, content: "" });
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");

    let reactions = msg.reactions ?? [];
    const existingReaction = reactions.find((r) => r.emoji === args.emoji);

    if (existingReaction) {
      if (existingReaction.userIds.includes(args.userId)) {
        // Remove user from reaction
        const newUserIds = existingReaction.userIds.filter(
          (id) => id !== args.userId
        );
        if (newUserIds.length === 0) {
          reactions = reactions.filter((r) => r.emoji !== args.emoji);
        } else {
          reactions = reactions.map((r) =>
            r.emoji === args.emoji ? { ...r, userIds: newUserIds } : r
          );
        }
      } else {
        // Add user to reaction
        reactions = reactions.map((r) =>
          r.emoji === args.emoji
            ? { ...r, userIds: [...r.userIds, args.userId] }
            : r
        );
      }
    } else {
      reactions = [...reactions, { emoji: args.emoji, userIds: [args.userId] }];
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastReadTime: Date.now() });
    } else {
      await ctx.db.insert("readReceipts", {
        conversationId: args.conversationId,
        userId: args.userId,
        lastReadTime: Date.now(),
      });
    }
  },
});

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getTypingUsers = query({
  args: { conversationId: v.id("conversations"), myUserId: v.id("users") },
  handler: async (ctx, args) => {
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const active = indicators.filter(
      (i) =>
        i.isTyping &&
        i.userId !== args.myUserId &&
        Date.now() - i.updatedAt < 3000
    );

    const users = await Promise.all(active.map((i) => ctx.db.get(i.userId)));
    return users.filter(Boolean);
  },
});
