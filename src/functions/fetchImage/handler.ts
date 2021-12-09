import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/apiGateway";
import { formatJSONResponse } from "@libs/apiGateway";
import { middyfy } from "@libs/lambda";
import { S3 } from "aws-sdk";
import { v4 as uuid } from "uuid";
import Jimp from "jimp";

import schema from "./schema";

const BUCKET = "top100-lambda-images";
const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB
const UPLOAD_PATH = "thumbs";

const s3 = new S3();

const fetchImage: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  const url = event.body.url;
  const feed = event.body.feed;

  let buffer: Buffer;

  try {
    buffer = await Jimp.read(url)
      .then((image) => image.resize(400, Jimp.AUTO))
      .then((image) => image.quality(40))
      .then((image) => image.getBufferAsync(Jimp.MIME_JPEG));
  } catch (error) {
    console.log("Image processing error:", error);
    return formatJSONResponse(
      {
        success: false,
        errorCode: "fetch_failed",
      },
      500
    );
  }

  // Check file size
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return formatJSONResponse(
      {
        success: false,
        errorCode: "file_too_big",
      },
      400
    );
  }

  const key = `${UPLOAD_PATH}/${feed}/${uuid()}.jpg`;

  const result = await s3
    .putObject({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ACL: "public-read",
    })
    .promise();

  if (!result.ETag) {
    return formatJSONResponse(
      {
        success: false,
        errorCode: "image_saving_failed",
      },
      500
    );
  }

  return formatJSONResponse({ success: true, path: key });
};

export const main = middyfy(fetchImage);
