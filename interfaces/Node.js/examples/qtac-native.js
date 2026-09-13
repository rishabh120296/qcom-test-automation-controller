// Load the native module produced by `npm run build:native` directly.
// This keeps the examples runnable before the TypeScript wrapper is compiled.
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '../../..');
const runtimeBin = path.join(repositoryRoot, '__Builds', 'ARM64', 'Release', 'bin');
const qtBin = process.env.QTBIN;

// qtac.node links against Qt and TACDev runtime DLLs. `build.bat` adds these
// directories only to its own process, so add the deployed runtime directory
// here before Node attempts to load the native module.
const dependencyPaths = [runtimeBin];
if (qtBin) dependencyPaths.unshift(qtBin);
process.env.PATH = dependencyPaths.concat(process.env.PATH || []).join(path.delimiter);

if (!require('fs').existsSync(runtimeBin)) {
    throw new Error(`TACDev runtime directory was not found: ${runtimeBin}. Run build.bat first.`);
}

const native = require(path.resolve(__dirname, '../build/Release/qtac.node'));
const TACDevice = native.TACDevice;

TACDevice.InitializeTACDev();

class Device {
    constructor(nativeDevice) {
        this.nativeDevice = nativeDevice;
    }

    close() { this.nativeDevice.close(); }
    getHandle() { return this.nativeDevice.getHandle(); }
    getName() { return this.nativeDevice.getName(); }
    getFirmwareVersion() { return this.nativeDevice.getFirmwareVersion(); }
    getHardware() { return this.nativeDevice.getHardware(); }
    getHardwareVersion() { return this.nativeDevice.getHardwareVersion(); }
    getUUID() { return this.nativeDevice.getUUID(); }
    getResetCount() { return this.nativeDevice.getResetCount(); }
    clearResetCount() { return this.nativeDevice.clearResetCount(); }

    setBatteryState(value) { return this.nativeDevice.setBatteryState(value); }
    getBatteryState() { return this.nativeDevice.getBatteryState(); }
    setUsb0(value) { return this.nativeDevice.setUsb0(value); }
    getUsb0State() { return this.nativeDevice.getUsb0State(); }
    setUsb1(value) { return this.nativeDevice.setUsb1(value); }
    getUsb1State() { return this.nativeDevice.getUsb1State(); }
    setPowerKey(value) { return this.nativeDevice.setPowerKey(value); }
    getPowerKeyState() { return this.nativeDevice.getPowerKeyState(); }
    setVolumeUp(value) { return this.nativeDevice.setVolumeUp(value); }
    getVolumeUpState() { return this.nativeDevice.getVolumeUpState(); }
    setVolumeDown(value) { return this.nativeDevice.setVolumeDown(value); }
    getVolumeDownState() { return this.nativeDevice.getVolumeDownState(); }
    setPrimaryEDL(value) { return this.nativeDevice.setPrimaryEDL(value); }
    getPrimaryEDLState() { return this.nativeDevice.getPrimaryEDLState(); }
    setSecondaryEDL(value) { return this.nativeDevice.setSecondaryEDL(value); }
    getSecondaryEDLState() { return this.nativeDevice.getSecondaryEDLState(); }

    getCommandCount() { return this.nativeDevice.getCommandCount(); }
    getCommand(index) { return this.nativeDevice.getCommand(index); }
    getAllCommands() {
        return Array.from({ length: this.getCommandCount() }, (_, index) => this.getCommand(index));
    }
    getCommandState(command) { return this.nativeDevice.getCommandState(command); }
    sendCommand(command, state) { return this.nativeDevice.sendCommand(command, state); }

    getQuickCommandCount() { return this.nativeDevice.getQuickCommandCount(); }
    getQuickCommand(index) { return this.nativeDevice.getQuickCommand(index); }
    powerOnButton() { return this.nativeDevice.powerOnButton(); }
    powerOffButton() { return this.nativeDevice.powerOffButton(); }
    bootToFastBootButton() { return this.nativeDevice.bootToFastBootButton(); }
    bootToUEFIMenuButton() { return this.nativeDevice.bootToUEFIMenuButton(); }
    bootToEDLButton() { return this.nativeDevice.bootToEDLButton(); }
    bootToSecondaryEDLButton() { return this.nativeDevice.bootToSecondaryEDLButton(); }
    powerOn() { return this.powerOnButton(); }
    powerOff() { return this.powerOffButton(); }
    bootToFastboot() { return this.bootToFastBootButton(); }
    bootToUEFI() { return this.bootToUEFIMenuButton(); }
    bootToEDL() { return this.bootToEDLButton(); }
    bootToSecondaryEDL() { return this.bootToSecondaryEDLButton(); }

    getScriptVariableCount() { return this.nativeDevice.getScriptVariableCount(); }
    getScriptVariable(index) { return this.nativeDevice.getScriptVariable(index); }
    updateScriptVariable(variable, value) {
        return this.nativeDevice.updateScriptVariableValue(variable, value);
    }
    isCommandQueueClear() { return this.nativeDevice.isCommandQueueClear(); }
}

const QTAC = {
    getVersion: () => TACDevice.GetAlpacaVersion(),
    getTACVersion: () => TACDevice.GetTACVersion(),
    getDeviceCount: () => TACDevice.GetDeviceCount(),
    listDevices: () => Array.from({ length: TACDevice.GetDeviceCount() }, (_, index) =>
        TACDevice.GetPortData(index)),
    openDevice: port => new Device(TACDevice.OpenHandleByDescription(port)),
};

module.exports = QTAC;
module.exports.native = native;
