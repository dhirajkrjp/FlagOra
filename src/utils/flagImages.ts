import { Image } from "expo-image";

export async function preloadFlagImages(urls: string[]): Promise<boolean> {
  const uniqueUrls = [...new Set(urls)];
  if (uniqueUrls.length === 0) return true;

  try {
    const success = await Image.prefetch(uniqueUrls, "memory-disk");
    if (!success) {
      console.warn(
        "Some flag images could not be preloaded and will load on demand.",
      );
    }
    return success;
  } catch (error) {
    console.warn("Flag image preloading failed; flags will load on demand.", error);
    return false;
  }
}
