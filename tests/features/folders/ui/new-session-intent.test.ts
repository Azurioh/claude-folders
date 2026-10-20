import { ManualClock } from '@@/tests/features/folders/ui/test-doubles';
import { describe, expect, it } from 'vitest';
import {
  filingVerdict,
  followLocation,
  isIntentExpired,
  NEW_SESSION_INTENT_LIFETIME_MS,
  type NewSessionIntent,
  type PageLocation,
  rememberExistingChats,
  startNewSessionIntent,
} from '@/features/folders/ui/new-session-intent';

const PROJECT = '0f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const OTHER_PROJECT = 'a1111111-4b5a-4987-8a6b-5c4d3e2f1a0b';
const NEW_CHAT = 'b2222222-4b5a-4987-8a6b-5c4d3e2f1a0b';
const OTHER_CHAT = 'c3333333-4b5a-4987-8a6b-5c4d3e2f1a0b';
const LATER_LISTED_CHAT = 'd4444444-4b5a-4987-8a6b-5c4d3e2f1a0b';
const STARTING_CHAT = 'e5555555-4b5a-4987-8a6b-5c4d3e2f1a0b';

const PROJECT_PAGE: PageLocation = { projectId: PROJECT, chatId: null };
const OTHER_PROJECT_PAGE: PageLocation = { projectId: OTHER_PROJECT, chatId: null };
const NEW_CHAT_PAGE: PageLocation = { projectId: null, chatId: NEW_CHAT };
const OTHER_CHAT_PAGE: PageLocation = { projectId: null, chatId: OTHER_CHAT };
const HOME: PageLocation = { projectId: null, chatId: null };

function start(params: { location: PageLocation; clock: ManualClock }): NewSessionIntent {
  return startNewSessionIntent({
    projectId: PROJECT,
    folderId: 'work',
    location: params.location,
    knownChatIds: [OTHER_CHAT],
    now: params.clock.now(),
  });
}

function follow(params: {
  intent: NewSessionIntent | null;
  location: PageLocation;
  clock: ManualClock;
}): NewSessionIntent | null {
  const { intent, location, clock } = params;
  return intent === null ? null : followLocation({ intent, location, now: clock.now() });
}

