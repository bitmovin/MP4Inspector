/** @type HTMLDivElement */
var split = document.getElementById('resize-divider');
/** @type HTMLDivElement */
var requestTab = document.getElementById('requestList');

const minWidth = 150;

const onMouseMove = function (mouseEv) {
  requestTab.style.width = Math.max(mouseEv.x, minWidth) + 'px';
};
split.onmousedown = function (_mouseEv) {
  document.addEventListener('mousemove', onMouseMove);
  document.onmouseup = () =>
    document.removeEventListener('mousemove', onMouseMove);
};
