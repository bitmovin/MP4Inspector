let toolbarHandler;
let requestRenderer;
let pushedCounter = 0;

window.onbeforeunload = function() {
  closeOpenPopupWindows();
};

chrome.devtools.network.onNavigated.addListener(function() {
  pushedCounter = 0;

  if (!toolbarHandler.shouldPreserveLog()) {
    toolbarHandler.clearList();
    clearDetailView();
    closeOpenPopupWindows();
  }
  installSourceBufferOverwrite();
});

(function init() {
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

function overWriteSourceBufferAppendData(extensionId) {
  const originalAppendBuffer = SourceBuffer.prototype.appendBuffer;
  console.log('injecting append buffer listener');

  SourceBuffer.prototype.appendBuffer = function (data) {
    originalAppendBuffer.call(this, data);

    try {
      if (!extensionId) {
        return;
      }

      chrome.runtime.sendMessage(extensionId, {
        type: 'segment-appended',
        data: arrayBufferToBase64(data),
      });
    } catch (err) {
      console.warn(err);
    }
  };
  function arrayBufferToBase64(arrayBuffer) {
    let base64String = '';
    const data = new Uint8Array(arrayBuffer);

    for (let idx = 0; idx < data.length; idx++) {
      base64String += String.fromCharCode(data[idx]);
    }

    return window.btoa(base64String);
  }
}

function getCurrentTab() {
  return new Promise((resolve, reject) => {
    function onTabsAvailable(tabArray) {
      if (tabArray && tabArray.length > 0) {
        resolve(tabArray[0]);
      } else {
        reject('No active tab');
      }
    }
    chrome.tabs.query({ currentWindow: true, active: true }, onTabsAvailable);
  });
}

function ensureScriptingPermission(activeTab) {
  return new Promise((resolve, reject) => {
    if (!activeTab.url) {
      // it seems that the url is only exposed when the url is listed in the
      // host_permissions or externally_connectable entries in the manifest.json
      // if this is not filled, this is a good indicator for missing permissions
      reject(
        'activeTab.url is missing, so we cant check for permissions on the current page'
      );
    }

    const permissions = {
      permissions: ['scripting'],
      origins: [activeTab.url],
    };
    chrome.permissions.contains(permissions, function (hasPermission) {
      if (hasPermission) {
        resolve(activeTab);
      } else {
        reject('No scripting permission on the url: ' + activeTab.url);
      }
    });
  });
}

function installSourceBufferOverwrite() {
  getCurrentTab()
    .then((activeTab) => ensureScriptingPermission(activeTab))
    .then((activeTab) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          func: overWriteSourceBufferAppendData,
          args: [chrome.runtime.id],
          world: 'MAIN',
        },
        () => { /* done callback without params */ }
      );
    })
    .catch((error) => {
      console.error('Unable to setup SourceBuffer.append overwrite', error);
    });
}
installSourceBufferOverwrite();

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
});
