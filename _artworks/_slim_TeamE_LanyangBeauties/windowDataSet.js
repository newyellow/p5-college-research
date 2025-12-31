class WindowDataSet {
    constructor(_imageData, _curveData)
    {
        this.imageData = _imageData;
        this.curveReader = new CurveReader(_curveData);
        this.width = _imageData.width;
        this.height = _imageData.height;
        this.aspectRatio = this.width / this.height;
    }

    static async LoadWindowData (_imageUrl, _curveDataUrl)
    {
        let img = await loadImage(_imageUrl);
        let response = await fetch(_curveDataUrl);
        let curveData = await response.json();
        
        return new WindowDataSet(img, curveData);
    }
}

function getClosestWindowData(_rectAspectRatio)
{
  if (windowDataSetList.length === 0) return null;

  // 1. Calculate diffs for all images
  let candidates = windowDataSetList.map(data => {
    return {
      data: data,
      diff: Math.abs(data.aspectRatio - _rectAspectRatio)
    };
  });

  // 2. Sort by difference
  candidates.sort((a, b) => a.diff - b.diff);

  // 3. Find the minimum difference
  let minDiff = candidates[0].diff;

  // 4. Collect all candidates that are "close enough" to the best match
  
  let tolerance = 0.1; // 10% aspect ratio tolerance
  // If minDiff is very small, we might want a minimum floor for tolerance
  let effectiveTolerance = Math.max(minDiff * 1.1, minDiff + tolerance);

  let bestCandidates = candidates.filter(c => c.diff <= effectiveTolerance);

  // 5. Randomly pick one from the best candidates
  let selected = random(bestCandidates);
  
  return selected.data;
}