const scriptToInject = 
`(function overWriteSourceBufferAppendData() {
  const originalAppendBuffer = SourceBuffer.prototype.appendBuffer;
  console.log('injecting' + chrome.runtime.id, SourceBuffer.prototype.appendBuffer);

  SourceBuffer.prototype.appendBuffer = function (data) {
    console.log('Append buffer called', this);
    chrome.runtime.sendMessage('${chrome.runtime.id}', {
      type: 'segment-appended',
      data: arrayBufferToBase64(data),
    });
    originalAppendBuffer.call(this, data);
  };
  function arrayBufferToBase64(arrayBuffer) {
    let base64String = '';
    const data = new Uint8Array(arrayBuffer);

    for (let idx = 0; idx < data.length; idx++) {
      base64String += String.fromCharCode(data[idx]);
    }

    return window.btoa(base64String);
  }
})();`;

console.log('Injecting script to overwrite SourceBuffer.appendBuffer');

const script = document.createElement('script');
script.textContent = scriptToInject;
document.documentElement.appendChild(script);
