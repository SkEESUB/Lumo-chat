export const stringToHSL = (str) => {
  if (!str) return '200, 65%, 60%';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `${Math.abs(hash) % 360}, 80%, 70%`;
};
