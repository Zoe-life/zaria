/** Circular dependency fixture — module A imports from module B. */
import { valueB } from './circular-b.js';

export const valueA = `A uses ${valueB}`;
