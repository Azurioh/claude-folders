// @vitest-environment happy-dom

import { el } from '@@/tests/shared/claude-dom/fixtures';
import { describe, expect, it } from 'vitest';
import {
  chatIdOf,
  currentChatId,
  currentProjectId,
  projectIdOf,
} from '@/shared/claude-dom/claude-ids';

const ID = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const UPPER_ID = ID.toUpperCase();

function anchor(href: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.setAttribute('href', href);
  return link;
}

describe('chatIdOf', () => {
  it('reads the id of a relative chat link', () => {
    expect(chatIdOf(anchor(`/chat/${ID}`))).toBe(ID);
  });

  it('reads the id of an absolute chat link with a query', () => {
    expect(chatIdOf(anchor(`https://claude.ai/chat/${ID}?ref=x`))).toBe(ID);
  });

  it('lowercases uppercase ids', () => {
    expect(chatIdOf(anchor(`/chat/${UPPER_ID}`))).toBe(ID);
  });

  it('is null for a non-UUID chat href', () => {
    expect(chatIdOf(anchor('/chat/new'))).toBeNull();
  });

  it('is null for an id followed by more id characters', () => {
    expect(chatIdOf(anchor(`/chat/${ID}abc`))).toBeNull();
  });

  it('is null for a project link', () => {
    expect(chatIdOf(anchor(`/project/${ID}`))).toBeNull();
  });

  it('is null for a link without href', () => {
    expect(chatIdOf(el({ tag: 'a' }))).toBeNull();
  });
});

describe('projectIdOf', () => {
  it('reads and lowercases the id of a project link', () => {
    expect(projectIdOf(anchor(`/project/${UPPER_ID}`))).toBe(ID);
  });

  it('is null for a non-UUID project href', () => {
    expect(projectIdOf(anchor('/projects'))).toBeNull();
  });

  it('is null for a chat link', () => {
    expect(projectIdOf(anchor(`/chat/${ID}`))).toBeNull();
  });
});

describe('currentChatId', () => {
  it('reads the conversation of a chat pathname', () => {
    expect(currentChatId(`/chat/${UPPER_ID}`)).toBe(ID);
  });

  it('is null on a project pathname', () => {
    expect(currentChatId(`/project/${ID}`)).toBeNull();
  });

  it('is null when the chat segment is not at the start', () => {
    expect(currentChatId(`/share/chat/${ID}`)).toBeNull();
  });

  it('is null for a non-UUID chat pathname', () => {
    expect(currentChatId('/chat/new')).toBeNull();
  });
});

describe('currentProjectId', () => {
  it('reads the project of a project pathname', () => {
    expect(currentProjectId(`/project/${UPPER_ID}`)).toBe(ID);
  });

  it('accepts a trailing segment', () => {
    expect(currentProjectId(`/project/${ID}/settings`)).toBe(ID);
  });

  it('is null on a chat pathname', () => {
    expect(currentProjectId(`/chat/${ID}`)).toBeNull();
  });

  it('is null on the projects index', () => {
    expect(currentProjectId('/projects')).toBeNull();
  });
});
