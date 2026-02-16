import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const validateFileType: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => void;
export declare const validateFileSize: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const uploadConfig: multer.Multer;
export declare const sanitizeFilename: (filename: string) => string;
export declare const validateFilename: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateImageDimensions: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const handleUploadError: (err: Error, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const ocrTimeout: (timeoutMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const preventConcurrentOCR: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=upload.d.ts.map