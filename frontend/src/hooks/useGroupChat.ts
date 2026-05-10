import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toastError, toastSuccess } from "../lib/toast";
import { ChatType } from "../types/chat";

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation<
    ChatType,
    Error,
    { name: string; memberEmails: string[] }
  >({
    mutationFn: async ({ name, memberEmails }) => {
      const res = await api.post("/chat/group", { name, memberEmails });
      return res.data;
    },
    onSuccess: (newChat) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) => {
        if (old.some((c) => c._id === newChat._id)) return old;
        return [newChat, ...old];
      });
      toastSuccess(`Group "${newChat.name ?? "Group"}" created`);
    },
    onError: (err) => toastError(err, "Failed to create group"),
  });
}

export function useRenameGroup(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation<ChatType, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      const res = await api.patch(`/chat/group/${chatId}`, { name });
      return res.data;
    },
    onSuccess: (chat) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) =>
        old.map((c) => (c._id === chat._id ? { ...c, ...chat } : c))
      );
      toastSuccess("Group renamed");
    },
    onError: (err) => toastError(err, "Failed to rename group"),
  });
}

export function useAddGroupMember(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation<ChatType, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const res = await api.post(`/chat/group/${chatId}/members`, { email });
      return res.data;
    },
    onSuccess: (chat) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) =>
        old.map((c) => (c._id === chat._id ? { ...c, ...chat } : c))
      );
      toastSuccess("Member added");
    },
    onError: (err) => toastError(err, "Failed to add member"),
  });
}

export function useRemoveGroupMember(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { userId: string; isSelf?: boolean }>({
    mutationFn: async ({ userId }) => {
      await api.delete(`/chat/group/${chatId}/members/${userId}`);
    },
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) =>
        old.map((c) =>
          c._id === chatId
            ? {
                ...c,
                participants: c.participants.filter(
                  (p) => p._id !== vars.userId
                ),
              }
            : c
        )
      );
      toastSuccess(vars.isSelf ? "You left the group" : "Member removed");
    },
    onError: (err, vars) =>
      toastError(
        err,
        vars.isSelf ? "Failed to leave group" : "Failed to remove member"
      ),
  });
}
