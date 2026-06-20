const UI = require('./ui.js')
const { GameState } = require('./stateManager.js')

class GameRender {
  constructor(ctx, stateManager, dataLoader) {
    this.ctx = ctx
    this.stateManager = stateManager
    this.dataLoader = dataLoader
    this.ui = new UI(ctx)
    this.cellSize = 60
    this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#DDA0DD']
    this.selectedCell = null
    this.showCombo = false
    this.comboValue = 0
  }

  render() {
    const state = this.stateManager.getState()
    this.ui.clearButtons()
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

    switch (state) {
      case GameState.LOADING:
        this.renderLoading()
        break
      case GameState.MENU:
        this.renderMenu()
        break
      case GameState.LEVEL_SELECT:
        this.renderLevelSelect()
        break
      case GameState.STORY:
        this.renderStory()
        break
      case GameState.PLAYING:
        this.renderPlaying()
        break
      case GameState.RESULT:
        this.renderResult()
        break
    }
  }

  renderLoading() {
    this.ui.drawBackground('#667eea')

    const systemInfo = wx.getSystemInfoSync()
    const centerX = systemInfo.windowWidth / 2
    const centerY = systemInfo.windowHeight / 2

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('正在加载...', centerX, centerY)

    this.ctx.font = '20px Arial'
    this.ctx.fillText('请稍候', centerX, centerY + 40)
  }

  renderMenu() {
    this.ui.drawBackground('#667eea')

    const systemInfo = wx.getSystemInfoSync()
    const centerX = systemInfo.windowWidth / 2
    const centerY = systemInfo.windowHeight / 2

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🎮 消消乐', centerX, centerY - 100)

    this.ctx.font = '24px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.fillText('广东城市之旅', centerX, centerY - 50)

    const btnWidth = 200
    const btnHeight = 60
    const btnX = centerX - btnWidth / 2
    const btnY = centerY + 20

    this.ui.addButton('start', btnX, btnY, btnWidth, btnHeight, '开始游戏', {
      bgColor: '#fff',
      textColor: '#667eea',
      fontSize: 28,
      borderRadius: 30
    })

    this.ui.drawAllButtons()
  }

  renderLevelSelect() {
    this.ui.drawBackground('#667eea')

    const systemInfo = wx.getSystemInfoSync()
    const centerX = systemInfo.windowWidth / 2

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 36px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('选择关卡', centerX, 60)

    const levels = this.dataLoader.getAllLevels()
    const data = this.stateManager.getData()
    const unlockedLevels = data.unlockedLevels || [1]
    const levelStars = data.levelStars || {}

    const btnWidth = 80
    const btnHeight = 100
    const padding = 15
    const totalWidth = 4 * (btnWidth + padding) - padding
    const startX = (systemInfo.windowWidth - totalWidth) / 2
    const startY = 120

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]
      const row = Math.floor(i / 4)
      const col = i % 4
      const x = startX + col * (btnWidth + padding)
      const y = startY + row * (btnHeight + padding)

      const unlocked = unlockedLevels.includes(level.id)
      const stars = levelStars[level.id] || 0

      this.ui.addButton(`level_${level.id}`, x, y, btnWidth, btnHeight, '', {
        bgColor: unlocked ? '#fff' : 'rgba(255, 255, 255, 0.3)',
        textColor: unlocked ? '#333' : 'rgba(0, 0, 0, 0.3)',
        fontSize: 24,
        borderRadius: 15
      })

      this.ui.drawButton({
        id: `level_${level.id}`,
        x, y, width: btnWidth, height: btnHeight, text: '',
        style: {
          bgColor: unlocked ? '#fff' : 'rgba(255, 255, 255, 0.3)',
          textColor: '#333',
          fontSize: 24,
          borderRadius: 15
        }
      })

      this.ctx.fillStyle = unlocked ? '#333' : 'rgba(0, 0, 0, 0.3)'
      this.ctx.font = 'bold 28px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(level.id.toString(), x + btnWidth / 2, y + 35)

