import assert from 'node:assert/strict';

import {
  formatBytes,
  formatMinutes,
  formatTemp,
  isBusyState,
  isGcode3mfFile,
  isMappingError,
  isValidFilamentMap,
  stateTone,
} from '../lib/print3d';

assert.equal(isGcode3mfFile({ name: 'cube.gcode.3mf' }), true);
assert.equal(isGcode3mfFile({ name: 'CUBE.GCODE.3MF' }), true);
assert.equal(isGcode3mfFile({ name: 'cube.3mf' }), false);
assert.equal(isGcode3mfFile({ name: 'cube.gcode.3mf.zip' }), false);

assert.equal(isValidFilamentMap('1'), true);
assert.equal(isValidFilamentMap('1,3'), true);
assert.equal(isValidFilamentMap('ext'), true);
assert.equal(isValidFilamentMap('1, ext'), false);
assert.equal(isValidFilamentMap(''), false);
assert.equal(isValidFilamentMap('1,'), false);
assert.equal(isValidFilamentMap('1'.repeat(65)), false);

assert.equal(formatBytes(512), '1 KB');
assert.equal(formatBytes(2_048), '2 KB');
assert.equal(formatBytes(25 * 1024 * 1024), '25.0 MB');

assert.equal(formatMinutes(null), '—');
assert.equal(formatMinutes(0), '—');
assert.equal(formatMinutes(45), '45m');
assert.equal(formatMinutes(125), '2h 5m');

assert.equal(formatTemp(null, null), '—');
assert.equal(formatTemp(24.6, 0), '25°C');
assert.equal(formatTemp(24.6, 60), '25°C → 60°C');

assert.equal(stateTone('RUNNING'), 'blue');
assert.equal(stateTone('PAUSE'), 'amber');
assert.equal(stateTone('FAILED'), 'red');
assert.equal(stateTone('FINISH'), 'green');
assert.equal(stateTone('IDLE'), 'neutral');
assert.equal(stateTone(undefined), 'neutral');

assert.equal(isBusyState('RUNNING'), true);
assert.equal(isBusyState('PAUSE'), true);
assert.equal(isBusyState('IDLE'), false);
assert.equal(isBusyState('FINISH'), false);

assert.equal(
  isMappingError({
    needsMapping: true,
    error: 'mapping required',
    filaments: [{ id: 1, type: 'PLA', color: '#FFFFFF' }],
    slots: [],
  }),
  true,
);
assert.equal(isMappingError({ error: 'nope' }), false);
assert.equal(isMappingError(null), false);

console.log('PASS: 3D print helpers');
