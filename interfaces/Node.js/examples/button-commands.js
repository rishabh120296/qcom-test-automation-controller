// Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
// SPDX-License-Identifier: BSD-3-Clause

// Run exactly one state-changing button command per invocation:
//   node examples/button-commands.js powerOn
//   node examples/button-commands.js powerOff
//   node examples/button-commands.js bootToEDL
//   node examples/button-commands.js bootToSecondaryEDL
//   node examples/button-commands.js normal

const QTAC = require('./qtac-native');

const commands = {
    powerOn: {
        label: 'setBatteryState(true) -> delay 900ms -> setBatteryState(false)',
        invoke: async device => {
            const currentState = device.getBatteryState();
            console.log(`Current battery state: ${currentState}`);
            device.setBatteryState(true);
            await new Promise(resolve => setTimeout(resolve, 900));
            device.setBatteryState(false);
        },
    },
    powerOff: {
        label: 'setBatteryState(true)',
        invoke: device => {
            const currentState = device.getBatteryState();
            console.log(`Current battery state: ${currentState}`);
            if (!currentState) {
                device.setBatteryState(true);
            }
        },
    },
    bootToEDL: {
        label: 'direct primary EDL pin sequence',
        invoke: device => runEdlSequence(device, false),
    },
    bootToSecondaryEDL: {
        label: 'direct secondary EDL pin sequence',
        invoke: device => runEdlSequence(device, true),
    },
    normal: {
        label: 'clear pedl and sedl, then power cycle',
        invoke: async device => {
            device.setPrimaryEDL(false);
            device.setSecondaryEDL(false);
            console.log(`pedl state: ${device.getCommandState('pedl')}`);
            console.log(`sedl state: ${device.getCommandState('sedl')}`);

            console.log('Power cycling device...');
            device.setBatteryState(true);
            await new Promise(resolve => setTimeout(resolve, 2000));
            device.setBatteryState(false);
            console.log(`Battery state after power cycle: ${device.getBatteryState()}`);
        },
    },
};

async function waitForCommandQueue(device, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    await new Promise(resolve => setTimeout(resolve, 100));

    while (Date.now() < deadline) {
        try {
            if (device.isCommandQueueClear()) return;
        } catch (error) {
            // Power-off/EDL may make the device inactive while the sequence
            // is completing. That is expected after the command was queued.
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timed out waiting for the command sequence to complete');
}

function ensureEdlVariable(device) {
    const variables = Array.from(
        { length: device.getScriptVariableCount() },
        (_, index) => device.getScriptVariable(index),
    );
    console.log(`Script variables (${variables.length}):`);
    variables.forEach(variable => console.log(`  ${variable}`));

    const edlVariable = variables.find(variable => variable.split(';')[0] === 'edl');
    if (!edlVariable) {
        console.log('edl variable is missing; attempting to set edl to 2000.');
        device.updateScriptVariable('edl', '2000');
        return;
    }

    const currentValue = edlVariable.split(';')[4];
    if (currentValue !== '2000') {
        console.log(`Updating edl from ${currentValue} to 2000.`);
        device.updateScriptVariable('edl', '2000');
    } else {
        console.log('edl is already set to 2000.');
    }
}

async function runEdlSequence(device, secondary) {
    // Matches the PIC32CX Automotive configuration:
    // primary:   sedl 0, uefi 0, battery 1, pedl 1, delay 900,
    //            battery 0, delay $edl, pedl 0
    // secondary: pedl 0, uefi 0, battery 1, sedl 1, delay 900,
    //            battery 0, delay $edl, sedl 0
    device.sendCommand('uefi', false);
    if (secondary) {
        device.setPrimaryEDL(false);
    } else {
        device.setSecondaryEDL(false);
    }

    device.setBatteryState(true);
    if (secondary) {
        device.setSecondaryEDL(true);
    } else {
        device.setPrimaryEDL(true);
    }

    await new Promise(resolve => setTimeout(resolve, 900));
    device.setBatteryState(false);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (secondary) {
        device.setSecondaryEDL(false);
    } else {
        device.setPrimaryEDL(false);
    }
}

async function main() {
    const commandName = process.argv[2];
    const command = commands[commandName];

    if (!command) {
        console.error('Usage: node examples/button-commands.js <command>');
        console.error(`Commands: ${Object.keys(commands).join(', ')}`);
        process.exitCode = 1;
        return;
    }

    const devices = QTAC.listDevices();
    if (devices.length === 0) {
        console.error('No devices found.');
        process.exitCode = 1;
        return;
    }

    console.log(`QTAC version: ${QTAC.getVersion()}`);
    console.log(`TAC version:  ${QTAC.getTACVersion()}`);
    console.log(`Devices found: ${devices.length}`);
    devices.forEach((deviceInfo, index) => {
        console.log(`  ${index}: ${deviceInfo.description} (${deviceInfo.port})`);
    });

    const device = QTAC.openDevice(devices[0].port);
    try {
        console.log('\nSelected device:');
        console.log(`  Name:            ${device.getName()}`);
        console.log(`  Firmware:        ${device.getFirmwareVersion()}`);
        console.log(`  Hardware:        ${device.getHardware()}`);
        console.log(`  Hardware version: ${device.getHardwareVersion()}`);
        console.log(`  UUID:             ${device.getUUID()}`);
        console.log(`  pedl state:       ${device.getCommandState('pedl')}`);
        console.log(`  sedl state:       ${device.getCommandState('sedl')}`);

        const quickCommands = Array.from(
            { length: device.getQuickCommandCount() },
            (_, index) => device.getQuickCommand(index),
        );
        console.log(`\nQuick commands (${quickCommands.length}):`);
        quickCommands.forEach(commandName => console.log(`  ${commandName}`));

        const scriptCommands = device.getAllCommands();
        console.log(`Script commands (${scriptCommands.length}):`);
        scriptCommands.forEach(command => {
            console.log(`  ${command.command}`);
        });

        const availableQuickCommandNames = quickCommands.map(entry => entry.split(';')[1]);
        const availableScriptCommandNames = scriptCommands.map(command => command.command);
        if (commandName === 'bootToEDL' || commandName === 'bootToSecondaryEDL') {
            ensureEdlVariable(device);
        }
        if ((commandName === 'powerOn' || commandName === 'powerOff') &&
            !availableScriptCommandNames.includes('battery')) {
            throw new Error('battery is not available for the selected device configuration');
        }
        if (commandName !== 'powerOn' && commandName !== 'powerOff' && commandName !== 'normal' &&
            !availableQuickCommandNames.includes(commandName)) {
            throw new Error(`${commandName} is not available for the selected device configuration`);
        }

        console.log();
        if (commandName === 'powerOn' || commandName === 'powerOff') {
            const targetState = commandName === 'powerOn' ? 'false' : 'true';
            console.log(`Battery state before setBatteryState(${targetState}): ${device.getBatteryState()}`);
        }
        console.log(`Calling ${command.label} on ${devices[0].description}...`);
        await command.invoke(device);
        await waitForCommandQueue(device);
        console.log(`${command.label} completed.`);
        if (commandName === 'powerOn' || commandName === 'powerOff') {
            try {
                const targetState = commandName === 'powerOn' ? 'false' : 'true';
                console.log(`Battery state after setBatteryState(${targetState}):  ${device.getBatteryState()}`);
            } catch (error) {
                console.log(`Could not read battery state after power-off: ${error.message}`);
            }
        }
    } finally {
        device.close();
    }
}

try {
    main().catch(error => {
        console.error(`Error: ${error.message}`);
        process.exitCode = 1;
    });
} catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
}
