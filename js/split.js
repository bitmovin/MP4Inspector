/** @type HTMLDivElement */
const split = document.getElementById('resize-divider');
/** @type HTMLDivElement */
const requestTab = document.getElementById('requestList');
/** @type HTMLDivElement */
const detailsTab = document.getElementById('detailView');

const minWidth = 150;

function resizeComponents(newDetailWidth) {
  const containerWidth = requestTab.parentElement.clientWidth;
  const newRequestWidth = Math.max(newDetailWidth, minWidth);
  const newDetailsWidth = containerWidth - newRequestWidth - 2;
  requestTab.style.width = newRequestWidth + 'px';
  detailsTab.style.width = newDetailsWidth + 'px';
}

const onMouseMove = function (mouseEv) {
  resizeComponents(mouseEv.x);
};
split.onmousedown = function (_mouseEv) {
  document.addEventListener('mousemove', onMouseMove);
  document.onmouseup = () =>
    document.removeEventListener('mousemove', onMouseMove);
};

window.onresize = function() {
  resizeComponents(requestTab.clientWidth);
}
