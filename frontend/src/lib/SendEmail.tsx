import React, { useState } from "react";

interface SendEmailProps {
  to: string;
  subject: string;
  text: string;
  onSend: (data: {
    to: string;
    subject: string;
    text: string;
  }) => Promise<void>;
}

const SendEmail: React.FC<SendEmailProps> = ({ to, subject, text, onSend }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await onSend({ to, subject, text });

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleSend}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send Email"}
      </button>

      {success && (
        <p className="text-sm text-green-600">Email sent successfully ✅</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default SendEmail;
