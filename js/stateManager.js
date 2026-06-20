const GameState = {
  LOADING: 'loading',
  MENU: 'menu',
  LEVEL_SELECT: 'levelSelect',
  STORY: 'story',
  PLAYING: 'playing',
  RESULT: 'result'
}

class StateManager {
  constructor() {
    this.currentState = GameState.LOADING
    this.data = {
      currentLevel: 1,
      score: 0,
      steps: 0,
      maxSteps: 30,
      targetScore: 1000,
      unlockedLevels: [1],
      levelStars: {},
      storyData: null,
      gameResult: null,
      stars: 0
    }
    this.listeners = []
  }

  setState(newState, data = {}) {
    const oldState = this.currentState
    this.currentState = newState

    if (data) {
      Object.assign(this.data, data)
    }

    this.notifyListeners(oldState, newState)
  }

  getState() {
    return this.currentState
  }

  getData() {
    return this.data
  }

  setData(key, value) {
    this.data[key] = value
  }

  getDataByKey(key) {
    return this.data[key]
  }

  addListener(callback) {
    this.listeners.push(callback)
  }

  removeListener(callback) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  notifyListeners(oldState, newState) {
    this.listeners.forEach(callback => {
      callback(oldState, newState)
    })
  }

  loadProgress() {
    try {
      const unlocked = wx.getStorageSync('unlockedLevels')
      const stars = wx.getStorageSync('levelStars')
      if (unlocked) {
        this.data.unlockedLevels = JSON.parse(unlocked)
      }
      if (stars) {
        this.data.levelStars = JSON.parse(stars)
      }
    } catch (e) {
      console.log('Load progress failed')
    }
  }

  saveProgress() {
    try {
      wx.setStorageSync('unlockedLevels', JSON.stringify(this.data.unlockedLevels))
      wx.setStorageSync('levelStars', JSON.stringify(this.data.levelStars))
    } catch (e) {
      console.log('Save progress failed')
    }
  }

  unlockLevel(levelId) {
    if (!this.data.unlockedLevels.includes(levelId)) {
      this.data.unlockedLevels.push(levelId)
      this.saveProgress()
    }
  }

  setLevelStars(levelId, stars) {
    if (!this.data.levelStars[levelId] || this.data.levelStars[levelId] < stars) {
      this.data.levelStars[levelId] = stars
      this.saveProgress()
    }
  }
}

module.exports = {
  GameState,
  StateManager
}