import { toast } from "sonner";
import axios from "axios";

/**
 * Pull a sensible message out of any error shape the app throws:
 *  - axios error  → response.data.message ?? response statusText
 *  - Error        → .message
 *  - anything else → fallback
 */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { message?: string } | undefined)?.message ??
      err.message ??
      fallback
    );
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function toastError(err: unknown, fallback = "Something went wrong") {
  toast.error(errorMessage(err, fallback));
}

export function toastSuccess(message: string) {
  toast.success(message);
}

export { toast };
