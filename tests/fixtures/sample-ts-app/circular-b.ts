/** Circular dependency fixture — module B imports from module A. */
import { valueA } from './circular-a.js';

export const valueB = `B uses ${valueA}`;
