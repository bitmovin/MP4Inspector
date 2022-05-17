# MP4Inspector
<img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/l2q8nl1mv69fkeim79rl" alt="trackgit-views" />

# Installation

- In chrome navigate to chrome://extensions/ (edge://extensions/ for chromium edge)
- Enable developer mode
- Click `Load unpacked extension`
- Select the folder where you cloned this into


# Usage

After installation the Mp4Inspector should show up as a new tab in your DevTools.

## Filter Results
In order to narrow down the elements on the network column, there are two filter methods available.

### Filter by URL
Filters all entries to only show entries which have the filter entry as part of the URL.
![Filter by URL part](/readmeResources/UrlSearch.gif)

## Comparison View

This view lets you compare the boxes of two segments.
You can open it by selecting any two segments and pressing the compare button 
![compareViewButton](https://user-images.githubusercontent.com/29116195/168761137-867f8526-56fe-42e3-9103-ec755e3c580a.png)

The results will be color coded meaning:
```diff
+ Green for boxes which are the same in both segments
- Red for boxes / values which are different
! Orange for boxes which only exist in one of the segments
```

![Comparison view in action](/readmeResources/CompareView.gif)

