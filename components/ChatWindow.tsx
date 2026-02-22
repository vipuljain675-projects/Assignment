"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Send, Trash2, SmilePlus, ChevronDown } from "lucide-react";
import { formatMessageTime } from "@/lib/utils";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

interface ChatWindowProps {
  conversationId: Id<"conversations">;
  me: any;
  onBack: () => void;
}

export default function ChatWindow({ conversationId, me, onBack }: ChatWindowProps) {
  const [text, setText] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messages = useQuery(api.messages.getMessages, { conversationId });
  const typingUsers = useQuery(api.messages.getTypingUsers, {
    conversationId,
    myUserId: me._id,
  });
  const conversations = useQuery(api.conversations.getMyConversations, {
    userId: me._id,
  });

  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const setTyping = useMutation(api.messages.setTyping);
  const markAsRead = useMutation(api.messages.markAsRead);

  const currentConv = conversations?.find((c: any) => c._id === conversationId);
  const otherUser = currentConv?.participants?.find((p: any) => p._id !== me._id);
  const convName = currentConv?.isGroup
    ? currentConv.groupName
    : otherUser?.name ?? "Chat";

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      scrollToBottom(false);
      setShowScrollBtn(false);
    } else {
      setShowScrollBtn(true);
    }
  }, [messages]);

  // Mark as read when opening conversation
  useEffect(() => {
    markAsRead({ conversationId, userId: me._id });
  }, [conversationId]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    setShowScrollBtn(!isNearBottom);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text;
    setText("");
    // Stop typing indicator
    setTyping({ conversationId, userId: me._id, isTyping: false });
    await sendMessage({ conversationId, senderId: me._id, content });
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    setTyping({ conversationId, userId: me._id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ conversationId, userId: me._id, isTyping: false });
    }, 2000);
  };

  const groupMessagesByDate = (msgs: any[]) => {
    const groups: { date: string; messages: any[] }[] = [];
    msgs?.forEach((msg) => {
      const dateKey = new Date(msg._creationTime).toDateString();
      const lastGroup = groups[groups.length - 1];
      if (lastGroup?.date === dateKey) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date: dateKey, messages: [msg] });
      }
    });
    return groups;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const groups = groupMessagesByDate(messages ?? []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700 bg-slate-800">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-slate-700 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative">
          {currentConv?.isGroup ? (
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-semibold">
              {convName?.[0]?.toUpperCase()}
            </div>
          ) : (
            <>
              <img
                src={
                  otherUser?.imageUrl ??
                  `https://api.dicebear.com/7.x/initials/svg?seed=${convName}`
                }
                alt={convName}
                className="w-10 h-10 rounded-full object-cover"
              />
              {otherUser?.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
              )}
            </>
          )}
        </div>
        <div>
          <div className="font-semibold text-sm">{convName}</div>
          <div className="text-xs text-slate-400">
            {currentConv?.isGroup
              ? `${currentConv.participants?.length} members`
              : otherUser?.isOnline
              ? "Online"
              : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {!messages?.length && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <div className="text-4xl mb-3">👋</div>
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          </div>
        )}

        {groups.map(({ date, messages: groupMsgs }) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-400">{formatDateLabel(date)}</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {groupMsgs.map((msg: any, idx: number) => {
              const isMine = msg.senderId === me._id;
              const showAvatar =
                !isMine &&
                (idx === groupMsgs.length - 1 ||
                  groupMsgs[idx + 1]?.senderId !== msg.senderId);

              return (
                <div
                  key={msg._id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1 group`}
                >
                  {!isMine && (
                    <div className="w-8 mr-2 flex-shrink-0">
                      {showAvatar && (
                        <img
                          src={
                            msg.sender?.imageUrl ??
                            `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.name}`
                          }
                          alt={msg.sender?.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                    {!isMine && currentConv?.isGroup && showAvatar && (
                      <span className="text-xs text-slate-400 ml-1 mb-0.5">
                        {msg.sender?.name}
                      </span>
                    )}
                    <div className="flex items-end gap-2">
                      {/* Reaction picker trigger */}
                      <div
                        className={`opacity-0 group-hover:opacity-100 transition-opacity relative ${isMine ? "order-first" : "order-last"}`}
                      >
                        <button
                          onClick={() =>
                            setReactionPickerFor(
                              reactionPickerFor === msg._id ? null : msg._id
                            )
                          }
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                        >
                          <SmilePlus size={14} />
                        </button>
                        {reactionPickerFor === msg._id && (
                          <div
                            className={`absolute bottom-full mb-1 bg-slate-700 rounded-full px-2 py-1 flex gap-1 z-10 ${isMine ? "right-0" : "left-0"}`}
                          >
                            {REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  toggleReaction({
                                    messageId: msg._id,
                                    userId: me._id,
                                    emoji,
                                  });
                                  setReactionPickerFor(null);
                                }}
                                className="hover:scale-125 transition-transform text-base"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {isMine && !msg.isDeleted && (
                        <button
                          onClick={() =>
                            deleteMessage({ messageId: msg._id, userId: me._id })
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div
                        className={`relative rounded-2xl px-4 py-2 text-sm ${
                          isMine
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : "bg-slate-700 text-white rounded-bl-sm"
                        } ${msg.isDeleted ? "opacity-60 italic" : ""}`}
                      >
                        {msg.isDeleted ? (
                          <span className="text-slate-300">This message was deleted</span>
                        ) : (
                          <span>{msg.content}</span>
                        )}
                        <span
                          className={`text-xs ml-2 ${isMine ? "text-indigo-200" : "text-slate-400"}`}
                        >
                          {formatMessageTime(msg._creationTime)}
                        </span>
                      </div>
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex gap-1 mt-1 flex-wrap ${isMine ? "justify-end" : "justify-start"}`}>
                        {msg.reactions
                          .filter((r: any) => r.userIds.length > 0)
                          .map((r: any) => (
                            <button
                              key={r.emoji}
                              onClick={() =>
                                toggleReaction({
                                  messageId: msg._id,
                                  userId: me._id,
                                  emoji: r.emoji,
                                })
                              }
                              className={`text-xs bg-slate-700 hover:bg-slate-600 rounded-full px-2 py-0.5 transition-colors ${
                                r.userIds.includes(me._id) ? "ring-1 ring-indigo-500" : ""
                              }`}
                            >
                              {r.emoji} {r.userIds.length}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs">
              {typingUsers.map((u: any) => u.name).join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 shadow-lg transition-colors"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3 bg-slate-700 rounded-xl px-4 py-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
