import React, { useEffect, useState } from "react";
import { Toaster } from "sonner";
import ChatPage from "./src/pages/ChatPage";

const App: React.FC = () => {
  /* keep sonner in sync with the app's light/dark theme */
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <ChatPage />
      <Toaster
        position="top-right"
        theme={theme}
        richColors
        closeButton
        duration={4000}
      />
    </>
  );
};

export default App;