      this.ctx.font = '16px Arial'
      this.ctx.fillStyle = unlocked ? '#666' : 'rgba(0, 0, 0, 0.3)'
      this.ctx.fillText(level.name, x + btnWidth / 2, y + 55)

      const starY = y + 75
      for (let s = 0; s < 3; s++) {
        const starX = x + btnWidth / 2 - 20 + s * 20
        if (s < stars) {
          this.ctx.fillStyle = '#ffd700'
        } else {
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        }
        this.drawStarIcon(starX, starY, 8)
      }
    }

    this.ui.addButton('back', 20, systemInfo.windowHeight - 80, 100, 50, '← 返回', {
      bgColor: 'rgba(255, 255, 255, 0.2)',
      textColor: '#fff',
      fontSize: 18,
      borderRadius: 10
    })
    this.ui.drawAllButtons()
  }

  drawStarIcon(x, y, size) {
    this.ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
      const px = x + Math.cos(angle) * size
      const py = y + Math.sin(angle) * size
      if (i === 0) {
        this.ctx.moveTo(px, py)
      } else {
        this.ctx.lineTo(px, py)
      }
    }
    this.ctx.closePath()
    this.ctx.fill()
  }

  renderStory() {
    this.ui.drawBackground('#1a1a2e')

    const data = this.stateManager.getData()
    const story = this.dataLoader.getStoryByLevelId(data.currentLevel)

    if (!story) {
      this.stateManager.setState(GameState.PLAYING)
      return
    }

    const systemInfo = wx.getSystemInfoSync()
    const centerX = systemInfo.windowWidth / 2

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(story.title || '剧情', centerX, 100)

    this.ctx.font = '20px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    this.ctx.fillText('—— ' + (story.character || '旁白'), centerX, 150)

    this.ctx.font = '24px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    this.ctx.textAlign = 'left'

    const lines = this.wrapText(story.content || '', 18)
    let y = 220
    lines.forEach(line => {
      this.ctx.fillText(line, 40, y)
      y += 38
    })

    const btnWidth = 200
    const btnHeight = 60
    const btnX = centerX - btnWidth / 2
    const btnY = systemInfo.windowHeight - 150

    this.ui.addButton('continue', btnX, btnY, btnWidth, btnHeight, '继续游戏 →', {
      bgColor: '#667eea',
      textColor: '#fff',
      fontSize: 24,
      borderRadius: 30
    })
    this.ui.drawAllButtons()
  }

  wrapText(text, maxCharsPerLine) {
    const lines = []
    const paragraphs = text.split('\n')

    paragraphs.forEach(para => {
      const words = para.split('')
      let currentLine = ''

      for (let char of words) {
        if (currentLine.length >= maxCharsPerLine) {
          lines.push(currentLine)
          currentLine = ''
        }
        currentLine += char
      }

      if (currentLine) {
        lines.push(currentLine)
      }
    })

    return lines
  }

  renderPlaying() {
    const data = this.stateManager.getData()
    const level = this.dataLoader.getLevelById(data.currentLevel)

    if (!level) {
      this.ui.drawBackground('#667eea')
      this.ctx.fillStyle = '#fff'
      this.ctx.font = 'bold 24px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('关卡数据加载失败', 150, 200)
      return
    }

    this.ui.drawBackground('#667eea')

    const systemInfo = wx.getSystemInfoSync()

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText('←', 20, 40)

    this.ctx.textAlign = 'center'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.fillText(level.name, systemInfo.windowWidth / 2, 40)

    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.fillText(`分数: ${data.score}`, systemInfo.windowWidth - 20, 40)

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    this.ui.drawRect(30, 70, 120, 50, { borderRadius: 10 })
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('步数', 90, 85)
    this.ctx.font = 'bold 20px Arial'
    this.ctx.fillText(`${data.steps}/${data.maxSteps}`, 90, 108)

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    this.ui.drawRect(systemInfo.windowWidth - 150, 70, 120, 50, { borderRadius: 10 })
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'center'
    const targetText = data.score >= data.targetScore ? '✓' : data.targetScore.toString()
    this.ctx.fillText('目标', systemInfo.windowWidth - 90, 85)
    this.ctx.font = 'bold 20px Arial'
    this.ctx.fillText(targetText, systemInfo.windowWidth - 90, 108)

    this.renderGameBoard(level)

    if (this.showCombo) {
      this.ctx.fillStyle = '#ffd700'
      this.ctx.font = 'bold 60px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.globalAlpha = 0.8
      this.ctx.fillText(`${this.comboValue}x Combo!`, systemInfo.windowWidth / 2, systemInfo.windowHeight / 2)
      this.ctx.globalAlpha = 1
    }
  }

  renderGameBoard(level) {
    const data = this.stateManager.getData()
    const grid = data.grid

    console.log('renderGameBoard - level:', level)
    console.log('renderGameBoard - grid:', grid)

    if (!grid) {
      this.ctx.fillStyle = '#fff'
      this.ctx.font = '16px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('网格数据为空', this.ctx.canvas.width / 2, 200)
      return
    }

    const cellSize = Math.min(50, (this.ctx.canvas.width - 60) / level.cols)
    const boardWidth = level.cols * cellSize
    const boardHeight = level.rows * cellSize
    const boardX = (this.ctx.canvas.width - boardWidth) / 2
    const boardY = 140

    this.ui.drawRect(boardX - 10, boardY - 10, boardWidth + 20, boardHeight + 20, {
      fillColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 15
    })

    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const cell = grid[r]?.[c]
        if (!cell) {
          continue
        }

        const x = boardX + c * cellSize
        const y = boardY + r * cellSize
        const isSelected = this.selectedCell && this.selectedCell.row === r && this.selectedCell.col === c

        if (isSelected) {
          this.ui.drawRect(x - 3, y - 3, cellSize + 6, cellSize + 6, {
            fillColor: '#ffd700',
            borderRadius: 8
          })
        }

        if (cell.type !== -1 && cell.type !== undefined) {
          this.ui.drawRect(x, y, cellSize - 3, cellSize - 3, {
            fillColor: this.colors[cell.type] || '#ccc',
            borderRadius: 8
          })
        }
      }
    }
  }

  renderResult() {
    this.ui.drawBackground('rgba(0, 0, 0, 0.7)')

    const data = this.stateManager.getData()
    const systemInfo = wx.getSystemInfoSync()
    const centerX = systemInfo.windowWidth / 2
    const centerY = systemInfo.windowHeight / 2

    const panelWidth = 300
    const panelHeight = 380
    const panelX = centerX - panelWidth / 2
    const panelY = centerY - panelHeight / 2

    this.ui.drawRect(panelX, panelY, panelWidth, panelHeight, {
      fillColor: '#fff',
      borderRadius: 20
    })

    const isWin = data.gameResult === 'win'

    this.ctx.fillStyle = isWin ? '#667eea' : '#999'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(isWin ? '🎉 恭喜通关！' : '😢 挑战失败', centerX, panelY + 60)

    this.ctx.fillStyle = '#ffd700'
    const stars = data.stars || 0
    for (let i = 0; i < 3; i++) {
      const starX = centerX - 40 + i * 40
      this.drawStarIcon(starX, panelY + 110, 15)
    }

    this.ctx.fillStyle = '#666'
    this.ctx.font = '24px Arial'
    this.ctx.fillText(`得分: ${data.score}`, centerX, panelY + 170)

    this.ui.addButton('retry', panelX + 20, panelY + 220, 120, 50, '重试', {
      bgColor: '#667eea',
      textColor: '#fff',
      fontSize: 22,
      borderRadius: 25
    })
    this.ui.drawAllButtons()

    this.ui.addButton('back', panelX + 160, panelY + 220, 120, 50, '返回', {
      bgColor: '#ddd',
      textColor: '#666',
      fontSize: 22,
      borderRadius: 25
    })
    this.ui.drawAllButtons()
  }

  setSelectedCell(cell) {
    this.selectedCell = cell
  }

  setCombo(show, value) {
    this.showCombo = show
    this.comboValue = value
  }

  checkClick(x, y) {
    return this.ui.checkButtonClick(x, y)
  }

  getUI() {
    return this.ui
  }
}

module.exports = GameRender