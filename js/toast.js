let hideTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
