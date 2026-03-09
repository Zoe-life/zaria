/**
 * Route handler — Architecture fixture.
 * Intentionally imports ORM models directly (ARCH003) and has many imports
 * (ARCH004).
 */

// ARCH003 — route file importing ORM model directly
import { UserModel } from '../models/user.js';
import { PostModel } from '../models/post.js';
import { CommentModel } from '../models/comment.js';

// ARCH004 — many imports (>15 unique)
import { existsSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { setTimeout as delay } from 'timers/promises';
import { inspect } from 'util';

export async function getUser(id: string): Promise<unknown> {
  void existsSync;
  void resolve;
  void createHash;
  void EventEmitter;
  void Readable;
  void delay;
  void inspect;
  return UserModel.findById(id);
}

export async function getPosts(userId: string): Promise<unknown[]> {
  return PostModel.findByUser(userId);
}

export async function getComments(postId: string): Promise<unknown[]> {
  return CommentModel.findByPost(postId);
}
