class ToolbarHandler {
  recordingButton = document.getElementById('record-button');
  clearButton = document.getElementById('clear-button');
  reloadButton = document.getElementById('reload-button');
  preserveLogCheckbox = document.getElementById('preserve-log-checkbox');
  compareButton = document.getElementById('compare-button');
  downloadButton = document.getElementById('download-button');
  concatSegmentDownload = document.getElementById('concat-downloads-checkbox');
  downloadLink = document.createElement("a");
  _isRecording = true;
  filterHandler = new FilterHandler();

  constructor() {
    this.recordingButton.addEventListener('click', this.onRecordButtonClicked);
    this.clearButton.addEventListener('click', this.onClearButtonClicked);
    this.reloadButton.addEventListener('click', this.onReloadButtonClicked);
    this.compareButton.addEventListener('click', this.onCompareClicked);
    this.downloadButton.addEventListener('click', this.onDownloadRequested);

    document.body.appendChild(this.downloadLink);
    this.downloadLink.style = "display: none";
  }

  shouldPreserveLog() {
    return this.preserveLogCheckbox.checked;
  }

  shouldRecord() {
    return this._isRecording;
  }

  clearList() {
    while (requestTable.firstChild) {
      requestTable.removeChild(requestTable.firstChild);
    }
  }

  onRecordButtonClicked = () => {
    this._isRecording = !this._isRecording;
    recordingButton.setAttribute('data-state', this._isRecording ? 'active' : 'inactive');
  }

  onReloadButtonClicked = () => {
    chrome.devtools.inspectedWindow.reload();
  }

  onClearButtonClicked = () => {
    this.clearList();
    clearDetailView();
  }

  enableToolbarButtons() {
    if (selectionTracker.allSelected.length === 2) {
      this.compareButton.setAttribute('data-state', 'active');
    } else {
      this.compareButton.setAttribute('data-state', 'inactive');
    }

    if (selectionTracker.allSelected.length > 0) {
      this.downloadButton.setAttribute('data-state', 'active');
    } else {
      this.downloadButton.setAttribute('data-state', 'inactive');
    }
  }

  onCompareClicked = () => {
    const selectedRows = selectionTracker.allSelected;

    if (selectedRows.length !== 2) {
      alert('You need to select exactly 2 segments to compare');

      return;
    }
  
    const urls = [...selectedRows].map((row) => row.getAttribute('url'));
    const parsed = urls.map((url) => parsedDataMap.get(url));
  
    chrome.windows.create({
      url: 'html/comparisonPopup.html',
      type: 'panel',
    }, function(window) {
      openedPopupWindows.push(window.id);
    });

    const popupOpenedListener = (request) => {
      if (request.type === 'comparison-opened') {
        chrome.runtime.onMessage.removeListener(popupOpenedListener);
        chrome.runtime.sendMessage({
          type: "render-comparison",
          data: [{
              url: urls[0],
              box: arrayBufferToBase64(parsed[0]._raw.buffer),
            }, {
              url: urls[1],
              box: arrayBufferToBase64(parsed[1]._raw.buffer),
            }],
        });
      }
    }

    chrome.runtime.onMessage.addListener(popupOpenedListener);
  }

  onDownloadRequested = () => {
    const elementsToConcat = [];
    const shouldConcatenate = this.concatSegmentDownload.checked;

    let selection = selectionTracker.allSelected;

    selection.forEach(row => {
      const url = row.getAttribute('url');

      let data = parsedDataMap.get(url);

      if (!data && !shouldConcatenate) {
        // only use raw data, if we won't concatenate the elements
        data = rawDataMap.get(url);
      }

      if (!data) {
        console.error('Could not find data to download for ' + url);

        return;
      }

      if (data._raw) {
        data = data._raw;
      }

      if (shouldConcatenate) {
        elementsToConcat.push(data);
      } else {
        const fileName = url.substr(url.lastIndexOf('/'));

        this.downloadData(data, fileName);
      }
    });

    if (shouldConcatenate) {
      let concatenatedArrayBuffer = elementsToConcat.shift().buffer;

      elementsToConcat.forEach(rawData => {
        concatenatedArrayBuffer = concatenateBuffers(concatenatedArrayBuffer, rawData.buffer)
      })

      this.downloadData(concatenatedArrayBuffer, 'concatenated_segments.mp4');
    }
  };

  downloadData(data, fileName) {
    if(data instanceof DataView) {
      data = new Blob([data.buffer])
    } else {
      data = new Blob([data]);
    }

    const url = window.URL.createObjectURL(data);

    this.downloadLink.href = url;
    this.downloadLink.download = fileName;
    this.downloadLink.click();
    window.URL.revokeObjectURL(url);
  }
}

function concatenateBuffers(arr1, arr2) {
  const result = new Uint8Array(arr1.byteLength + arr2.byteLength);

  result.set(new Uint8Array(arr1), 0);
  result.set(new Uint8Array(arr2), arr1.byteLength);

  return result;
}


class FilterHandler {
  filterTextInput = document.getElementById('filename-filter-text-input');
  searchTextInput = document.getElementById('box-search-text-input');
  searchButton = document.getElementById('search-button');
  filterButton = document.getElementById('filter-button');

