const windowId = Date.now();

let handled = false;

function getEmptyString(length) {
  let str = '';

  while (length-- > 0) {
    str += '0';
  }

  return str;
}
const hexTable = document.getElementById('hex-table');

// Wait for the extension to acknowledge that this window was opened
chrome.runtime.onMessage.addListener(function(request) {
  const hexView = document.getElementById('hex-view');

  if (request.type === 'show-hex' && !handled) {
    document.title = 'MP4 Inspector - File: ' + request.url;

    const fileNameSpan = document.createElement('span');
    fileNameSpan.classList.add('file-url');
    fileNameSpan.innerHTML = 'File: ' + request.url;
    hexView.insertBefore(fileNameSpan, hexTable);

    const boxPathSpan = document.createElement('span');
    boxPathSpan.classList.add('file-url');
    boxPathSpan.innerHTML = 'Box: ' + request.boxPath;
    hexView.insertBefore(boxPathSpan, hexTable);

    const data = base64ToArrayBuffer(request.data);

    const uint8Array = new Uint8Array(data, 0);

    renderHeader(hexTable);

    renderTable(uint8Array);

    handled = true;
  }
});

// Inform the extension that we opened the window
chrome.runtime.sendMessage({ type: 'popup-opened', windowId: windowId });

async function renderTable(uint8Array) {
  const offsetLength = 1 + Math.floor(Math.log(uint8Array.length) / Math.log(16));
  let currentRow = null;
  let currentColumns = [];
  let rowCounter = 0;
  for (let idx = 0; idx < uint8Array.length; idx++) {
    let rowRelativeOffset = idx % 16;
    if (rowRelativeOffset === 0) {
      rowCounter++;
      // start a new row
      if (rowCounter % 10 === 0) {
        await new Promise(resolve => {
          requestAnimationFrame(resolve);
        });
      }
      currentColumns = [];
      currentRow = document.createElement('tr');
      hexTable.appendChild(currentRow);
      const offsetCol = document.createElement('td');
      offsetCol.classList.add('hex-offset');
      offsetCol.innerHTML = `${getEmptyString(offsetLength)}${idx.toString(16)}`.substr(-offsetLength).toUpperCase();
      const separatrorCol = document.createElement('td');
      separatrorCol.classList.add('hex-separator');
      currentRow.appendChild(offsetCol);
      currentRow.appendChild(separatrorCol);
      for (let idx = 0; idx < 33; idx++) {
        const col = document.createElement('td');
        if (idx < 16) {
          col.classList.add('hex-data');
          currentColumns.push(col);
        }
        else if (idx === 16) {
          col.classList.add('hex-separator');
        }
        else {
          col.classList.add('hex-str');
          currentColumns.push(col);
        }
        currentRow.appendChild(col);
      }
    }
    // push data into the table
    const currentValue = uint8Array[idx];
    currentColumns[rowRelativeOffset].innerHTML = `0${currentValue.toString(16)}`.substr(-2).toUpperCase();
    currentColumns[rowRelativeOffset + 16].innerHTML = String.fromCharCode(currentValue);
    if (currentColumns[rowRelativeOffset + 16].innerHTML === '') {
      currentColumns[rowRelativeOffset + 16].innerHTML = '.';
    }
  }
}

function renderHeader(hexTable) {
  const headerRow = document.createElement('tr');
  headerRow.classList.add('hex-table-header');
  const offsetColHeader = document.createElement('th');
  offsetColHeader.innerHTML = 'Offset';
  headerRow.appendChild(offsetColHeader);
  headerRow.appendChild(document.createElement('tr'));
  for (let idx = 0; idx < 16; idx++) {
    const offsetHeader = document.createElement('th');
    offsetHeader.innerHTML = `0${idx.toString(16)}`.substr(-2).toUpperCase();
    headerRow.appendChild(offsetHeader);
  }
  hexTable.appendChild(headerRow);
  for (let idx = 0; idx < 17; idx++) {
    headerRow.appendChild(document.createElement('th'));
  }
}
