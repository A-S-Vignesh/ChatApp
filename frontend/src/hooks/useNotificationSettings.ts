import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type NotificationSettings = {
  previews: boolean;
  sounds: boolean;
};

const DEFAULTS: NotificationSettings = { previews: true, sounds: true };

/* Fetch the current user's settings from /profile/me. The user model uses
   `strict: false` so the field may be missing for legacy accounts — fall back
   to defaults in that case. */
export function useNotificationSettings() {
  return useQuery<NotificationSettings>({
    queryKey: ["notificationSettings"],
    queryFn: async () => {
      const res = await api.get("/profile/me");
      const settings = res.data?.notificationSettings ?? {};
      return {
        previews: settings.previews ?? DEFAULTS.previews,
        sounds: settings.sounds ?? DEFAULTS.sounds,
      };
    },
    staleTime: Infinity,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<NotificationSettings>) => {
      const res = await api.put("/profile/notifications", patch);
      const next = res.data?.notificationSettings ?? {};
      return {
        previews: next.previews ?? DEFAULTS.previews,
        sounds: next.sounds ?? DEFAULTS.sounds,
      } as NotificationSettings;
    },

    /* Optimistic toggle so the switch feels instant. */
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["notificationSettings"] });
      const previous = queryClient.getQueryData<NotificationSettings>(["notificationSettings"]);
      queryClient.setQueryData<NotificationSettings>(
        ["notificationSettings"],
        (old) => ({ ...(old ?? DEFAULTS), ...patch })
      );
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["notificationSettings"], ctx.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["notificationSettings"], data);
    },
  });
}
