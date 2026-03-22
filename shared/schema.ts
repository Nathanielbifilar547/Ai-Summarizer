import { z } from "zod";

// API request/response schemas
export const summarizeRequestSchema = z
  .object({
    url: z.string().trim().optional(),
    fileName: z.string().trim().optional(),
    fileType: z.string().trim().optional(),
    fileData: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const hasUrl = Boolean(value.url);
    const hasFile = Boolean(value.fileName || value.fileType || value.fileData);

    if (hasUrl && hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Send either a URL or a file payload, not both.",
      });
      return;
    }

    if (!hasUrl && !hasFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A URL or a supported document file is required.",
      });
      return;
    }

    if (hasUrl) {
      try {
        new URL(value.url!);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid URL.",
          path: ["url"],
        });
      }
    }

    if (hasFile) {
      if (!value.fileName || !value.fileType || !value.fileData) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File name, file type, and file data are required for document uploads.",
        });
      }
    }
  });

export const summarizeResponseSchema = z.object({
  article: z.object({
    title: z.string(),
    author: z.string().optional(),
    content: z.string(),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    imageUrl: z.string().optional(),
    originalWords: z.number(),
    summaryWords: z.number(),
    compressionRatio: z.number(),
    aiPowered: z.boolean().optional(), // New field to indicate if AI was used
    sourceType: z.enum(["url", "file"]).optional(),
    sourceName: z.string().optional(),
  }),
});

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;
export type SummarizeResponse = z.infer<typeof summarizeResponseSchema>;
