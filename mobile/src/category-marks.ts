import type { ImageSourcePropType } from "react-native";
import type { DiscoveryCategoryId } from "./categories";

/**
 * Same 512² directory marks the website hero picker uses
 * (`public/category-marks/`). Bundled so Expo does not fetch the site.
 */
export const CATEGORY_MARKS: Record<DiscoveryCategoryId, ImageSourcePropType> = {
  chess: require("../assets/categories/chess.png"),
  debate: require("../assets/categories/debate.png"),
  stem: require("../assets/categories/stem.png"),
  arts: require("../assets/categories/arts.png"),
  writing: require("../assets/categories/writing.png"),
};
