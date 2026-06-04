import { isInMobileBrowser } from '@tronweb3/tronwallet-abstract-adapter';

export function supportGateWallet() {
    return !!(window.gatewallet && window.gatewallet.tronLink);
}

export const isGateApp = typeof navigator !== 'undefined' && /GateApp/i.test(navigator.userAgent);
export function isInGateApp() {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        return /GateApp/i.test(window.navigator.userAgent);
    }
    return false;
}
export function openGateWallet() {
    if (!isInGateApp() && isInMobileBrowser()) {
        // NOTE: The original deeplink (commented out below) that carried `dapp_url` and
        // opened the current dapp inside Gate's in-app browser no longer works, and we
        // haven't been able to find an up-to-date replacement. The only deeplink we can
        // currently obtain just launches the Gate app itself — it does not navigate back
        // to the dapp. Update this once a working dapp-aware deeplink is available.
        window.location.href = 'https://gate.onelink.me/Hls0/web3';
        // window.location.href =
        //     'https://gateio.onelink.me/DmA6/web3?dapp_url=' + encodeURIComponent(window.location.href);
        return true;
    }
    return false;
}
