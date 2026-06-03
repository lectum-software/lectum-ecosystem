//Libs

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "@/config/multer/s3";

const action = async (fileName: string | null | object, dir: string, bucket: string) => {
  if (!fileName) return false;
  const key = `${dir}/${fileName}`;

  console.log(`KEY TO DELETE: ${key}`);

  try {
    await S3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return true;
  } catch (err: any) {
    console.error(`[BUCKET]: ${err?.message}`);
    return false;
  }
};

export const unlink = async (req: {
  medias: Record<string, any>;
  feature: string;
  bucket: string;
}) => {
  if (req?.medias) {
    const keys = Object.keys(req.medias);
    for (const media of keys) {
      const arrayOfMedias = req.medias[media];
      for (const fileName of arrayOfMedias || []) {
        //Skip em arquivos de terceiros
        if (fileName.startsWith("http")) continue;
        await action(fileName, `${req.feature}/${media}`, req.bucket);
      }
    }
  }
};
