import assert from 'node:assert/strict';

import {
  formatBytes,
  isSupportedPrintFile,
  isValidPageRange,
  printerInfo,
  printerName,
  printerState,
} from '../lib/print';
import type { PrintStatus } from '../lib/types';

assert.equal(isValidPageRange('1'), true);
assert.equal(isValidPageRange('1-3,5'), true);
assert.equal(isValidPageRange('2,4-6'), true);
assert.equal(isValidPageRange(''), false);
assert.equal(isValidPageRange('3-1'), true);
assert.equal(isValidPageRange('1-3,'), false);
assert.equal(isValidPageRange('abc'), false);
assert.equal(isValidPageRange('1 - 3'), false);

assert.equal(isSupportedPrintFile({ name: 'notes.pdf', type: 'application/pdf' }), true);
assert.equal(isSupportedPrintFile({ name: 'photo.PNG', type: '' }), true);
assert.equal(isSupportedPrintFile({ name: 'scan', type: 'image/jpeg' }), true);
assert.equal(isSupportedPrintFile({ name: 'readme.txt', type: 'text/plain' }), true);
assert.equal(
  isSupportedPrintFile({ name: 'archive.zip', type: 'application/zip' }),
  false,
);
assert.equal(isSupportedPrintFile({ name: 'script.exe', type: 'text/plain' }), true);

assert.equal(formatBytes(512), '1 KB');
assert.equal(formatBytes(2_048), '2 KB');
assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB');

const status: PrintStatus = {
  ok: true,
  printer: { name: 'Brother_MFC-7360N', state: 'idle', message: 'printer is idle' },
  jobs: [{ id: 'Brother_MFC-7360N-12', owner: 'caleb', size: '1024' }],
};

assert.equal(printerName(status), 'Brother_MFC-7360N');
assert.equal(printerState(status), 'idle');
assert.equal(printerInfo(status)?.message, 'printer is idle');

assert.equal(printerName(undefined), 'the lounge printer');
assert.equal(printerState(undefined), 'unknown');
assert.equal(printerInfo(undefined), undefined);

console.log('PASS: print helpers');
