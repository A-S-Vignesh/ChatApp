import React, { useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";

interface HelpProps {
  onClose: () => void;
}

const faqs = [
  {
    question: "How do I change my profile picture?",
    answer:
      'To change your profile picture, go to your Profile page by clicking your avatar in the top left, then click "Edit Profile". You can upload a new photo from there. The feature is coming soon!',
  },
  {
    question: "Can I delete a message?",
    answer:
      "Yes, you can delete a message for everyone in the chat or just for yourself. Long-press on the message you wish to delete and select the appropriate option. This feature is currently in development.",
  },
  {
    question: "How do I start a new chat?",
    answer:
      'Click the "New Chat" icon (a message bubble with a plus sign) in the sidebar header. This will open a list of your contacts. Select a contact to start a new conversation.',
  },
  {
    question: "Is AetherChat available on mobile?",
    answer:
      "AetherChat is a fully responsive web application, meaning it works seamlessly on both desktop and mobile browsers. There is no dedicated mobile app at this time, but the web experience is optimized for all screen sizes.",
  },
];

const Help: React.FC<HelpProps> = ({ onClose }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <aside
      className="bg-white dark:bg-slate-800 w-full h-full flex flex-col"
      role="complementary"
      aria-labelledby="help-heading"
    >
      {/* Header */}
      <header className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            aria-label="Close help"
          >
            <X size={20} />
          </button>
          <h2
            id="help-heading"
            className="text-lg font-bold text-slate-800 dark:text-slate-100"
          >
            Help
          </h2>
        </div>
      </header>

      {/* Help Content */}
      <div className="grow overflow-y-auto p-6 space-y-8">
        {/* Search Bar */}
        <div>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search help topics..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* FAQs Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-b border-slate-200 dark:border-slate-700 last:border-b-0"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center text-left py-4"
                  aria-expanded={openFaq === index}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? "max-h-40" : "max-h-0"
                  }`}
                >
                  <p className="text-slate-600 dark:text-slate-400 text-sm pb-4">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Help;
