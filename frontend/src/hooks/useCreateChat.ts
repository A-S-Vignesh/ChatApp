import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../lib/api";
import { ChatType } from "../types/chat";

export function useCreateChat() {
  const queryClient = useQueryClient();

  const onCreateChatByEmail = async (email: string): Promise<ChatType> => {
    try {
      const res = await api.post("/chat/direct", { email });
      const newChat = res.data;

      queryClient.setQueryData<ChatType[]>(["chats"], (oldChats = []) => {
        const exists = oldChats.some((chat) => chat._id === newChat._id);
        if (exists) return oldChats;
        return [newChat, ...oldChats];
      });

      return newChat;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          (error.response?.data as { message?: string } | undefined)?.message ||
            "Failed to create chat"
        );
      }
      throw new Error("Something went wrong");
    }
  };

  return { onCreateChatByEmail };
}
