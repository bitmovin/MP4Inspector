const windowId = Date.now();

// Inform the extension that we opened the window
chrome.runtime.sendMessage({ type: 'popup-opened', windowId: windowId });

// Wait for the extension to acknowledge that this window was opened
chrome.runtime.onMessage.addListener(onMessage);

function onMessage(request) {
  if (request.type === 'show-hex') {
    const hexTable = document.getElementById('hex-table');
    const hexView = document.getElementById('hex-view');
    const fileNameSpan = document.createElement('span');
    const boxPathSpan = document.createElement('span');
    const data = base64ToArrayBuffer(request.data);
    const uint8Array = new Uint8Array(data, 0);

    document.title = 'MP4 Inspector - File: ' + request.url;

    fileNameSpan.classList.add('file-url');
    fileNameSpan.innerHTML = 'File: ' + request.url;
    hexView.insertBefore(fileNameSpan, hexTable);

    boxPathSpan.classList.add('file-url');
    boxPathSpan.innerHTML = 'Box: ' + request.boxPath;
    hexView.insertBefore(boxPathSpan, hexTable);

    renderHeader(hexTable);
    renderTable(hexTable, uint8Array);

    chrome.runtime.onMessage.removeListener(onMessage);
  }
}

async function renderTable(hexTable, uint8Array) {
  const offsetLength = 1 + Math.floor(Math.log(uint8Array.length) / Math.log(16));

  let currentRow = null;
  let currentColumns = [];
  let rowCounter = 0;

  for (let byteIndex = 0; byteIndex < uint8Array.length; byteIndex++) {
    let rowRelativeOffset = byteIndex % 16;

    if (rowRelativeOffset === 0) {
      rowCounter++;

      // start a new row
      if (rowCounter % 10 === 0) {
        await new Promise(resolve => {
          requestAnimationFrame(resolve);
        });
      }

      const prefix = ''.padStart(offsetLength, '0');
      const offsetCol = document.createElement('td');
      const separatorCol = document.createElement('td');

      currentColumns = [];
      currentRow = document.createElement('tr');
      hexTable.appendChild(currentRow);

      offsetCol.classList.add('hex-offset');
      offsetCol.innerHTML = `${prefix}${byteIndex.toString(16)}`.substr(-offsetLength).toUpperCase();

      separatorCol.classList.add('hex-separator');
      currentRow.appendChild(offsetCol);
      currentRow.appendChild(separatorCol);

      for (let colIndex = 0; colIndex < 33; colIndex++) {
        const col = document.createElement('td');

        if (colIndex < 16) {
          col.classList.add('hex-data');
          currentColumns.push(col);
        } else if (colIndex === 16) {
          col.classList.add('hex-separator');
        } else {
          col.classList.add('hex-str');
          currentColumns.push(col);
        }

        currentRow.appendChild(col);
      }
    }

    // push data into the table
    const currentValue = uint8Array[byteIndex];

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
