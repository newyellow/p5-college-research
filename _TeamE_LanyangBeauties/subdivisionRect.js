
class SubRect {
  constructor(x, y, w, h, depth) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.depth = depth;
    this.children = [];
    this.padding = 0; // Add padding attribute
  }

  // Check if this is a leaf node
  isLeaf() {
    return this.children.length === 0;
  }

  // Get all leaf nodes as a flat array
  getLeaves() {
    if (this.isLeaf()) {
      return [this];
    }
    let leaves = [];
    for (let child of this.children) {
      leaves = leaves.concat(child.getLeaves());
    }
    return leaves;
  }

  // Draw outline
  drawOutline() {
    let px = this.x + this.padding;
    let py = this.y + this.padding;
    let pw = this.w - this.padding * 2;
    let ph = this.h - this.padding * 2;
    
    if (pw <= 0 || ph <= 0) return;

    // Use p5 line if available
    if (typeof line === 'function') {
      line(px, py, px + pw, py);
      line(px + pw, py, px + pw, py + ph);
      line(px + pw, py + ph, px, py + ph);
      line(px, py + ph, px, py);
    }
  }

  // Draw solid rect
  drawRect() {
    let px = this.x + this.padding;
    let py = this.y + this.padding;
    let pw = this.w - this.padding * 2;
    let ph = this.h - this.padding * 2;
    
    if (pw <= 0 || ph <= 0) return;
    
    if (typeof rect === 'function') {
      // Assuming CENTER mode if not specified, but this uses corner coordinates
      // Need to adjust for center mode if p5 sketch uses it, but here we calculate center
      let cx = px + pw / 2;
      let cy = py + ph / 2;
      rect(cx, cy, pw, ph);
    }
  }

  // Draw image
  drawImage(img) {
    if (!img) return;

    let px = this.x + this.padding;
    let py = this.y + this.padding;
    let pw = this.w - this.padding * 2;
    let ph = this.h - this.padding * 2;
    
    if (pw <= 0 || ph <= 0) return;

    if (typeof image === 'function') {
       // Assuming CENTER mode if that's what the sketch uses
       let cx = px + pw / 2;
       let cy = py + ph / 2;
       image(img, cx, cy, pw, ph);
    }
  }
}

class SubdivisionRect {
  constructor(x, y, w, h, config = {}) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    // Configuration
    this.minDepth = config.minDepth !== undefined ? config.minDepth : 2;
    this.maxDepth = config.maxDepth !== undefined ? config.maxDepth : 6;
    this.splitRatioMin = config.splitRatioMin !== undefined ? config.splitRatioMin : 0.3;
    this.splitRatioMax = config.splitRatioMax !== undefined ? config.splitRatioMax : 0.7;
    // Chance to stop splitting even if maxDepth is not reached (after minDepth)
    this.splitChance = config.splitChance !== undefined ? config.splitChance : 0.9;
    this.padding = config.padding !== undefined ? config.padding : 0; // Config padding
    this.minSize = config.minSize !== undefined ? config.minSize : 10; // Config minSize
    
    this.root = null;
  }

  generate() {
    this.root = this._recursiveDivide(this.x, this.y, this.w, this.h, 0);
    return this.root; // Return the tree root
  }

  getLeaves() {
    if (!this.root) this.generate();
    return this.root.getLeaves();
  }

  _recursiveDivide(x, y, w, h, depth) {
    let node = new SubRect(x, y, w, h, depth);
    node.padding = this.padding; // Propagate padding

    // Stop if max depth reached
    if (depth >= this.maxDepth) {
      return node;
    }
    
    // Stop if too small
    if (w < this.minSize || h < this.minSize) {
        return node;
    }

    // Determine if we should split
    let shouldSplit = false;
    if (depth < this.minDepth) {
      shouldSplit = true; // Must split
    } else {
      // Random chance to split
      // Use p5 random if available, else Math.random
      let r = (typeof random === 'function') ? random() : Math.random();
      shouldSplit = r < this.splitChance;
    }

    if (shouldSplit) {
      // Decide split direction
      // 1. Can force direction based on aspect ratio to avoid very thin rectangles
      // 2. Or random
      let splitVertical;
      
      if (w > h * 1.5) {
        splitVertical = true; // Split vertically (create left/right) if too wide
      } else if (h > w * 1.5) {
        splitVertical = false; // Split horizontally (create top/bottom) if too tall
      } else {
        // Random direction
        let r = (typeof random === 'function') ? random() : Math.random();
        splitVertical = r > 0.5;
      }

      // Determine split ratio
      let rRatio = (typeof random === 'function') ? random() : Math.random();
      // Map 0-1 to splitRatioMin-splitRatioMax
      let ratio = this.splitRatioMin + rRatio * (this.splitRatioMax - this.splitRatioMin);

      if (splitVertical) {
        let w1 = w * ratio;
        let w2 = w - w1;
        // Check if child nodes would be too small
        if (w1 < this.minSize || w2 < this.minSize) {
             return node; // Cancel split if too small
        }
        node.children.push(this._recursiveDivide(x, y, w1, h, depth + 1));
        node.children.push(this._recursiveDivide(x + w1, y, w2, h, depth + 1));
      } else {
        let h1 = h * ratio;
        let h2 = h - h1;
        // Check if child nodes would be too small
        if (h1 < this.minSize || h2 < this.minSize) {
             return node; // Cancel split if too small
        }
        node.children.push(this._recursiveDivide(x, y, w, h1, depth + 1));
        node.children.push(this._recursiveDivide(x, y + h1, w, h2, depth + 1));
      }
    }

    return node;
  }
}
