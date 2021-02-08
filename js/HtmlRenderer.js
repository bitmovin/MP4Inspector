
const maxFilenameLength = 80;
const hexBoxesToViewInPopupWindow = [];

class NetworkRequestRenderer {
  list = document.getElementById("requestList");

  addNetworkRequestEntry(url) {
    let fileName = url.split("/").pop();

    if (fileName.includes("?")) {
      fileName = fileName.substring(0, fileName.indexOf("?"));
    }
    if (fileName.length > maxFilenameLength) {
      fileName = fileName.substring(0, maxFilenameLength - 3) + "...";
    }

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    const anchor = document.createElement("a");

    row.classList.add(url);
    row.setAttribute("url", url);
    anchor.innerHTML = fileName;
    anchor.href = url;

    anchor.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
    });

    row.addEventListener(
      "click",
      (event) => {
        handleNetworkRequestClick(url, row, event);
        event.stopPropagation();
        event.preventDefault();
      },
      true
    );

    cell.appendChild(anchor);
    row.appendChild(cell);

    const shouldScroll =
      this.list.scrollTop + this.list.clientHeight === this.list.scrollHeight;

    requestTable.appendChild(row);

    if (!toolbarHandler.filterHandler.shouldNewEntryBeVisible(url)) {
      hideElement(row);
    }

    if (shouldScroll) {
      this.list.scrollTop = this.list.scrollHeight - this.list.clientHeight;
    }
  }
}

class BoxRenderer {
  ignoredAttributes = [
    "_cursor",
    // "_offset",
    "_root",
    "_raw",
    "_parent",
    "_parsing",
    // "size",
    "boxes",
    "data", // we don't wanna see mdat content
    "_data",
    "type", // type is already rendered as box header
  ];

  constructor(url) {
    this._url = url;
  }

  /**
   * @param {ISOBox} parsedBox 
   * @param {HTMLElement} parent 
   * @param {number} level 
   */
  renderBoxes(parsedBox, parent, level) {
    if (!parsedBox.boxes || parsedBox.boxes.length == 0) {
      return;
    }
    if (detailViewPlaceholder) {
      hideElement(detailViewPlaceholder);
    }
    parsedBox.boxes.forEach((box) => {
      const newBox = this.appendBox(box, parent, level);
      this.renderBoxes(box, newBox, level + 1);
    });
  }

  /**
   * @param {ISOBox} box 
   * @param {HTMLElement} parent 
   * @param {number} level 
   */
  appendBox(box, parent, level) {
    const boxContainer = document.createElement('div');
    boxContainer.classList.add('iso-box', box.type.trim());
    boxContainer.setAttribute('level', level === 0 ? 'root' : 'sub');
    const collapseIcon = document.createElement('span');
    collapseIcon.innerHTML = '&#9660;';
    collapseIcon.classList.add('collapse-icon');
    const expandIcon = document.createElement('span');
    expandIcon.innerHTML = '&#9654;';
    expandIcon.classList.add('collapse-icon');
  
    if (level > 0) {
      boxContainer.classList.add('collapsed');
      collapseIcon.classList.add('hidden');
    } else {
      boxContainer.classList.add('expanded');
      expandIcon.classList.add('hidden');
    }
    const header = document.createElement('span');
    header.classList.add('box-name');
    header.innerText = box.type;
  
    const clickHandler = function() {
      boxContainer.classList.toggle('collapsed');
      boxContainer.classList.toggle('expanded');
      collapseIcon.classList.toggle('hidden');
      expandIcon.classList.toggle('hidden');
    };
  
    let hexButton = null;
  
    try {
  
      let boxPath = '';
      let parentBox = box;
  
      do {
        boxPath = `${parentBox.type}/${boxPath}`;
      } while ((parentBox = parentBox._parent) != null && parentBox.type != null);
  
      hexButton = document.createElement('span');
      hexButton.innerHTML = 'hex';
      hexButton.setAttribute('path', boxPath);
      hexButton.classList.add('hex-button');
  
      hexButton.addEventListener('click', () => this.onHexButtonClicked(boxPath, box));
    } catch(e) {
      console.error(e);
    }
  
    header.onclick = clickHandler;
  
    boxContainer.appendChild(collapseIcon);
    boxContainer.appendChild(expandIcon);
    collapseIcon.onclick = clickHandler;
    expandIcon.onclick = clickHandler;
    boxContainer.appendChild(header);
  
    if (hexButton) {
      boxContainer.appendChild(hexButton);
    }
  
    this.appendAttributes(box, boxContainer);
  
    parent.appendChild(boxContainer);
    return boxContainer;
  }

