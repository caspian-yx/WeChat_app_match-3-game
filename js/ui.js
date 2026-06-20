class UI {
  constructor(ctx) {
    this.ctx = ctx
    this.buttons = []
    this.images = {}
  }

  clearButtons() {
    this.buttons = []
  }

  addButton(id, x, y, width, height, text, style = {}) {
    const button = {
      id,
      x,
      y,
      width,
      height,
      text,
      style: {
        bgColor: style.bgColor || '#fff',
        textColor: style.textColor || '#333',
        fontSize: style.fontSize || 24,
        fontWeight: style.fontWeight || 'bold',
        borderRadius: style.borderRadius || 10,
        borderColor: style.borderColor || 'transparent',
        borderWidth: style.borderWidth || 0
      }
    }
    this.buttons.push(button)
    return button
  }

  drawButton(button) {
    const ctx = this.ctx
    const s = button.style

    ctx.fillStyle = s.bgColor
    ctx.beginPath()
    ctx.roundRect(button.x, button.y, button.width, button.height, s.borderRadius)
    ctx.fill()

    if (s.borderWidth > 0) {
      ctx.strokeStyle = s.borderColor
      ctx.lineWidth = s.borderWidth
      ctx.stroke()
    }

    ctx.fillStyle = s.textColor
    ctx.font = `${s.fontWeight} ${s.fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      button.text,
      button.x + button.width / 2,
      button.y + button.height / 2
    )
  }

  drawAllButtons() {
    this.buttons.forEach(button => this.drawButton(button))
  }

  checkButtonClick(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const btn = this.buttons[i]
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        return btn.id
      }
    }
    return null
  }

  drawText(text, x, y, style = {}) {
    const ctx = this.ctx
    ctx.fillStyle = style.color || '#fff'
    ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 20}px ${style.fontFamily || 'Arial'}`
    ctx.textAlign = style.align || 'left'
    ctx.textBaseline = style.baseline || 'top'
    ctx.fillText(text, x, y)
  }

  drawRect(x, y, width, height, style = {}) {
    const ctx = this.ctx
    ctx.fillStyle = style.fillColor || '#fff'
    if (style.borderRadius > 0) {
      ctx.beginPath()
      ctx.roundRect(x, y, width, height, style.borderRadius)
      ctx.fill()
    } else {
      ctx.fillRect(x, y, width, height)
    }
  }

  drawBackground(color) {
    const systemInfo = wx.getSystemInfoSync()
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, systemInfo.windowWidth, systemInfo.windowHeight)
  }

  loadImage(id, src, callback) {
    if (this.images[id]) {
      callback && callback(this.images[id])
      return
    }

    const image = wx.createImage()
    image.onload = () => {
      this.images[id] = image
      callback && callback(image)
    }
    image.onerror = () => {
      console.log('Image load failed:', src)
      callback && callback(null)
    }
    image.src = src
  }

  drawImage(id, x, y, width, height) {
    const image = this.images[id]
    if (image) {
      this.ctx.drawImage(image, x, y, width, height)
    }
  }

  drawCircle(x, y, radius, style = {}) {
    const ctx = this.ctx
    ctx.fillStyle = style.fillColor || '#fff'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fill()
  }

  drawStar(x, y, radius, color = '#ffd700') {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
      const px = x + Math.cos(angle) * radius
      const py = y + Math.sin(angle) * radius
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.closePath()
    ctx.fill()
  }
}

module.exports = UI