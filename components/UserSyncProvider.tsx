"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);

  useEffect(() => {
    if (!isLoaded || !user) return;

    upsertUser({
      clerkId: user.id,
      name: user.fullName ?? user.username ?? "Anonymous",
      email: user.primaryEmailAddress?.emailAddress ?? "",
      imageUrl: user.imageUrl,
    });

    // Set online on mount
    setOnlineStatus({ clerkId: user.id, isOnline: true });

    // Set offline on tab close
    const handleOffline = () =>
      setOnlineStatus({ clerkId: user.id, isOnline: false });
    window.addEventListener("beforeunload", handleOffline);
    return () => window.removeEventListener("beforeunload", handleOffline);
  }, [isLoaded, user]);

  return <>{children}</>;
}
