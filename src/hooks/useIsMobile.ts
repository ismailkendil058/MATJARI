import { useEffect, useState } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";

export function useIsMobile() {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
