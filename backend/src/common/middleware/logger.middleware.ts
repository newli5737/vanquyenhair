import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private formatVietnamTime(date: Date): string {
        // Format: DD/MM/YYYY HH:mm:ss (GMT+7)
        const vietnamOffset = 7 * 60; // GMT+7 in minutes
        const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
        const vietnamTime = new Date(utcTime + (vietnamOffset * 60000));

        const day = vietnamTime.getDate().toString().padStart(2, '0');
        const month = (vietnamTime.getMonth() + 1).toString().padStart(2, '0');
        const year = vietnamTime.getFullYear();
        const hours = vietnamTime.getHours().toString().padStart(2, '0');
        const minutes = vietnamTime.getMinutes().toString().padStart(2, '0');
        const seconds = vietnamTime.getSeconds().toString().padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }

    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();
        const { method, originalUrl, headers, body } = req;
        const origin = headers.origin || 'no-origin';
        const timestamp = this.formatVietnamTime(new Date());

        // Capture phone number for login/register requests
        let phoneInfo = '';
        if ((originalUrl.includes('/auth/login') || originalUrl.includes('/auth/register')) && body?.phone) {
            phoneInfo = ` | Phone: ${body.phone}`;
        }

        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const hasAccessToken = !!req.cookies?.['accessToken'];
            const hasRefreshToken = !!req.cookies?.['refreshToken'];

            // Detailed log format for login requests
            let logEntry = '';
            if (originalUrl.includes('/auth/login')) {
                const statusText = status === 200 || status === 201 ? 'SUCCESS' : 'FAILED';
                logEntry = `[${timestamp}] LOGIN ${statusText}${phoneInfo} | Status: ${status} | Duration: ${duration}ms | Origin: ${origin}\n`;
            } else if (originalUrl.includes('/auth/register')) {
                const statusText = status === 200 || status === 201 ? 'SUCCESS' : 'FAILED';
                logEntry = `[${timestamp}] REGISTER ${statusText}${phoneInfo} | Status: ${status} | Duration: ${duration}ms | Origin: ${origin}\n`;
            } else {
                // General log for other requests
                logEntry = `[${timestamp}] ${method} ${originalUrl} | Status: ${status} | Duration: ${duration}ms | Cookies: AT=${hasAccessToken}, RT=${hasRefreshToken}\n`;
            }

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
