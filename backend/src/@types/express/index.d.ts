declare global {
  namespace Express {
    interface Request {
      p: any;
      q: any;
      b: any;
      auth: any;
      admin: any;
      medias: Record<string, string[]>;
      uploads: Record<string, string>;
      select: any;
      include: any;
      allowed: string[];
      uploadCacheControl?: string;
      uploadFeature?: string;
      feature: string;
      cookies: Record<string, string | undefined>;
      device: string;
      bucket: string;
      file_names: Record<string, string>;
    }

    namespace Multer {
      interface File {
        bucket?: string;
        fileUrl?: string;
        key?: string;
      }
    }
  }
}

export {};
