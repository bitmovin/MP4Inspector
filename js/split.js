/** @type HTMLDivElement */
const split = document.getElementById('resize-divider');
/** @type HTMLDivElement */
const requestTab = document.getElementById('requestList');
/** @type HTMLDivElement */
const detailsTab = document.getElementById('detailView');

const minWidth = 150;

const onMouseMove = function (mouseEv) {
  const containerWidth = requestTab.parentElement.clientWidth;
  const newRequestWidth = Math.max(mouseEv.x, minWidth);
  const requestPercentageWidth = (newRequestWidth / containerWidth) * 100;
  const detailsPercentageWidth = 100 - requestPercentageWidth;
  requestTab.style.width = requestPercentageWidth + '%';
  detailsTab.style.maxWidth = detailsPercentageWidth + '%';
};
split.onmousedown = function (_mouseEv) {
  document.addEventListener('mousemove', onMouseMove);
  document.onmouseup = () =>
    document.removeEventListener('mousemove', onMouseMove);
};
