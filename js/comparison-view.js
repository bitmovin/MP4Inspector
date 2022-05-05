const windowId = Date.now();
const firstDetailPane = document.getElementById('detail1');
const secondDetailPane = document.getElementById('detail2');

// Inform the extension that we opened the window
chrome.runtime.sendMessage({ type: 'comparison-opened', windowId: windowId });

// Wait for the extension to acknowledge that this window was opened
chrome.runtime.onMessage.addListener(onMessage);

function onMessage(request) {
  if (request.type === 'render-comparison') {
    const [firstData, secondData] = request.data;
    const firstRenderer = new BoxRenderer(firstData.url);
    const secondRenderer = new BoxRenderer(secondData.url);
    const firstBox = ISOBoxer.parseBuffer(base64ToArrayBuffer(firstData.box));
    const secondBox = ISOBoxer.parseBuffer(base64ToArrayBuffer(secondData.box));

    document.getElementById('filename1').innerHTML = firstData.url;
    document.getElementById('filename2').innerHTML = secondData.url;
    firstRenderer.renderBoxes(firstBox, firstDetailPane, 0);
    secondRenderer.renderBoxes(secondBox, secondDetailPane, 0);

    compareIsoBoxes(firstBox, secondBox, firstRenderer.ignoredAttributes);

    chrome.runtime.onMessage.removeListener(onMessage);
  }
}

function compareIsoBoxes(firstBox, secondBox, ignoredAttributes) {
  const uniqueToFirst = [], commonBoxes = [];

  while (firstBox.boxes && firstBox.boxes.length > 0) {
    const workingBox = firstBox.boxes.shift();
    const matchingBox = secondBox.boxes.findIndex(box => box.type === workingBox.type);

    if (matchingBox > -1) {
      commonBoxes.push({ workingBox, brokenBox: secondBox.boxes.splice(matchingBox, 1)[0] });
    } else {
      uniqueToFirst.push(workingBox);
    }
  }

  const comparisonResult = {
    commonBoxes,
    uniqueToFirst,
    uniqueToSecond: secondBox.boxes || [],
  };

  renderComparisonResult(comparisonResult, ignoredAttributes);

  commonBoxes.forEach(boxPair => {
    if (boxPair.workingBox.boxes && boxPair.workingBox.boxes.length > 0) {
      compareIsoBoxes(boxPair.workingBox, boxPair.brokenBox, ignoredAttributes);
    }
  });
}

function renderComparisonResult(comparisonResult, ignoredAttributes) {
  comparisonResult.uniqueToFirst.forEach(uniqueBox => {
    console.log('box unique to first segment: ', uniqueBox);
    firstDetailPane.querySelectorAll(`.${uniqueBox.type}`).forEach(node => node.classList.add('unique'))
  });

  comparisonResult.uniqueToSecond.forEach(uniqueBox => {
    console.log('box unique to second segment: ', uniqueBox);
    secondDetailPane.querySelectorAll(`.${uniqueBox.type}`).forEach(node => node.classList.add('unique'))
  });

  comparisonResult.commonBoxes.forEach(boxPair => {
    const properties = Object.keys(boxPair.workingBox);

    properties.forEach(prop => {
      if (ignoredAttributes.includes(prop)) {
        return;
      }

      const workingValue = boxPair.workingBox[prop];
      const brokenValue = boxPair.brokenBox[prop];
      const attributeSelector = `${getBoxSelector(boxPair.workingBox)} .${prop}`;
      const matches = document.querySelectorAll(attributeSelector);

      if (!isEqual(workingValue, brokenValue)) {
        matches.forEach(node => node.classList.add('difference'));
      } else {
        matches.forEach(node => node.classList.add('equal'));
      }
    });
  });
}

function getBoxSelector(box, path = '') {
  if (!box._parent) {
    return path;
  }

  const newPath = '.' + box.type.trim() + ' ' + path;

  return getBoxSelector(box._parent, newPath);
}

function isEqual(value1, value2) {
  if (value1 == null && value2 == null) {
    return true;
  }

  if (value1 == null  || value2 == null) {
    return false;
  }

  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) {
      return false;
    }

    return value1.every((firstVal, index) => value2[index] === firstVal);
  }

  if (Array.isArray(value1) || Array.isArray(value2)) {
    return false;
  }

  return value1 === value2;
}
