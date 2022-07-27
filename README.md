# MP4Inspector

[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE.md)
[![Release](https://badgen.net/github/release/bitmovin/MP4Inspector/stable)](https://github.com/bitmovin/MP4Inspector/releases/latest)
![TrackGit Views](https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/l2q8nl1mv69fkeim79rl)

A Chrome extension to help you inspect MP4 video content and find irregularities in video streams.

# Installation

- In chrome navigate to chrome://extensions/ (edge://extensions/ for chromium edge)
- Enable developer mode
- Click `Load unpacked extension`
- Select the folder where you cloned this into

# Usage

After installation the MP4Inspector should show up as a new tab in your DevTools.

## Filter Results
In order to narrow down the elements on the network column, there are two filter methods available [File name](#filter-by-url) and [box name](#filter-by-mp4-box). They can also be combined to only show entries which match both filter entries.

### Filter by URL
Filters all entries to only show entries which have their URL partially matching the entered value.
![Filter by URL part](/readmeResources/UrlSearch.gif)

### Filter by MP4 Box
Filters all entries to only show entries which contain a box with the exact value in the search field.
![Filter by URL part](/readmeResources/BoxSearch.gif)

## Comparison View

This view lets you compare the boxes of two segments.
You can open it by selecting any two segments and pressing the compare button

![compareViewButton](/readmeResources/compareViewButton.png)

The results will be color coded meaning:
```diff
+ Green for boxes which are the same in both segments
- Red for boxes / values which are different
! Orange for boxes which only exist in one of the segments
```

![Comparison view in action](/readmeResources/CompareView.gif)

## Download segments
For more detailed inspection (eg: FFProbe or crafting a test asset), the MP4Inspector offers the possibility to download segments. You can select one or multiple entries in the network column and click the download button. A download will be started for each selected entry, but Chrome will only allow 10 downloads at a time.

There is also the possiblity to concatenate segments, which can be used to create a playable part of the asset by combining the init segment with any number of data segments. Currently muxing is not supported, so you have to ensure that only audio or video segments are selected.

![Download possibilities](/readmeResources/download.gif)

# Capturing generated data

In case a transmuxing step is executed and the MP4 data structure is not available at the time of downloading or if the player rewrites MP4 data, it might be interesting to inspect the data which gets pushed into the `SourceBuffer`s.
To enable this functionality, the MP4Inspector comes with a code injection approach, which overwrites `SourceBuffer.prototype.appendBuffer` and sends the appended data to the extension. As code injection is quite the dangerous territory, the URLs for this functionality have to be allow-listed in the `manifest.json` file under `host_permissions` (to allow the injection) and `externally_connectable` (to allow communication with the extension).
By default this is enabled for localhost, if you need any more URLs, you will have to add them to the manifest. Check https://developer.chrome.com/docs/extensions/mv3/permission_warnings/#permissions_with_warnings for more information.


# Join the Community

If you have any questions or want to share feedback please feel free to join the [Bitmovin Community](https://community.bitmovin.com)