describe('new session intent', () => {
  describe('startNewSessionIntent', () => {
    it('waits for the session right away on the project page', () => {
      const clock = new ManualClock();
      clock.advance(5);

      expect(start({ location: PROJECT_PAGE, clock })).toEqual({
        projectId: PROJECT,
        folderId: 'work',
        startedAt: 5,
        knownChatIds: new Set([OTHER_CHAT]),
        stage: { kind: 'project-page' },
      });
    });

    it('opens the project page from anywhere else', () => {
      const clock = new ManualClock();

      expect(start({ location: OTHER_CHAT_PAGE, clock }).stage).toEqual({ kind: 'opening' });
      expect(start({ location: OTHER_PROJECT_PAGE, clock }).stage).toEqual({ kind: 'opening' });
    });
  });

  describe('followLocation', () => {
    it('reaches the project page, then the new chat', () => {
      const clock = new ManualClock();
      const opened = follow({
        intent: start({ location: HOME, clock }),
        location: PROJECT_PAGE,
        clock,
      });

      expect(opened?.stage).toEqual({ kind: 'project-page' });
      expect(follow({ intent: opened, location: NEW_CHAT_PAGE, clock })?.stage).toEqual({
        kind: 'new-chat',
        chatId: NEW_CHAT,
      });
    });

    it('stays on the project page while its pathname changes within the project', () => {
      const clock = new ManualClock();
      const intent = start({ location: PROJECT_PAGE, clock });

      expect(follow({ intent, location: PROJECT_PAGE, clock })).toEqual(intent);
    });

    it('is cancelled when the opening lands anywhere but the project page', () => {
      const clock = new ManualClock();
      const intent = start({ location: HOME, clock });

      expect(follow({ intent, location: OTHER_PROJECT_PAGE, clock })).toBeNull();
      expect(follow({ intent, location: OTHER_CHAT_PAGE, clock })).toBeNull();
    });

    it('is cancelled when the project page is left for anything but a chat', () => {
      const clock = new ManualClock();
      const intent = start({ location: PROJECT_PAGE, clock });

      expect(follow({ intent, location: HOME, clock })).toBeNull();
      expect(follow({ intent, location: OTHER_PROJECT_PAGE, clock })).toBeNull();
    });

    it('is cancelled when the new chat is left', () => {
      const clock = new ManualClock();
      const onChat = follow({
        intent: start({ location: PROJECT_PAGE, clock }),
        location: NEW_CHAT_PAGE,
        clock,
      });

      expect(follow({ intent: onChat, location: NEW_CHAT_PAGE, clock })).toEqual(onChat);
      expect(follow({ intent: onChat, location: OTHER_CHAT_PAGE, clock })).toBeNull();
      expect(follow({ intent: onChat, location: PROJECT_PAGE, clock })).toBeNull();
    });

    it('is cancelled once expired', () => {
      const clock = new ManualClock();
      const intent = start({ location: HOME, clock });
      clock.advance(NEW_SESSION_INTENT_LIFETIME_MS);

      expect(follow({ intent, location: PROJECT_PAGE, clock })).toBeNull();
    });
  });

  describe('existing chats', () => {
    it('remembers the chats known when it starts, and the chat it starts on', () => {
      const clock = new ManualClock();
      const intent = start({ location: { projectId: null, chatId: STARTING_CHAT }, clock });

      expect([...intent.knownChatIds].sort()).toEqual([OTHER_CHAT, STARTING_CHAT].sort());
    });

    it('is cancelled, filing nothing, when the project page opens an existing chat', () => {
      const clock = new ManualClock();
      const intent = start({ location: PROJECT_PAGE, clock });

      expect(follow({ intent, location: OTHER_CHAT_PAGE, clock })).toBeNull();
    });

    it('is cancelled when going back to the chat it was started on', () => {
      const clock = new ManualClock();
      const starting: PageLocation = { projectId: null, chatId: STARTING_CHAT };
      const opened = follow({
        intent: start({ location: starting, clock }),
        location: PROJECT_PAGE,
        clock,
      });

      expect(follow({ intent: opened, location: starting, clock })).toBeNull();
    });

    it('also refuses the chats remembered once the project page opened', () => {
      const clock = new ManualClock();
      const opened = follow({
        intent: start({ location: HOME, clock }),
        location: PROJECT_PAGE,
        clock,
      });
      const remembered =
        opened === null
          ? null
          : rememberExistingChats({ intent: opened, chatIds: [LATER_LISTED_CHAT] });

      expect(
        follow({
          intent: remembered,
          location: { projectId: null, chatId: LATER_LISTED_CHAT },
          clock,
        }),
      ).toBeNull();
      expect(follow({ intent: remembered, location: NEW_CHAT_PAGE, clock })?.stage).toEqual({
        kind: 'new-chat',
        chatId: NEW_CHAT,
      });
    });
  });

  describe('isIntentExpired', () => {
    it('expires after 10 minutes', () => {
      const clock = new ManualClock();
      const intent = start({ location: PROJECT_PAGE, clock });

      clock.advance(NEW_SESSION_INTENT_LIFETIME_MS - 1);
      expect(isIntentExpired({ intent, now: clock.now() })).toBe(false);
      clock.advance(1);
      expect(isIntentExpired({ intent, now: clock.now() })).toBe(true);
      expect(NEW_SESSION_INTENT_LIFETIME_MS).toBe(600_000);
    });
  });

  describe('filingVerdict', () => {
    function onNewChat(clock: ManualClock): NewSessionIntent {
      const intent = follow({
        intent: start({ location: PROJECT_PAGE, clock }),
        location: NEW_CHAT_PAGE,
        clock,
      });
      if (intent === null) {
        throw new Error('The intent should have reached the new chat');
      }
      return intent;
    }

    it('files the new chat once the page shows it is in the project', () => {
      const clock = new ManualClock();

      expect(filingVerdict({ intent: onNewChat(clock), chatProjectId: PROJECT, now: 0 })).toEqual({
        kind: 'file',
        chatId: NEW_CHAT,
      });
    });

    it('waits while the page shows no project yet', () => {
      const clock = new ManualClock();

      expect(filingVerdict({ intent: onNewChat(clock), chatProjectId: null, now: 0 })).toEqual({
        kind: 'wait',
      });
    });

    it('is cancelled when the chat belongs to another project', () => {
      const clock = new ManualClock();

      expect(
        filingVerdict({ intent: onNewChat(clock), chatProjectId: OTHER_PROJECT, now: 0 }),
      ).toEqual({ kind: 'cancel' });
    });

    it('never files before a chat is reached', () => {
      const clock = new ManualClock();
      const intent = start({ location: PROJECT_PAGE, clock });

      expect(filingVerdict({ intent, chatProjectId: PROJECT, now: 0 })).toEqual({ kind: 'wait' });
    });

    it('is cancelled once expired', () => {
      const clock = new ManualClock();
      const intent = onNewChat(clock);

      expect(
        filingVerdict({ intent, chatProjectId: PROJECT, now: NEW_SESSION_INTENT_LIFETIME_MS }),
      ).toEqual({ kind: 'cancel' });
    });
  });
});
