import sharp from "sharp";

const PROFILE_IMAGE_SIZE = 200;
const JPEG_QUALITY = 85;

/**
 * Resize image to a resume-suitable square (200x200, center crop).
 * Output is always JPEG for small file size.
 */
export async function resizeProfileImage(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE, { fit: "cover", position: "center" })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
