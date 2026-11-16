import '@testing-library/jest-dom/vitest';
// jsdom lacks the native dialog methods. Chromium acceptance verifies real dialog/focus behavior.
if (typeof HTMLDialogElement !== 'undefined') {
HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open', '');};
HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
}
