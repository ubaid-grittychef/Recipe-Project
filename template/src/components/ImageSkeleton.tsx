"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Drop-in replacement for next/image with a shimmer skeleton while loading.
 * When the image loads, the skeleton fades out and the image fades in.
 */
export default function ImageSkeleton({
  className = "",
  ...props
}: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-shimmer" aria-hidden="true" />
      )}
      <Image
        {...props}
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
