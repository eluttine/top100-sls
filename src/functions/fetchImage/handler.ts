import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/apiGateway";
import { formatJSONResponse } from "@libs/apiGateway";
import { middyfy } from "@libs/lambda";
import fetch, { Response } from "node-fetch";
import { S3 } from "aws-sdk";
import { v4 as uuid } from "uuid";
import { fromBuffer } from "file-type";

import schema from "./schema";

const BUCKET = "top100-lambda-images";
const MAX_FILE_SIZE = 1024 * 1024 * 12; // 12MB
const ALLOWED_TYPES = ["jpg", "png"];
const UPLOAD_PATH = "original/";

const s3 = new S3();

const fetchImage: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  let response: Response;

  try {
    response = await fetch(event.body.url);
  } catch (error) {
    console.log("ERROR", error);
    return formatJSONResponse(
      {
        success: false,
        errorCode: "fetch_failed",
      },
      500
    );
  }

  if (!response.ok) {
    console.log("fetch failed", response);
    return formatJSONResponse(
      {
        success: false,
        errorCode: "fetch_failed",
      },
      500
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  // Check file size
  if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
    return formatJSONResponse(
      {
        success: false,
        errorCode: "too_big",
      },
      400
    );
  }

  const fileType = await fromBuffer(arrayBuffer);

  // Check file type
  if (
    !fileType ||
    !fileType.mime.startsWith("image") ||
    !ALLOWED_TYPES.includes(fileType.ext)
  ) {
    console.log(`File type error ${fileType.mime} ${fileType.ext}`);
    return formatJSONResponse(
      {
        success: false,
        errorCode: "invalid_file_type",
      },
      400
    );
  }

  const key = `${UPLOAD_PATH}${uuid()}.${fileType.ext}`;

  const buffer = Buffer.from(arrayBuffer);

  const result = await s3
    .putObject({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
    })
    .promise();

  if (!result.ETag) {
    return formatJSONResponse(
      {
        success: false,
        errorCode: "saving_failed",
      },
      500
    );
  }

  return formatJSONResponse({ success: true, key });
};

export const main = middyfy(fetchImage);
