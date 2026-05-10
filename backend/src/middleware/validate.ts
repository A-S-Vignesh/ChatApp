import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, infer as zInfer } from "zod";

/**
 * Zod request body validator. Replaces the parsed body on the request so
 * downstream handlers see the typed/clean version.
 *
 * Usage:
 *   const Body = z.object({ chatId: z.string(), content: z.string().min(1) });
 *   router.post("/", validateBody(Body), (req, res) => {
 *     const { chatId, content } = req.body as z.infer<typeof Body>;
 *     ...
 *   });
 */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.join(".") || "body";
      return res.status(400).json({
        message: `Invalid ${field}: ${issue?.message ?? "validation failed"}`,
      });
    }
    req.body = result.data as zInfer<S>;
    next();
  };
}
