import { Image, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { organizerCoverUrl } from "./cover-url";

export function EventCover({
  imageUrl,
  name,
}: {
  imageUrl: string | null | undefined;
  name: string;
}) {
  const src = organizerCoverUrl(imageUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src || failed) return null;
  return (
    <Image
      source={{ uri: src }}
      style={styles.cover}
      resizeMode="cover"
      accessibilityLabel={`Photo for ${name}`}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  cover: {
    marginTop: 16,
    width: "100%",
    aspectRatio: 2,
    borderRadius: 16,
    backgroundColor: "#eef3f7",
  },
});
