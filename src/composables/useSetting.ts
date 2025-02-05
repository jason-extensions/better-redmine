import { useStorage } from "./useStorage";

export function useSetting() {
  const { data: siteUrl } = useStorage({
    key: "site-url",
    defaultValue: "https://redmine.twjoin.com",
  });

  return {
    siteUrl,
  };
}
