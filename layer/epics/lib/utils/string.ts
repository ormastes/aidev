// String utility functions

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function reverse(str) {
  return str.split('').reverse().join('');
}

function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

function truncate(str, length, suffix = '...') {
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
}

function countWords(str) {
  if (!str || !str.trim()) return 0;
  return str.trim().split(/\s+/).length;
}

function toSnakeCase(str) {
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .filter(word => word.length > 0)
    .join('_');
}

function toCamelCase(str) {
  const words = str.replace(/[_-]/g, ' ').split(/\s+/);
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

function removeWhitespace(str) {
  return str.replace(/\s/g, '');
}

function extractNumbers(str) {
  const matches = str.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function replaceAll(str, search, replace) {
  return str.split(search).join(replace);
}

export {
  capitalize,
  reverse,
  isPalindrome,
  truncate,
  countWords,
  toSnakeCase,
  toCamelCase,
  removeWhitespace,
  extractNumbers,
  replaceAll
};