  appendAttributes(isoBox, container) {
    const attributeTable = document.createElement('table');
    attributeTable.classList.add('attribute-container');
    container.appendChild(attributeTable);
  
    const tableBody = document.createElement('tbody');
    tableBody.classList.add('hover-table');
    attributeTable.appendChild(tableBody);
  
    const properties = Object.keys(isoBox);
  
    properties.forEach((prop) => {
      if (this.ignoredAttributes.includes(prop)) {
        return;
      }
      this.createAttributeTableRow(prop, isoBox[prop], tableBody);
    });
  }

  onHexButtonClicked(boxPathStr, currentBox) {
    try {
      const boxPath = boxPathStr.split('/').filter(str => str !== '');
  
      const data = currentBox._raw.buffer.slice(currentBox._raw.byteOffset,
        currentBox._raw.byteOffset + currentBox._raw.byteLength);
      const dataBase64 = arrayBufferToBase64(data);
  
      chrome.windows.create({
        url: 'html/hexViewPopup.html',
        type: 'panel',
      }, function(window) {
        openedPopupWindows.push(window.id);
      });

      const popupOpenedListener = (request) => {
        if(request.type !== 'popup-opened') {
          return;
        }
        chrome.runtime.onMessage.removeListener(popupOpenedListener);
        chrome.runtime.sendMessage({
          type: 'show-hex',
          data: dataBase64,
          boxPath: boxPath.join('/'),
          url: this._url,
        });
      };
      chrome.runtime.onMessage.addListener(popupOpenedListener);
    } catch (e) {
      console.error(e);
    }
  }

  createAttributeTableRow(name, value, parent) {
    const row = document.createElement('tr');
    row.classList.add('attribute-row');
    const nameCell = document.createElement('td');
    nameCell.innerText = name;
    nameCell.classList.add('attribute', 'attribute-name', name);
    const valueCell = document.createElement('td');
    this.appendAttributeValue(value, valueCell);
    valueCell.classList.add('attribute', 'attribute-value', name);
    row.appendChild(nameCell);
    row.appendChild(valueCell);
  
    parent.appendChild(row);
  }
  
  appendAttributeValue(value, parent, depth = 0) {
    if (depth > 10) {
      parent.appendChild(document.createTextNode(value));
      return;
    }
    if (value == null) {
      parent.appendChild(document.createTextNode('<no value>'));
      return;
    }
  
    if (Array.isArray(value)) {
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      tbody.classList.add('hover-table');
      table.appendChild(tbody);
  
      value.forEach(single => {
        const row = document.createElement('tr');
        this.appendAttributeValue(single, row, depth + 1);
        tbody.appendChild(row);
      });
      parent.appendChild(table);
      return;
    }
    if (typeof value === 'object') {
      if (value instanceof ISOBox) {
        // no infinite looping
        return this.appendBox(value, parent, depth);
      }
  
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      tbody.classList.add('hover-table');
      table.appendChild(tbody);
  
      Object.keys(value).forEach(name => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.appendChild(document.createTextNode(name));
        row.appendChild(nameCell);
        const subValue = this.appendAttributeValue(value[name], row, depth + 1);
        tbody.appendChild(row);
      });
      parent.appendChild(table);
      return;
    }
  
    parent.appendChild(document.createTextNode(value));
  }
}
