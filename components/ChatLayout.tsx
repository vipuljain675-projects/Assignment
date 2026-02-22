"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

export default function ChatLayout() {
  const { user } = useUser();
  const [activeConversationId, setActiveConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");

  const me = useQuery(
    api.users.getMe,
    user ? { clerkId: user.id } : "skip"
  );

  if (!user || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSelectConversation = (id: Id<"conversations">) => {
    setActiveConversationId(id);
    setMobileView("chat");
  };

  const handleBack = () => {
    setMobileView("sidebar");
    setActiveConversationId(null);
  };

  return (
    <div className="h-screen flex bg-slate-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-700
          ${mobileView === "sidebar" ? "flex" : "hidden"} md:flex flex-col
        `}
      >
        <Sidebar
          me={me}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Area */}
      <div
        className={`
          flex-1 flex flex-col
          ${mobileView === "chat" ? "flex" : "hidden"} md:flex
        `}
      >
        {activeConversationId ? (
          <ChatWindow
            conversationId={activeConversationId}
            me={me}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold mb-2">Welcome to TarsChat</h2>
              <p className="text-sm">Select a conversation or find a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
