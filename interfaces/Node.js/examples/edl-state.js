// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause

// Usage:
//   node examples/edl-state.js primary
//   node examples/edl-state.js secondary
//   node examples/edl-state.js both
//   node examples/edl-state.js primary set
//   node examples/edl-state.js primary clear

const QTAC = require('./qtac-native');

const mode = process.argv[2] || 'both';
const action = process.argv[3] || 'get';
if (!['primary', 'secondary', 'both'].includes(mode) || !['get', 'set', 'clear'].includes(action)) {
    console.error('Usage: node examples/edl-state.js <primary|secondary|both> [get|set|clear]');
    process.exit(1);
}

try {
    const devices = QTAC.listDevices();
    if (devices.length === 0) {
        throw new Error('No devices found.');
    }

    const device = QTAC.openDevice(devices[0].port);
    try {
        const state = action === 'set';
        if (mode === 'primary' || mode === 'both') {
            if (action !== 'get') device.setPrimaryEDL(state);
            console.log(`Primary EDL (pedl) state: ${device.getCommandState('pedl')}`);
        }
        if (mode === 'secondary' || mode === 'both') {
            if (action !== 'get') device.setSecondaryEDL(state);
            console.log(`Secondary EDL (sedl) state: ${device.getCommandState('sedl')}`);
        }
    } finally {
        device.close();
    }
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
}
