export function displayName(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || email;
}

export function avatarLabel(name: string): string {
  const chars = Array.from(name.trim());
  if (chars.length === 0) return "?";
  if (chars.length === 1) return chars[0];
  return chars.slice(-2).join("");
}
