import assert from 'node:assert/strict';

import {
  formatTime,
  getCurrentEntry,
  getQueueEntry,
  getUpcomingQueue,
  isIdle,
  progressPercent,
  upcomingCount,
} from '../lib/player';
import { isOfficer, normalizeRole, roleLabel } from '../lib/roles';
import type { PlayerStatus } from '../lib/types';

const status: PlayerStatus = {
  ok: true,
  idle: false,
  paused: false,
  playing: true,
  title: 'Current song',
  volume: 42,
  mute: false,
  position: 65,
  duration: 180,
  queuePosition: 1,
  queueCount: 5,
  queue: [
    { id: 1, title: 'Played song' },
    { id: 2, title: 'Current song', current: true },
    { id: 3, title: 'Next song' },
    { id: 4, title: 'Third song' },
    { id: 5, title: 'Fourth song' },
  ],
};

const spotifyStatus: PlayerStatus = {
  ok: true,
  idle: false,
  paused: false,
  playing: true,
  title: 'Spotify song',
  artist: 'Spotify artist',
  album: 'Spotify album',
  source: 'spotify',
  queuePosition: 0,
  queueCount: 2,
  queue: [
    { id: null, title: 'Spotify song', artist: 'Spotify artist', current: true },
    { id: null, title: 'Next Spotify song', artist: 'Another artist' },
  ],
};

assert.equal(formatTime(0), '0:00');
assert.equal(formatTime(65), '1:05');
assert.equal(formatTime(3_661), '61:01');
assert.equal(formatTime(undefined), '0:00');

assert.equal(getCurrentEntry(status)?.title, 'Current song');
assert.deepEqual(
  getUpcomingQueue(status).map((entry) => entry.title),
  ['Next song', 'Third song', 'Fourth song'],
);
assert.equal(getQueueEntry(status, 1)?.title, 'Next song');
assert.equal(getQueueEntry(status, 3)?.title, 'Fourth song');
assert.equal(getQueueEntry(status, 4), undefined);
assert.equal(upcomingCount(status), 3);
assert.equal(Math.round(progressPercent(status)), 36);

assert.equal(getCurrentEntry(spotifyStatus)?.title, 'Spotify song');
assert.deepEqual(
  getUpcomingQueue(spotifyStatus).map((entry) => entry.title),
  ['Next Spotify song'],
);
assert.equal(upcomingCount(spotifyStatus), 1);
assert.equal(isIdle({ ...spotifyStatus, playing: false, paused: true }), false);

assert.equal(isIdle(undefined), true);
assert.equal(isIdle({ ok: true, idle: true }), true);
assert.equal(isIdle({ ok: true, idle: false, playing: true }), false);

assert.equal(normalizeRole('admin'), 'admin');
assert.equal(normalizeRole('officer'), 'officer');
assert.equal(normalizeRole('member'), 'member');
assert.equal(normalizeRole('something-else'), 'member');
assert.equal(roleLabel('admin'), 'Admin');
assert.equal(roleLabel('officer'), 'Officer');
assert.equal(roleLabel('member'), 'Member');
assert.equal(
  isOfficer({
    sub: '1',
    email: 'a@tamu.edu',
    name: 'A',
    role: 'officer',
    emailVerified: true,
  }),
  true,
);
assert.equal(
  isOfficer({
    sub: '1',
    email: 'a@tamu.edu',
    name: 'A',
    role: 'member',
    emailVerified: true,
  }),
  false,
);
assert.equal(isOfficer(null), false);

console.log('PASS: player and role helpers');
