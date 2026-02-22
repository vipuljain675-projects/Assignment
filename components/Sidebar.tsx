"use client";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Search, Users, Plus, X } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface SidebarProps {
  me: any;
  activeConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export default function Sidebar({
  me,
  activeConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedForGroup, setSelectedForGroup] = useState<Id<"users">[]>([]);

  const conversations = useQuery(api.conversations.getMyConversations, {
    userId: me._id,
  });
  const searchResults = useQuery(
    api.users.searchUsers,
    search ? { query: search, clerkId: me.clerkId } : "skip"
  );
  const allUsers = useQuery(
    api.users.getAllUsers,
    showUsers || showGroupModal ? { clerkId: me.clerkId } : "skip"
  );
  const getOrCreate = useMutation(api.conversations.getOrCreateConversation);
  const createGroup = useMutation(api.conversations.createGroupConversation);

  const handleUserClick = async (userId: Id<"users">) => {
    const convId = await getOrCreate({
      myUserId: me._id,
      otherUserId: userId,
    });
    onSelectConversation(convId as Id<"conversations">);
    setSearch("");
    setShowUsers(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedForGroup.length < 2) return;
    const convId = await createGroup({
      participantIds: [...selectedForGroup, me._id],
      groupName,
    });
    onSelectConversation(convId as Id<"conversations">);
    setShowGroupModal(false);
    setGroupName("");
    setSelectedForGroup([]);
  };

  const getConvName = (conv: any) => {
    if (conv.isGroup) return conv.groupName;
    const other = conv.participants?.find((p: any) => p._id !== me._id);
    return other?.name ?? "Unknown";
  };

  const getConvAvatar = (conv: any) => {
    if (conv.isGroup) return null;
    const other = conv.participants?.find((p: any) => p._id !== me._id);
    return other?.imageUrl;
  };

  const getOtherUser = (conv: any) => {
    return conv.participants?.find((p: any) => p._id !== me._id);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/sign-in" />
            <span className="font-semibold text-sm">{me.name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUsers(!showUsers)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Find users"
            >
              <Users size={18} />
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Create group"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Search results */}
      {search && (
        <div className="border-b border-slate-700">
          <div className="p-2 text-xs text-slate-400 uppercase font-semibold px-4">
            Search Results
          </div>
          {!searchResults?.length && (
            <div className="px-4 py-3 text-sm text-slate-400">No users found</div>
          )}
          {searchResults?.map((u: any) => (
            <button
              key={u._id}
              onClick={() => handleUserClick(u._id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors"
            >
              <div className="relative">
                <img
                  src={u.imageUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {u.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-slate-400">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* All Users list (when toggled) */}
      {showUsers && !search && (
        <div className="border-b border-slate-700 max-h-64 overflow-y-auto">
          <div className="p-2 text-xs text-slate-400 uppercase font-semibold px-4">
            All Users
          </div>
          {!allUsers?.length && (
            <div className="px-4 py-3 text-sm text-slate-400">No other users yet</div>
          )}
          {allUsers?.map((u: any) => (
            <button
              key={u._id}
              onClick={() => handleUserClick(u._id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors"
            >
              <div className="relative">
                <img
                  src={u.imageUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {u.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-slate-400">
                  {u.isOnline ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 text-xs text-slate-400 uppercase font-semibold px-4 pt-3">
          Conversations
        </div>
        {!conversations?.length && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            <div className="text-3xl mb-2">💬</div>
            <div>No conversations yet.</div>
            <div>Find a user above to start chatting!</div>
          </div>
        )}
        {conversations?.map((conv: any) => {
          const otherUser = getOtherUser(conv);
          const isActive = conv._id === activeConversationId;
          return (
            <button
              key={conv._id}
              onClick={() => onSelectConversation(conv._id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive ? "bg-indigo-600/30 border-r-2 border-indigo-500" : "hover:bg-slate-700"
              }`}
            >
              <div className="relative flex-shrink-0">
                {conv.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                    {conv.groupName?.[0]?.toUpperCase()}
                  </div>
                ) : (
                  <>
                    <img
                      src={getConvAvatar(conv) ?? `https://api.dicebear.com/7.x/initials/svg?seed=${getConvName(conv)}`}
                      alt={getConvName(conv)}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {otherUser?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                    )}
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium truncate">
                    {getConvName(conv)}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-1">
                      {formatTimestamp(conv.lastMessage._creationTime)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 truncate">
                    {conv.lastMessage
                      ? conv.lastMessage.isDeleted
                        ? "Message deleted"
                        : conv.lastMessage.content
                      : "No messages yet"}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="ml-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Create Group Chat</h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="text-xs text-slate-400 mb-2 uppercase font-semibold">
              Select members (min 2)
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {allUsers?.map((u: any) => (
                <label
                  key={u._id}
                  className="flex items-center gap-3 p-2 hover:bg-slate-700 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedForGroup.includes(u._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForGroup((prev) => [...prev, u._id]);
                      } else {
                        setSelectedForGroup((prev) =>
                          prev.filter((id) => id !== u._id)
                        );
                      }
                    }}
                    className="accent-indigo-500"
                  />
                  <img
                    src={u.imageUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                    className="w-8 h-8 rounded-full"
                    alt={u.name}
                  />
                  <span className="text-sm">{u.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedForGroup.length < 2}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
