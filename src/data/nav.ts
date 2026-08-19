export interface NavItem {
  label: string;
  path: string;
}

export const AI_FRIEND_PATH = "/build-your-ai-friend";

export const NAV_ITEMS: NavItem[] = [
  { label: "Welcome", path: "/" },
  { label: "Questions", path: "/questions" },
  { label: "Tell Me About You", path: "/tell-me-about-you" },
  { label: "Build Your AI Friend", path: AI_FRIEND_PATH },
];
