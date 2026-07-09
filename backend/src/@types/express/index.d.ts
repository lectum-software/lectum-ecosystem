declare global {
  namespace Express {
    interface Request {
      p: any;
      q: any;
      b: any;
      auth: any;
      admin: any;
      medias: any;
      uploads: any;
      select: any;
      include: any;
      allowed: string[];
      public: boolean;
      feature: string;
      cookies: Record<string, string | undefined>;
      device: string;
      bucket: string;
      file_names: Record<string, string>;
    }
  }
}

export {};
