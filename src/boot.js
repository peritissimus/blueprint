// Keep the static loading screen visible while modules and the initial scene load.
const shell = document.querySelector('.app');
const loading = document.getElementById('appLoading');
const retry = document.getElementById('loadingRetry');
retry.addEventListener('click', () => location.reload());
function failed() {
  document.getElementById('loadingTitle').textContent = 'Your home could not open';
  document.getElementById('loadingMessage').textContent = 'Try reloading the workspace. Your saved arrangements are still on this device.';
  retry.hidden = false;
}
// Offer recovery for a stalled network without pretending startup has finished.
const stalled = setTimeout(() => {
  document.getElementById('loadingMessage').textContent = 'This is taking longer than usual. You can keep waiting or try again.';
  retry.hidden = false;
}, 15000);
async function start() {
  try {
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    await import('./main.js');
    // main renders its first scene synchronously; allow that frame to reach the screen.
    await new Promise(resolve => requestAnimationFrame(resolve));
    shell.inert = false;
    shell.removeAttribute('aria-busy');
    document.body.classList.remove('booting');
    loading.hidden = true;
  } catch (error) {
    console.error('Workspace startup failed', error);
    failed();
  } finally {
    clearTimeout(stalled);
  }
}
start();
