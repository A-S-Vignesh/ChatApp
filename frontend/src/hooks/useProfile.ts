import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toastError, toastSuccess } from "../lib/toast";

export type ProfileType = {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
  about?: string;
  phone?: string;
  location?: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
};

export type ProfileUpdate = Partial<
  Pick<ProfileType, "name" | "about" | "phone" | "location">
>;

export function useProfile(enabled = true) {
  return useQuery<ProfileType>({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const res = await api.get("/profile/me");
      return res.data;
    },
    enabled,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<ProfileType, Error, ProfileUpdate>({
    mutationFn: async (patch) => {
      const res = await api.patch("/profile/me", patch);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", "me"], updated);
      toastSuccess("Profile saved");
    },
    onError: (err) => toastError(err, "Failed to save profile"),
  });
}
