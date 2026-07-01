import { getDeepLink } from '@binance/w3w-utils';
import { isInBrowser, isInMobileBrowser } from '@tronweb3/tronwallet-abstract-adapter';

export function supportBinanceWallet() {
    return isInBrowser() && Boolean(window.isBinance);
}

export function openBinanceWallet() {
    if (isInMobileBrowser() && !supportBinanceWallet()) {
        // Use the universal-link variant (`.http`) rather than the `bnc://` custom scheme:
        // the custom scheme opens the Binance app but drops the embedded dApp URL on some mobile
        // browsers/OSes, so the app lands on its home instead of the dApp. The universal link
        // carries the URL reliably, and gracefully falls back to the download page when the
        // Binance app is not installed (the custom scheme just no-ops in that case).
        window.location.href = getDeepLink(window.location.href).http;
        return true;
    }
    return false;
}
