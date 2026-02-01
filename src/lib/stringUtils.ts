/**
 * String manipulation utilities for code generation
 */

/**
 * Convert string to PascalCase (e.g., "blog-post" -> "BlogPost")
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/[\s-_]+/g, '');
}

/**
 * Convert string to camelCase (e.g., "blog-post" -> "blogPost")
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert string to kebab-case (e.g., "BlogPost" -> "blog-post")
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case (e.g., "BlogPost" -> "blog_post")
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert string to UPPER_SNAKE_CASE (e.g., "BlogPost" -> "BLOG_POST")
 */
export function toUpperSnakeCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

// Re-export pluralize from npm package for better handling of irregular plurals
export { default as pluralize } from 'pluralize';
