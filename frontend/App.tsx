import React from "react";
import ChatPage from "./src/pages/ChatPage";
import { PWAPrompt } from "./src/components/PWAPrompt";

const App: React.FC = () => {
  return (
    <>
      <ChatPage />
      <PWAPrompt />
    </>
  );
};

export default App;
