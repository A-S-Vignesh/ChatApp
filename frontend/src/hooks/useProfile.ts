import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient } from "../lib/authClient";

export type PrivacySettings = {
  readReceipts: boolean;
  typingIndicator: boolean;
  lastSeen: "everyone" | "nobody";
  showOnline: boolean;
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  readReceipts: true,
  typingIndicator: true,
  lastSeen: "everyone",
  showOnline: true,
};

export type Profile = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  about?: string;
  phone?: string;
  location?: string;
  dob?: string | null;
  privacy?: PrivacySettings;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileUpdate = {
  name?: string;
  about?: string;
  phone?: string;
  location?: string;
  /* ISO date string (YYYY-MM-DD) or null to clear. */
  dob?: string | null;
};

/* Loads the full user profile from the app DB — includes extended fields
   (about, phone, location, dob) that aren't on the better-auth session user. */
export function useProfile(enabled = true) {
  return useQuery<Profile>({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const res = await api.get("/profile/me");
      return res.data as Profile;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const res = await api.put("/profile/me", patch);
      return res.data as Profile;
    },

    /* Optimistic so the form snaps back to read mode without a flicker. */
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["profile", "me"] });
      const previous = queryClient.getQueryData<Profile>(["profile", "me"]);
      if (previous) {
        queryClient.setQueryData<Profile>(["profile", "me"], { ...previous, ...patch });
      }
      return { previous };
    },

    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["profile", "me"], ctx.previous);
      }
    },

    onSuccess: async (data, patch) => {
      queryClient.setQueryData(["profile", "me"], data);

      /* If the name changed, refetch the better-auth session so the rest of
         the UI (sidebar, header, avatars) picks it up. */
      if (patch.name !== undefined) {
        try {
          await (authClient as any).getSession?.({ query: { disableCache: true } });
        } catch {
          /* non-fatal: the local cache will catch up on next reload */
        }
      }
    },
  });
}

/* Update privacy preferences with optimistic toggling. */
export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<PrivacySettings>) => {
      const res = await api.put("/profile/privacy", patch);
      return res.data.privacy as PrivacySettings;
    },

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["profile", "me"] });
      const previous = queryClient.getQueryData<Profile>(["profile", "me"]);
      if (previous) {
        queryClient.setQueryData<Profile>(["profile", "me"], {
          ...previous,
          privacy: { ...DEFAULT_PRIVACY, ...(previous.privacy ?? {}), ...patch },
        });
      }
      return { previous };
    },

    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["profile", "me"], ctx.previous);
    },

    onSuccess: (privacy) => {
      const previous = queryClient.getQueryData<Profile>(["profile", "me"]);
      if (previous) {
        queryClient.setQueryData<Profile>(["profile", "me"], { ...previous, privacy });
      }
      /* Privacy changes can affect what other participants' presence/last-seen
         we should see — invalidate chats so the next render uses fresh data. */
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

/* Permanently delete the current user's account. The server cascade-deletes
   messages, chat memberships, and push subs, and signs the user out. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await api.delete("/profile/me");
    },
  });
}
