import { useEffect, useState } from "react";

const COMPACT_PHONE_VIEWPORT_QUERY = "(max-width: 440px)";

function getCompactPhoneViewportMatch() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(COMPACT_PHONE_VIEWPORT_QUERY).matches;
}

export function useIsCompactPhoneViewport() {
  const [isCompactPhoneViewport, setIsCompactPhoneViewport] = useState(getCompactPhoneViewportMatch);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(COMPACT_PHONE_VIEWPORT_QUERY);
    const updateMatch = () => {
      setIsCompactPhoneViewport(mediaQueryList.matches);
    };

    updateMatch();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", updateMatch);

      return () => {
        mediaQueryList.removeEventListener("change", updateMatch);
      };
    }

    mediaQueryList.addListener(updateMatch);

    return () => {
      mediaQueryList.removeListener(updateMatch);
    };
  }, []);

  return isCompactPhoneViewport;
}