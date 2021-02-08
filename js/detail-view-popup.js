const windowId = Date.now();

let handled = false;

// Inform the extension that we opened the window
chrome.runtime.sendMessage({ type: 'popup-opened', windowId: windowId });

chrome.runtime.onMessage.addListener(function(request) {
  if (request.type === 'popup-opened' && segmentsToDisplayInPopupWindow.length > 0) {
    const entry = segmentsToDisplayInPopupWindow.shift();

    chrome.runtime.sendMessage({
      type: 'render-box',
      data: arrayBufferToBase64(entry.segment._raw.buffer),
      url: entry.url,
    });
  } else if (request.type === 'popup-opened' && hexBoxesToViewInPopupWindow.length > 0) {
    const entry = hexBoxesToViewInPopupWindow.shift();

    chrome.runtime.sendMessage({
      type: 'show-hex',
      data: entry.data,
      boxPath: entry.boxPath,
      url: entry.url,
    });
  }
});

// Wait for the extension to acknowledge that this window was opened
chrome.runtime.onMessage.addListener(function(request) {
  if (request.type === 'render-box' && !handled) {
    const fileNameSpan = document.createElement('span');
    fileNameSpan.classList.add('file-url');
    fileNameSpan.setAttribute('id', 'file-url-span');
    fileNameSpan.innerHTML = 'File: ' + request.url;
    detailView.appendChild(fileNameSpan);

    const parsedBox = ISOBoxer.parseBuffer(base64ToArrayBuffer(request.data));

    parsedDataMap.set(request.url, parsedBox);

    const renderer = new BoxRenderer(request.url);
    renderer.renderBoxes(parsedBox, detailView, 0);
    document.title = 'MP4 Inspector - File: ' + request.url;

    handled = true;
  }
});