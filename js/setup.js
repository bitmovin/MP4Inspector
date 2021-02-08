window.onbeforeunload = function() {
  closeOpenPopupWindows();
};

/** @type ToolbarHandler */
let toolbarHandler;
/** @type NetworkRequestRenderer */
let requestRenderer;
let pushedCounter = 0;

chrome.devtools.network.onNavigated.addListener(function() {
  pushedCounter = 0;
  if (!toolbarHandler.shouldPreserveLog()) {
    toolbarHandler.clearList();
    clearDetailView();
    closeOpenPopupWindows();
  }
});

(function init() {
  Split(
    [
      '#requestList',
      '#detailView'
    ],
    {
      gutterSize: 1,
      elementStyle: (dimension, size, gutterSize) => ({
        'flex-basis': `calc(${size}% - ${gutterSize}px)`
      }),
      gutterStyle: (dimension, gutterSize) => ({
        'flex-basis':  `${gutterSize}px`
      }),
      minSize: [100, 100],
      sizes: [30, 70]
    }
  );

  toolbarHandler = new ToolbarHandler();
  requestRenderer = new NetworkRequestRenderer();
  setupKeyEventHandlers();
  setupCommandListener();
})();

chrome.devtools.network.onRequestFinished.addListener(
  function(response) {
    if (!toolbarHandler.shouldRecord()) {
      return;
    }
    response.getContent((content, encoding) => {
      if (encoding !== 'base64') {
        console.log('No base64 encoding for ' + response.request.url + ' skipping');
        rawDataMap.set(response.request.url, content);
        return;
      }
      const buffer = stringToArrayWithoutEncoding(atob(content)).buffer;
      const parsedBox = ISOBoxer.parseBuffer(buffer);

      parsedDataMap.set(response.request.url, parsedBox);
    });

    requestRenderer.addNetworkRequestEntry(response.request.url);
});

chrome.runtime.onMessage.addListener(function(request) {
  if (request.type === 'popup-opened' && segmentsToDisplayInPopupWindow.length > 0) {
    const entry = segmentsToDisplayInPopupWindow.shift();

    chrome.runtime.sendMessage({
      type: 'render-box',
      data: arrayBufferToBase64(entry.segment._raw.buffer),
      url: entry.url,
    });
  }
});

chrome.runtime.onMessageExternal.addListener(function(request, sender, _sendResponse){
  // injectOverwriteAppendBuffer.js injects a script, which grabs data from
  // SourceBuffer.appendBuffer and sends them here.
  // due to code injection limitations, this only works on localhost
  // for any other url, you have to adjust the manifest.json and extend content_scripts.matches
  const comesFromInspectedTab = sender.tab.id === chrome.devtools.inspectedWindow.tabId;
  if (request.type === 'segment-appended' && comesFromInspectedTab) {
    const buffer = base64ToArrayBuffer(request.data);
    const parsedBox = ISOBoxer.parseBuffer(buffer);
    const url = `pushed://to/sourceBuffer/appendedData_${pushedCounter++}.mp4`;

    parsedDataMap.set(url, parsedBox);
    requestRenderer.addNetworkRequestEntry(url);
  }
  console.log('chrome.runtime.onMessageExternal', request)
});
