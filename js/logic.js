class Logic {
  constructor(rows, cols, elementTypes) {
    this.rows = rows
    this.cols = cols
    this.elementTypes = elementTypes
    this.grid = []
    this.selectedCell = null
    this.isProcessing = false
    this.steps = 0
    this.maxSteps = 30
    this.score = 0
    this.combo = 0

    this.onScoreChange = null
    this.onStepChange = null
    this.onCombo = null
    this.onGameEnd = null
    this.onGridUpdate = null
  }

  generateGrid() {
    this.grid = []
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = []
      for (let c = 0; c < this.cols; c++) {
        let item
        do {
          item = this.randomItem()
        } while (this.wouldMatch(r, c, item))
        this.grid[r][c] = {
          type: item,
          row: r,
          col: c,
          matched: false
        }
      }
    }
    return this.grid
  }

  randomItem() {
    return Math.floor(Math.random() * this.elementTypes)
  }

  wouldMatch(r, c, val) {
    if (c >= 2) {
      if (this.grid[r][c - 1]?.type === val && this.grid[r][c - 2]?.type === val) {
        return true
      }
    }
    if (r >= 2) {
      if (this.grid[r - 1]?.[c]?.type === val && this.grid[r - 2]?.[c]?.type === val) {
        return true
      }
    }
    return false
  }

  getGrid() {
    return this.grid
  }

  handleCellClick(row, col) {
    if (this.isProcessing) return null

    if (!this.selectedCell) {
      this.selectedCell = { row, col }
      return { selected: true }
    }

    if (this.selectedCell.row === row && this.selectedCell.col === col) {
      this.selectedCell = null
      return { deselected: true }
    }

    const dr = Math.abs(row - this.selectedCell.row)
    const dc = Math.abs(col - this.selectedCell.col)

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      const result = this.trySwap(this.selectedCell.row, this.selectedCell.col, row, col)
      this.selectedCell = null
      return { swapped: true, grid: this.grid }
    }

    this.selectedCell = { row, col }
    return { selected: true }
  }

  trySwap(r1, c1, r2, c2) {
    this.swap(r1, c1, r2, c2)

    const matches = this.findMatches()

    if (matches.length === 0) {
      this.swap(r1, c1, r2, c2)
      this.onGridUpdate?.(this.grid)
      return false
    }

    this.steps++
    this.onStepChange?.(this.steps)

    this.processMatches()

    return true
  }

  swap(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1].type
    this.grid[r1][c1].type = this.grid[r2][c2].type
    this.grid[r2][c2].type = temp
  }

  findMatches() {
    const matches = new Set()

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        const type = this.grid[r][c]?.type
        if (type !== undefined && type === this.grid[r][c + 1]?.type && type === this.grid[r][c + 2]?.type) {
          matches.add(`${r},${c}`)
          matches.add(`${r},${c + 1}`)
          matches.add(`${r},${c + 2}`)
          let k = c + 3
          while (k < this.cols && this.grid[r][k]?.type === type) {
            matches.add(`${r},${k}`)
            k++
          }
        }
      }
    }

    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        const type = this.grid[r][c]?.type
        if (type !== undefined && type === this.grid[r + 1][c]?.type && type === this.grid[r + 2][c]?.type) {
          matches.add(`${r},${c}`)
          matches.add(`${r + 1},${c}`)
          matches.add(`${r + 2},${c}`)
          let k = r + 3
          while (k < this.rows && this.grid[k]?.[c]?.type === type) {
            matches.add(`${k},${c}`)
            k++
          }
        }
      }
    }

    return Array.from(matches).map(pos => {
      const [r, c] = pos.split(',').map(Number)
      return { row: r, col: c }
    })
  }

  async processMatches() {
    let matches = this.findMatches()
    this.combo = 0

    while (matches.length > 0) {
      this.combo++

      matches.forEach(match => {
        this.grid[match.row][match.col].matched = true
      })

      this.onGridUpdate?.(this.grid)
      await this.delay(200)

      const baseScore = matches.length * 10
      const comboBonus = this.combo > 1 ? (this.combo - 1) * 50 : 0
      this.score += baseScore + comboBonus
      this.onScoreChange?.(this.score)

      if (this.combo > 1) {
        this.onCombo?.(this.combo)
      }

      this.clearMatched()
      await this.delay(100)

      this.drop()
      await this.delay(150)

      this.fill()
      await this.delay(100)

      this.onGridUpdate?.(this.grid)
      matches = this.findMatches()
    }

    if (this.steps >= this.maxSteps) {
      const targetScore = this.maxSteps * 50
      const result = this.score >= targetScore ? 'win' : 'lose'
      this.onGameEnd?.(result, this.score)
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  clearMatched() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].matched) {
          this.grid[r][c].type = -1
          this.grid[r][c].matched = false
        }
      }
    }
  }

  drop() {
    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c].type !== -1) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c].type = this.grid[r][c].type
            this.grid[r][c].type = -1
          }
          emptyRow--
        }
      }
    }
  }

  fill() {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c].type === -1) {
          this.grid[r][c].type = this.randomItem()
        }
      }
    }
  }

  getScore() {
    return this.score
  }

  getSteps() {
    return this.steps
  }

  getSelectedCell() {
    return this.selectedCell
  }

  update() {}
}

module.exports = Logic