import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ChatType } from "../types/chat";
import axios from "axios";

export function useCreateChat() {
  const queryClient = useQueryClient();

  const onCreateChatByEmail = async (email: string): Promise<ChatType> => {
    try {
      const res = await api.post("/chat/direct", { email });
      const newChat = res.data;

      queryClient.setQueryData<ChatType[]>(["chats"], (oldChats = []) => {
        const exists = oldChats.some((chat) => chat._id === newChat._id);
        if (exists) return oldChats;

        // WhatsApp-style: newest chat on top
        return [newChat, ...oldChats];
      });

      return newChat;
    } catch (error: any) {
      // ⬇️ Normalize backend error
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || "Failed to create chat"
        );
      }

      throw new Error("Something went wrong");
    }
  };

  return { onCreateChatByEmail };
}
