import type { Express } from "express";
import { createServer, type Server } from "http";
import summarizeHandler from "../api/summarize.ts";
import translateHandler from "../api/translate.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wrapper to convert Vercel API format to Express
  const createExpressHandler = (vercelHandler: any) => {
    return async (req: any, res: any) => {
      if (!vercelHandler) {
        res.status(500).json({ message: 'API handler not available' });
        return;
      }

      try {
        // Create Vercel-like request/response objects
        const vercelReq = {
          method: req.method,
          body: req.body,
          query: req.query,
          headers: req.headers,
          url: req.url
        };

        const vercelRes = {
          status: (code: number) => {
            res.status(code);
            return vercelRes;
          },
          json: (data: any) => {
            res.json(data);
            return vercelRes;
          },
          end: () => {
            res.end();
            return vercelRes;
          },
          setHeader: (name: string, value: string) => {
            res.setHeader(name, value);
            return vercelRes;
          }
        };

        await vercelHandler(vercelReq, vercelRes);
      } catch (error) {
        console.error('API handler error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  };

  // Register the same API handlers used by the serverless deployment.
  app.post("/api/summarize", createExpressHandler(summarizeHandler));
  app.options("/api/summarize", createExpressHandler(summarizeHandler));

  app.post("/api/translate", createExpressHandler(translateHandler));
  app.options("/api/translate", createExpressHandler(translateHandler));

  return createServer(app);
}
