import {
  SHARE_IMAGE_ALT,
  SHARE_IMAGE_SIZE,
  SHARE_IMAGE_TYPE,
  causeyShareImage,
} from "@/lib/og/causey-share-image";

export const alt = SHARE_IMAGE_ALT;
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_IMAGE_TYPE;

export default async function OpenGraphImage() {
  return causeyShareImage();
}
