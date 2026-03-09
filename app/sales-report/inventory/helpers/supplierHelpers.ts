export const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export const avatarPalette = (name: string): [string, string] => {
  const options: [string, string][] = [
    ['#0b5858', '#d0ecec'],
    ['#1d4ed8', '#dbeafe'],
    ['#15803d', '#dcfce7'],
    ['#b45309', '#fef3c7'],
    ['#7c3aed', '#ede9fe'],
  ];

  return options[name.charCodeAt(0) % options.length];
};
