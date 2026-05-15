export function smileMessage(name = "Smile Project"): string {
  return `${name} is running on Bun.`;
}

if (import.meta.main) {
  console.log(smileMessage());
}
