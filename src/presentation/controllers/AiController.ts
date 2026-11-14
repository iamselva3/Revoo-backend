import { Request, Response, NextFunction } from 'express';
import { GenieAiService, ChatMessage, ChatContext } from '../../domain/services/GenieAiService.js';
import { config } from '../../config/index.js';

export class AiController {
  public static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { messages, context } = req.body as {
        messages?: ChatMessage[];
        context?: ChatContext;
      };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required',
        });
      }

      const responseText = await GenieAiService.chat(messages, context);

      return res.status(200).json({
        success: true,
        message: responseText,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const isConfigured = Boolean(config.groq.apiKey && config.groq.apiKey.length > 5);
      return res.status(200).json({
        success: true,
        configured: isConfigured,
        model: config.groq.model,
      });
    } catch (err) {
      next(err);
    }
  }
}
