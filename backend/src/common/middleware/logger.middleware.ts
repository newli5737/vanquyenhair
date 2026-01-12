import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();
        const { method, originalUrl, headers } = req;
        const origin = headers.origin || 'no-origin';
        const timestamp = new Date().toISOString();

        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const hasAccessToken = !!req.cookies?.['accessToken'];
            const hasRefreshToken = !!req.cookies?.['refreshToken'];

            const logEntry = `[${timestamp}] ${method} ${originalUrl} ${status} (${duration}ms) | Origin: ${origin} | Cookies: AT=${hasAccessToken}, RT=${hasRefreshToken}\n`;

            console.log(logEntry.trim());

            // Append to file - Relative path
            const logFilePath = path.join(process.cwd(), 'log.txt');
            try {
                fs.appendFileSync(logFilePath, logEntry);
            } catch (err) {
                console.error('Failed to write to log.txt', err);
            }
        });

        next();
    }
}
