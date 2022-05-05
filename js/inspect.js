const detailView = document.getElementById("detailView");
const requestTable = document.getElementById('requests');
const detailViewPlaceholder = document.getElementById('detail-view-placeholder');
const parsedDataMap = new Map();
const rawDataMap = new Map();
const segmentsToDisplayInPopupWindow = [];

let openedPopupWindows = [];

class RowSelectionTracker {
  allSelected = [];
  lastClickUrl;
  lastClickedRow;
  lastClickTime;
  isDoubleClick;

  onClick(url, clickedRow, clickEvent) {
    const clickTime = Date.now();

    this.selectRowsForClick(clickEvent, clickedRow, url);
    this.isDoubleClick = (clickTime - this.lastClickTime) < 300 && this.lastClickUrl === url;
    this.lastClickUrl = url;
    this.lastClickedRow = clickedRow;
    this.lastClickTime = clickTime;
  }

  getLastSelection() {
    return {
      url: this.lastClickUrl,
      isDoubleClick: this.isDoubleClick,
      isMultiSelect: this.allSelected.length > 1,
    }
  }

  /**
   * Handles a click on a row with respect to ctrl/command and shift key or both.
   * @param {MouseEvent} clickEvent the event triggered by the browser by clicking on the row
   * @param {HTMLTableRowElement} clickedRow the row which received the click
   * @param {string} url the url represented by the row
   */
  selectRowsForClick(clickEvent, clickedRow, url) {
    if (!clickEvent.ctrlKey && !clickEvent.metaKey) {
      // unselect everything when no ctrl/command key was pressed
      [...requestTable.getElementsByTagName('tr')].forEach(row => {
        row.removeAttribute('data-state');
      });

      this.allSelected = [];
    } else { 
      if (clickedRow.getAttribute('data-state') === 'active') {
        clickedRow.removeAttribute('data-state');
        this.allSelected = this.allSelected.filter(selection => selection !== clickedRow);

        return;
      } else {
        this.selectRow(clickedRow);
      }
    }

    if (clickEvent.shiftKey) {
      const visibleRows = getVisibleElements();

      let startIndex = -1, endIndex = -1;

      for (let i = 0; i < visibleRows.length; i++) {
        const currentRow = visibleRows[i];

        if (currentRow.getAttribute('url') === url) {
          startIndex = i;
        }

        if (currentRow.getAttribute('url') === this.lastClickUrl) {
          endIndex = i;
        }
      }

      if (endIndex == -1 || startIndex == -1) {
        console.log('Shift selection did not work, as one of the elements is not visible anymore');

        return this.selectRow(clickedRow);
      }

      const end = Math.max(startIndex, endIndex);
      const start = Math.min(startIndex, endIndex);

      for (let i = start; i <= end; i++) {
        this.selectRow(visibleRows[i]);
      }
    } else if(!clickEvent.ctrlKey && !clickEvent.metaKey) {
      this.selectRow(clickedRow);
    }
  }

  selectRow(clickedRow) {
    clickedRow.setAttribute('data-state', 'active');
    this.allSelected.push(clickedRow);
  }
}

const selectionTracker = new RowSelectionTracker();

function handleNetworkRequestClick(url, clickedRow, clickEvent) {
  const parsedBox = parsedDataMap.get(url);
  const lastSelection = selectionTracker.getLastSelection();

  selectionTracker.onClick(url, clickedRow, clickEvent);
  toolbarHandler.enableToolbarButtons();
  clearDetailView();

  if (!parsedBox) {
    return handleNonMp4Click(url);
  }

  if (lastSelection.isDoubleClick) {
    segmentsToDisplayInPopupWindow.push({
      url,
      segment: parsedBox
    });

    chrome.windows.create({
      url: 'html/detailViewPopup.html',
      type: 'panel',
    }, function(window) {
      openedPopupWindows.push(window.id);
    });
  } else {
    const renderer = new BoxRenderer(url);

    createUrlInfoDetailHeader(url);
    renderer.renderBoxes(parsedBox, detailView, 0);
  }
}

function handleNonMp4Click(url) {
  const data = rawDataMap.get(url);
  const container = document.createElement('div');

  if (!data) {
    console.warn('No data found for ', url);
  }

  hideElement(detailViewPlaceholder);
  createUrlInfoDetailHeader(url);

  // in case of xml dont use innerHtml
  container.innerText = data;
  detailView.appendChild(container);
}

function createUrlInfoDetailHeader(url) {
  const fileNameSpan = document.createElement('span');

  fileNameSpan.setAttribute('id', 'file-url-span');
  fileNameSpan.classList.add('file-url');
  fileNameSpan.innerHTML = 'File: ' + url;
  detailView.appendChild(fileNameSpan);
}

function arrayBufferToBase64(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);

  let base64String = '';

  for (let idx = 0; idx < data.length; idx++) {
    base64String += String.fromCharCode(data[idx]);
  }

  return window.btoa(base64String);
}

function stringToArrayWithoutEncoding(str) {
  const array = new Uint8Array(str.length);

  for (let i = 0; i < str.length; i++) {
    array[i] = str.charCodeAt(i);
  }

  return array;
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let idx = 0; idx < length; idx++) {
    bytes[idx] = binaryString.charCodeAt(idx);
  }

  return bytes.buffer;
}

function clearDetailView() {
  while (detailView.firstChild) {
    detailView.removeChild(detailView.firstChild);
  }

  detailView.appendChild(detailViewPlaceholder);
  showElement(detailViewPlaceholder);
}

function findSelectedRequestIndex(rows) {
  return rows.findIndex(row => row.getAttribute('data-state') === 'active');
}

function moveSelectedRequestIndex(upward) {
  const rows = getVisibleElements();

  let selectedRequestIndex = (findSelectedRequestIndex(rows) || 0) + (upward ? -1 : 1);

  if (selectedRequestIndex < 0) {
    selectedRequestIndex = rows.length - 1;
  } else if (selectedRequestIndex >= rows.length) {
    selectedRequestIndex = 0;
  }

  rows.forEach(row => row.removeAttribute('data-state'));
  rows[selectedRequestIndex].setAttribute('data-state', 'active');
  rows[selectedRequestIndex].click();
}

function onRequestTableKeyDown(event) {
  switch (event.keyCode) {
    case 38:
      moveSelectedRequestIndex(true);
      event.preventDefault();
      break;

    case 40:
      moveSelectedRequestIndex(false);
      event.preventDefault();
      break;
  }
}

function getVisibleElements() {
  return [...requestTable.querySelectorAll('tr:not(.hidden)')];
}

function setupKeyEventHandlers() {
  requestTable.addEventListener('keydown', onRequestTableKeyDown);
}

function setupCommandListener() {
  chrome.commands.onCommand.addListener(function(command) {
    if (command === 'reload') {
      chrome.devtools.inspectedWindow.reload();
    }
  });
}

function closeOpenPopupWindows() {
  try {
    openedPopupWindows.forEach(windowId => chrome.windows.remove(windowId));
  } catch(err) {
    console.err('Unable to close open popup windows', err);
  }

  openedPopupWindows = [];
}
