class Grid {
  constructor(rows, cols) {
    this.rows = rows
    this.cols = cols
    this.cells = []
    this.init()
  }

  init() {
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = []
      for (let c = 0; c < this.cols; c++) {
        let item
        do {
          item = this.randomItem()
        } while (this.wouldMatch(r, c, item))
        this.cells[r][c] = {
          type: item,
          row: r,
          col: c,
          matched: false,
          falling: false,
          new: false
        }
      }
    }
  }

  randomItem() {
    return Math.floor(Math.random() * 5)
  }

  wouldMatch(r, c, val) {
    if (c >= 2) {
      if (this.cells[r][c - 1]?.type === val && this.cells[r][c - 2]?.type === val) {
        return true
      }
    }
    if (r >= 2) {
      if (this.cells[r - 1]?.[c]?.type === val && this.cells[r - 2]?.[c]?.type === val) {
        return true
      }
    }
    return false
  }

  get(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
      return null
    }
    return this.cells[r][c]
  }

  set(r, c, val) {
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
      this.cells[r][c].type = val
      this.cells[r][c].matched = false
      this.cells[r][c].falling = false
      this.cells[r][c].new = false
    }
  }

  swap(r1, c1, r2, c2) {
    const temp = this.cells[r1][c1].type
    this.cells[r1][c1].type = this.cells[r2][c2].type
    this.cells[r2][c2].type = temp
  }

  clearMatched() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].matched) {
          this.cells[r][c].type = -1
          this.cells[r][c].matched = false
        }
      }
    }
  }

  drop() {
    let dropped = false
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.cells[r][c].type !== -1) {
          if (r !== emptyRow) {
            this.cells[emptyRow][c].type = this.cells[r][c].type
            this.cells[emptyRow][c].falling = true
            this.cells[r][c].type = -1
            dropped = true
          }
          emptyRow--
        }
      }
    }
    return dropped
  }

  fill() {
    let filled = false
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.cells[r][c].type === -1) {
          this.cells[r][c].type = this.randomItem()
          this.cells[r][c].new = true
          filled = true
        }
      }
    }
    return filled
  }
}

module.exports = Grid