  constructor() {
    this.filterTextInput.addEventListener('input', this.onFileNameFilterTextChanged);
    this.searchTextInput.addEventListener('input', this.onBoxSearchTextChanged);
    this.filterTextInput.addEventListener('change', this.onFilenameFilterTextInput);
    this.searchTextInput.addEventListener('change', this.onBoxSearchTextInput);
    this.filterButton.addEventListener('click', this.onFilterButtonClicked);
    this.searchButton.addEventListener('click', this.onSearchButtonClicked);
  }

  filterBoxes(boxNameQueryString, collection) {
    const keys = collection.keys();

    let matches = [];
    let currentKey;

    while(true) {
      currentKey = keys.next();

      if (currentKey.done) {
        break;
      }

      const url = currentKey.value;
      const parsed = collection.get(url);

      if (!parsed || !parsed.fetchAll) {
        matches.push(url);

        continue;
      }

      const boxes = parsed.fetchAll(boxNameQueryString);

      if (!boxes || boxes.length < 1) {
        matches.push(url);
      }
    }

    return matches;
  }

  filterUrls(partialUrl, collection){
    const urls = collection.keys();

    let matches = [];
    let currentKey;

    while(true) {
      currentKey = urls.next();

      if (currentKey.done) {
        break;
      }

      const url = currentKey.value;

      if (!url.includes(partialUrl)) {
        matches.push(url);
      }
    }

    return matches;
  }

  onTextInputChanged(textInput, associatedButton) {
    if (textInput.value === '') {
      associatedButton.setAttribute('data-state', 'active');
    } else {
      associatedButton.setAttribute('data-state', 'has-data');
    }
  }

  onFileNameFilterTextChanged = () => {
    this.resetFilter();
    this.onTextInputChanged(this.filterTextInput, this.filterButton);
    this.applyFilters();
  }
  
  onBoxSearchTextChanged = () => {
    this.resetFilter();
    this.onTextInputChanged(this.searchTextInput, this.searchButton);
    this.applyFilters();
  }

  applyFilters() {
    const mismatchingUrls = [];

    if (this.filterTextInput.value !== "") {
      mismatchingUrls.push(...this.filterUrls(this.filterTextInput.value, parsedDataMap));
      mismatchingUrls.push(...this.filterUrls(this.filterTextInput.value, rawDataMap));
    }

    if (this.searchTextInput.value !== "") {
      mismatchingUrls.push(...this.filterBoxes(this.searchTextInput.value, parsedDataMap));
      mismatchingUrls.push(...this.filterBoxes(this.searchTextInput.value, rawDataMap));
    }

    this.filterNonMatchingUrls(mismatchingUrls);
  }

  shouldNewEntryBeVisible(url) {
    let isMatching = true;

    if (this.filterTextInput.value !== "") {
      isMatching = url.includes(this.filterTextInput.value);
    }

    if (isMatching && this.searchTextInput.value !== "") {
      const parsed = parsedDataMap.get(url);

      if (!parsed) {
        return false;
      }

      const boxes = parsed.fetchAll(this.searchTextInput.value);

      if (!boxes || boxes.length < 1) {
        isMatching = false;
      }
    }

    return isMatching;
  }

  hasActiveFilter() {
    return this.filterTextInput.value !== "" || this.searchTextInput.value !== "";
  }

  resetFilter() {
    document.querySelectorAll('#requests tr.hidden').forEach(node => showElement(node));
  }
  
  filterNonMatchingUrls(matchingUrls) {
    matchingUrls.forEach(url => {
      const targets = document.getElementsByClassName(url);

      if (targets) {
        for(let i = 0; i< targets.length; i++) {
          const target  = targets.item(i);

          hideElement(target);
        }
      } else {
        console.error('No dom element found for ', url);
      }
    })
  }

  onTextInputToggleButtonClicked(button, textInput) {
    const currentDataState = button.getAttribute('data-state');
  
    switch (currentDataState) {
      case 'inactive':
        button.setAttribute('data-state', 'active');
        showElement(textInput);
        break;
  
      case 'active':
        button.setAttribute('data-state', 'inactive');
        hideElement(textInput);
        break;
  
      case 'has-data':
        toggleElementVisibility(textInput);
        break;
    }
  }

  onFilterButtonClicked = () => {
    this.onTextInputToggleButtonClicked(this.filterButton, this.filterTextInput);
  }
  
  onSearchButtonClicked = () => {
    this.onTextInputToggleButtonClicked(this.searchButton, this.searchTextInput);
  }

  onFilenameFilterTextInput = () => {
    this.onTextInputChanged(this.filterTextInput, this.filterButton);
  }
  
  onBoxSearchTextInput = () => {
    this.onTextInputChanged(this.searchTextInput, this.searchButton);
  }
}

function showElement(element) {
  element && element.classList.remove('hidden');
}

function hideElement(element) {
  element && element.classList.add('hidden');
}

function toggleElementVisibility(element) {
  element && element.classList.toggle('hidden');
}
