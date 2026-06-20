const GameState = {
  LOGIN: 'login',
  REGISTER: 'register',
  LOGIN_FORM: 'login_form',
  MENU: 'menu',
  MAP: 'map',
  STORY: 'story',
  PLAYING: 'playing',
  CHOICE: 'choice',
  RESULT: 'result',
  SHOP: 'shop',
  COLLECTION: 'collection',
  LEADERBOARD: 'leaderboard',
  FRIEND_SEARCH: 'friend_search',
  FRIEND_REQUESTS: 'friend_requests',
  SETTINGS: 'settings'
}

class DataLoader {
  constructor() {
    this.levels = []
    this.stories = []
  }

  loadAll() {
    try {
      const levelsData = wx.getFileSystemManager().readFileSync('./data/levels.json', 'utf8')
      this.levels = JSON.parse(levelsData).levels || this.getDefaultLevels()
    } catch (e) {
      this.levels = this.getDefaultLevels()
    }

    try {
      const storiesData = wx.getFileSystemManager().readFileSync('./data/stories.json', 'utf8')
      this.stories = JSON.parse(storiesData).stories || []
    } catch (e) {
      this.stories = []
    }
  }

  getDefaultLevels() {
    return [
      { id: 1, name: '教程关', icon: '📖', rows: 4, cols: 4, maxSteps: 15, targetScore: 300, elementTypes: 3 },
      { id: 2, name: '深圳', icon: '🏙️', rows: 5, cols: 5, maxSteps: 18, targetScore: 500, elementTypes: 4 },
      { id: 3, name: '东莞', icon: '🏭', rows: 5, cols: 5, maxSteps: 20, targetScore: 650, elementTypes: 4 },
      { id: 4, name: '珠海', icon: '🌊', rows: 5, cols: 6, maxSteps: 22, targetScore: 850, elementTypes: 4 },
      { id: 5, name: '中山', icon: '🏯', rows: 6, cols: 6, maxSteps: 25, targetScore: 1100, elementTypes: 5 },
      { id: 6, name: '江门', icon: '🌉', rows: 6, cols: 6, maxSteps: 28, targetScore: 1400, elementTypes: 5 },
      { id: 7, name: '佛山', icon: '🗿', rows: 6, cols: 7, maxSteps: 32, targetScore: 1800, elementTypes: 5 },
      { id: 8, name: '广州', icon: '🗼', rows: 7, cols: 7, maxSteps: 35, targetScore: 2200, elementTypes: 6 }
    ]
  }

  getLevelById(id) {
    return this.levels.find(l => l.id === id)
  }

  getStoryByLevelId(levelId) {
    return this.stories.find(s => s.levelId === levelId)
  }
}

class Main {
  constructor() {
    this.canvas = wx.createCanvas()
    this.ctx = this.canvas.getContext('2d')

    const systemInfo = wx.getSystemInfoSync()
    this.screenWidth = systemInfo.windowWidth
    this.screenHeight = systemInfo.windowHeight
    this.canvas.width = this.screenWidth
    this.canvas.height = this.screenHeight

    this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#DDA0DD']
    this.dataLoader = new DataLoader()
    this.dataLoader.loadAll()

    this.gameState = GameState.LOGIN
    this.loginType = null
    this.currentLevel = 1
    this.unlockedLevels = this.loadUnlockedLevels()
    this.levelStars = this.loadLevelStars()
    this.levelScores = this.loadLevelScores()
    this.coins = this.loadCoins()

    this.clothes = this.loadClothes()
    this.currentClothes = this.loadCurrentClothes()
    this.collection = this.loadCollection()
    this.backgroundColors = ['#90EE90', '#87CEEB', '#FFE4E1', '#E0FFE0', '#FFFACD', '#DDA0DD', '#ADD8E6', '#F0E68C']
    this.currentBgIndex = this.loadBgIndex()

    this.grid = null
    this.selectedCell = null
    this.isProcessing = false
    this.score = 0
    this.steps = 0
    this.maxSteps = 20
    this.targetScore = 500
    this.combo = 0
    this.showCombo = false
    this.gameResult = null
    this.targetReached = false

    this.audioContext = null
    this.initAudio()

    this.storyData = null
    this.currentDialogueIndex = 0

    this.mapOffset = 0
    this.startX = 0

    this.username = ''
    this.password = ''
    this.confirmPassword = ''
    this.searchFriendName = ''
    this.isLoggedIn = false
    this.currentUser = null
    this.friends = this.loadFriends()
    this.friendRequests = this.loadFriendRequests()
    this.totalScore = this.calculateTotalScore()
    this.activeInput = null

    this.bindEvents()
    this.loop()
  }

  calculateTotalScore() {
    let total = 0
    for (const levelId in this.levelScores) {
      total += this.levelScores[levelId] || 0
    }
    return total
  }

  loadFriends(username = null) {
    const user = username || this.currentUser?.username
    if (!user) return []
    try {
      const data = wx.getStorageSync('friends_' + user)
      return data ? JSON.parse(data) : []
    } catch (e) {
      return []
    }
  }

  saveFriends() {
    if (this.currentUser) {
      wx.setStorageSync('friends_' + this.currentUser.username, JSON.stringify(this.friends))
    }
  }

  loadUsers() {
    try {
      const data = wx.getStorageSync('users')
      return data ? JSON.parse(data) : []
    } catch (e) {
      return []
    }
  }

  saveUsers(users) {
    wx.setStorageSync('users', JSON.stringify(users))
  }

  loadFriendRequests(username = null) {
    const user = username || this.currentUser?.username
    if (!user) return []
    try {
      const data = wx.getStorageSync('friendRequests_' + user)
      return data ? JSON.parse(data) : []
    } catch (e) {
      return []
    }
  }

  saveFriendRequests() {
    if (this.currentUser) {
      wx.setStorageSync('friendRequests_' + this.currentUser.username, JSON.stringify(this.friendRequests))
    }
  }

  sendFriendRequest(targetUsername) {
    const request = {
      from: this.currentUser.username,
      fromAvatar: this.currentUser.avatar,
      to: targetUsername,
      status: 'pending',
      timestamp: Date.now()
    }
    
    this.friendRequests.push(request)
    this.saveFriendRequests()

    const targetRequests = this.loadFriendRequests(targetUsername)
    targetRequests.push(request)
    wx.setStorageSync('friendRequests_' + targetUsername, JSON.stringify(targetRequests))
  }

  getWechatFriends() {
    wx.getFriendCloudStorage({
      success: (res) => {
        const friendsData = res.data || []
        const wechatFriends = friendsData.map(f => ({
          username: f.nickname,
          avatar: f.avatarUrl || '👤',
          score: parseInt(f.KVDataList.find(kv => kv.key === 'totalScore')?.value) || 0
        }))
        
        wechatFriends.forEach(friend => {
          if (friend.username !== this.currentUser.username) {
            const isAlreadyFriend = this.friends.some(f => f.username === friend.username)
            if (!isAlreadyFriend) {
              this.friends.push({
                username: friend.username,
                avatar: friend.avatar,
                score: friend.score
              })
            }
          }
        })
        
        this.saveFriends()
        wx.showToast({ title: '已同步微信好友', icon: 'success' })
      },
      fail: (err) => {
        console.log('获取微信好友失败:', err)
      }
    })
  }

  showInputDialog(title, callback, isPassword = false) {
    wx.showModal({
      title: title,
      editable: true,
      placeholderText: isPassword ? '请输入密码' : '请输入内容',
      password: isPassword,
      success: (res) => {
        if (res.confirm && res.content) {
          callback(res.content)
        }
      }
    })
  }

  loadUserData(username) {
    try {
      const data = wx.getStorageSync('user_' + username)
      if (data) {
        const userData = JSON.parse(data)
        this.unlockedLevels = userData.unlockedLevels || [1]
        this.levelStars = userData.levelStars || {}
        this.levelScores = userData.levelScores || {}
        this.coins = userData.coins || 1000
        this.clothes = userData.clothes || []
        this.currentClothes = userData.currentClothes || 1
        this.collection = userData.collection || {}
      }
    } catch (e) {
      console.log('Load user data failed:', e)
    }
    this.friends = this.loadFriends(username)
    this.friendRequests = this.loadFriendRequests(username)
  }

  saveUserData() {
    if (this.currentUser) {
      const userData = {
        unlockedLevels: this.unlockedLevels,
        levelStars: this.levelStars,
        levelScores: this.levelScores,
        coins: this.coins,
        clothes: this.clothes,
        currentClothes: this.currentClothes,
        collection: this.collection
      }
      wx.setStorageSync('user_' + this.currentUser.username, JSON.stringify(userData))
    }
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.log('Audio context not supported')
    }
  }

  playMoveSound() {
    if (!this.audioContext) return
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime)
    oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.05)
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  playMatchSound() {
    if (!this.audioContext) return
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime)
    oscillator.frequency.setValueAtTime(1100, this.audioContext.currentTime + 0.05)
    oscillator.frequency.setValueAtTime(1320, this.audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.15)
  }

  playComboSound(combo) {
    if (!this.audioContext) return
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    const baseFreq = 440 + combo * 100
    oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime)
    oscillator.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(baseFreq * 2, this.audioContext.currentTime + 0.2)
    
    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.3)
  }

  loadUnlockedLevels() {
    try {
      const data = wx.getStorageSync('unlockedLevels')
      return data ? JSON.parse(data) : [1]
    } catch (e) {
      return [1]
    }
  }

  loadLevelStars() {
    try {
      const data = wx.getStorageSync('levelStars')
      return data ? JSON.parse(data) : {}
    } catch (e) {
      return {}
    }
  }

  loadCoins() {
    try {
      const data = wx.getStorageSync('coins')
      return data ? parseInt(data) : 1000
    } catch (e) {
      return 1000
    }
  }

  saveUnlockedLevels() {
    wx.setStorageSync('unlockedLevels', JSON.stringify(this.unlockedLevels))
  }

  saveLevelStars() {
    wx.setStorageSync('levelStars', JSON.stringify(this.levelStars))
  }

  loadLevelScores() {
    try {
      const data = wx.getStorageSync('levelScores')
      return data ? JSON.parse(data) : {}
    } catch (e) {
      return {}
    }
  }

  saveLevelScores() {
    wx.setStorageSync('levelScores', JSON.stringify(this.levelScores))
  }

  saveCoins() {
    wx.setStorageSync('coins', this.coins.toString())
  }

  loadClothes() {
    const defaultClothes = [
      { id: 1, name: '休闲装', emoji: '👕', price: 0, owned: true },
      { id: 2, name: '运动装', emoji: '🏃', price: 200, owned: false },
      { id: 3, name: '礼服', emoji: '👗', price: 500, owned: false },
      { id: 4, name: '古装', emoji: '👘', price: 800, owned: false },
      { id: 5, name: '魔法装', emoji: '🧙', price: 1200, owned: false },
      { id: 6, name: '未来装', emoji: '🤖', price: 1500, owned: false }
    ]
    try {
      const data = wx.getStorageSync('clothes')
      return data ? JSON.parse(data) : defaultClothes
    } catch (e) {
      return defaultClothes
    }
  }

  saveClothes() {
    wx.setStorageSync('clothes', JSON.stringify(this.clothes))
  }

  loadCurrentClothes() {
    try {
      const data = wx.getStorageSync('currentClothes')
      return data ? parseInt(data) : 1
    } catch (e) {
      return 1
    }
  }

  saveCurrentClothes() {
    wx.setStorageSync('currentClothes', this.currentClothes.toString())
  }

  loadCollection() {
    try {
      const data = wx.getStorageSync('collection')
      return data ? JSON.parse(data) : {}
    } catch (e) {
      return {}
    }
  }

  saveCollection() {
    wx.setStorageSync('collection', JSON.stringify(this.collection))
  }

  loadBgIndex() {
    try {
      const data = wx.getStorageSync('bgIndex')
      return data ? parseInt(data) : 0
    } catch (e) {
      return 0
    }
  }

  saveBgIndex() {
    wx.setStorageSync('bgIndex', this.currentBgIndex.toString())
  }

  bindEvents() {
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      this.handleTouchStart(touch.clientX, touch.clientY)
    })

    this.canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0]
      this.handleTouchMove(touch.clientX, touch.clientY)
    })

    this.canvas.addEventListener('touchend', () => {
      this.handleTouchEnd()
    })
  }

  handleTouchStart(x, y) {
    this.startX = x
    this.touchX = x

    if (this.gameState === GameState.LOGIN) {
      const btnWidth = this.screenWidth - 80
      const btnHeight = 60
      const btnY = 300

      if (this.isInButton(x, y, 40, btnY, btnWidth, btnHeight)) {
        this.loginType = 'wechat'
        
        const handleLoginSuccess = (userInfo) => {
          this.isLoggedIn = true
          this.currentUser = { 
            username: userInfo.nickName || userInfo.nickname || '微信用户', 
            avatar: userInfo.avatarUrl || userInfo.avatar || '👤',
            isWechatUser: true
          }
          
          const users = this.loadUsers()
          const existingUser = users.find(u => u.username === this.currentUser.username)
          if (!existingUser) {
            users.push({ 
              username: this.currentUser.username, 
              password: '', 
              avatar: this.currentUser.avatar,
              isWechatUser: true
            })
            this.saveUsers(users)
          }
          
          this.friends = this.loadFriends(this.currentUser.username)
          this.friendRequests = this.loadFriendRequests(this.currentUser.username)
          
          this.loadUserData(this.currentUser.username)
          wx.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            this.gameState = GameState.MENU
          }, 1000)
        }
        
        const handleLoginFail = (err) => {
          console.log('微信登录失败:', err)
          wx.showModal({
            title: '登录提示',
            content: '微信登录暂时不可用，请使用账号密码登录或游客模式',
            showCancel: false
          })
        }
        
        try {
          if (wx.getUserProfile) {
            wx.getUserProfile({
              desc: '用于登录游戏',
              success: (res) => {
                handleLoginSuccess(res.userInfo)
              },
              fail: handleLoginFail
            })
          } else if (wx.login) {
            wx.login({
              success: () => {
                handleLoginSuccess({ nickName: '微信用户', avatar: '👤' })
              },
              fail: handleLoginFail
            })
          } else {
            handleLoginFail('No login API available')
          }
        } catch (e) {
          handleLoginFail(e)
        }
      } else if (this.isInButton(x, y, 40, btnY + 80, btnWidth, btnHeight)) {
        this.gameState = GameState.LOGIN_FORM
      } else if (this.isInButton(x, y, 40, btnY + 160, btnWidth, btnHeight)) {
        this.gameState = GameState.REGISTER
      } else if (this.isInButton(x, y, 40, btnY + 240, btnWidth, btnHeight)) {
        this.loginType = 'guest'
        this.isLoggedIn = false
        this.currentUser = null
        this.unlockedLevels = [1]
        this.levelStars = {}
        this.levelScores = {}
        this.coins = 1000
        this.clothes = [{ id: 1, name: '默认', emoji: '👤', price: 0 }]
        this.currentClothes = 1
        this.collection = {}
        this.friends = []
        wx.showToast({
          title: '游客登录',
          icon: 'success',
          duration: 1000
        })
        setTimeout(() => {
          this.gameState = GameState.MENU
        }, 1000)
      }
      return
    }

    if (this.gameState === GameState.REGISTER) {
      if (this.isInButton(x, y, 10, 10, 50, 40)) {
        this.gameState = GameState.LOGIN
        return
      }

      const inputY = 150
      const inputHeight = 50
      const inputWidth = this.screenWidth - 80

      if (this.isInButton(x, y, 40, inputY, inputWidth, inputHeight)) {
        this.activeInput = 'register_username'
        wx.showModal({
          title: '请输入用户名',
          editable: true,
          placeholderText: '用户名',
          success: (res) => {
            if (res.confirm && res.content) {
              this.username = res.content
            }
            this.activeInput = null
          }
        })
      } else if (this.isInButton(x, y, 40, inputY + 70, inputWidth, inputHeight)) {
        this.activeInput = 'register_password'
        wx.showModal({
          title: '请输入密码',
          editable: true,
          placeholderText: '密码',
          password: true,
          success: (res) => {
            if (res.confirm && res.content) {
              this.password = res.content
            }
            this.activeInput = null
          }
        })
      } else if (this.isInButton(x, y, 40, inputY + 140, inputWidth, inputHeight)) {
        this.activeInput = 'register_confirm'
        wx.showModal({
          title: '请确认密码',
          editable: true,
          placeholderText: '确认密码',
          password: true,
          success: (res) => {
            if (res.confirm && res.content) {
              this.confirmPassword = res.content
            }
            this.activeInput = null
          }
        })
      } else if (this.isInButton(x, y, 40, inputY + 220, inputWidth, 60)) {
        if (!this.username) {
          wx.showToast({ title: '请输入用户名', icon: 'none' })
        } else if (!this.password) {
          wx.showToast({ title: '请输入密码', icon: 'none' })
        } else if (!this.confirmPassword) {
          wx.showToast({ title: '请确认密码', icon: 'none' })
        } else if (this.password !== this.confirmPassword) {
          wx.showToast({ title: '两次密码不一致', icon: 'none' })
        } else {
          const users = this.loadUsers()
          if (users.find(u => u.username === this.username)) {
            wx.showToast({ title: '用户名已存在', icon: 'none' })
          } else {
            users.push({ username: this.username, password: this.password, avatar: '👤' })
            this.saveUsers(users)
            wx.showToast({ title: '注册成功', icon: 'success' })
            setTimeout(() => {
              this.isLoggedIn = true
              this.currentUser = { username: this.username, avatar: '👤' }
              this.friends = this.loadFriends(this.username)
              this.friendRequests = this.loadFriendRequests(this.username)
              this.gameState = GameState.MENU
            }, 1000)
          }
        }
      }
      return
    }

    if (this.gameState === GameState.FRIEND_REQUESTS) {
      if (this.isInButton(x, y, 10, 10, 50, 40)) {
        this.gameState = GameState.LEADERBOARD
        return
      }

      const myRequests = this.friendRequests.filter(r => r.to === this.currentUser?.username && r.status === 'pending')
      myRequests.forEach((request, index) => {
        const userY = 100 + index * 80
        const acceptBtnX = this.screenWidth - 160
        const rejectBtnX = this.screenWidth - 70

        if (this.isInButton(x, y, acceptBtnX, userY + 15, 70, 40)) {
          this.friends.push({
            username: request.from,
            avatar: request.fromAvatar,
            score: 0
          })
          request.status = 'accepted'
          this.saveFriends()
          this.saveFriendRequests()
          this.saveUserData()

          const fromUserFriends = this.loadFriends(request.from)
          fromUserFriends.push({
            username: this.currentUser.username,
            avatar: this.currentUser.avatar,
            score: 0
          })
          wx.setStorageSync('friends_' + request.from, JSON.stringify(fromUserFriends))

          const fromUserRequests = this.loadFriendRequests(request.from)
          const fromRequest = fromUserRequests.find(r => r.from === request.from && r.to === request.to)
          if (fromRequest) {
            fromRequest.status = 'accepted'
            wx.setStorageSync('friendRequests_' + request.from, JSON.stringify(fromUserRequests))
          }

          wx.showToast({ title: '已添加好友', icon: 'success' })
        } else if (this.isInButton(x, y, rejectBtnX, userY + 15, 70, 40)) {
          request.status = 'rejected'
          this.saveFriendRequests()

          const fromUserRequests = this.loadFriendRequests(request.from)
          const fromRequest = fromUserRequests.find(r => r.from === request.from && r.to === request.to)
          if (fromRequest) {
            fromRequest.status = 'rejected'
            wx.setStorageSync('friendRequests_' + request.from, JSON.stringify(fromUserRequests))
          }

          wx.showToast({ title: '已拒绝', icon: 'none' })
        }
      })
      return
    }

    if (this.gameState === GameState.FRIEND_SEARCH) {
      if (this.isInButton(x, y, 10, 10, 50, 40)) {
        this.gameState = GameState.LEADERBOARD
        return
      }

      const inputY = 120
      const inputHeight = 50
      const inputWidth = this.screenWidth - 80

      if (this.isInButton(x, y, 40, inputY, inputWidth, inputHeight)) {
        this.showInputDialog('请输入好友用户名', (value) => {
          this.searchFriendName = value
        })
      } else if (this.isInButton(x, y, 40, inputY + 70, inputWidth, 50)) {
        if (!this.searchFriendName) {
          wx.showToast({ title: '请输入用户名', icon: 'none' })
        } else {
          const users = this.loadUsers()
          this.searchResults = users.filter(u => 
            u.username.includes(this.searchFriendName)
          )
          if (this.searchResults.length === 0) {
            wx.showToast({ title: '未找到用户', icon: 'none' })
          }
        }
      } else if (this.searchResults && this.searchResults.length > 0) {
        this.searchResults.forEach((user, index) => {
          const userY = inputY + 140 + index * 60
          if (this.isInButton(x, y, this.screenWidth - 100, userY + 5, 80, 40)) {
            const isFriend = this.friends.some(f => f.username === user.username)
            const hasPendingRequest = this.friendRequests.some(
              r => r.from === this.currentUser?.username && r.to === user.username && r.status === 'pending'
            )
            
            if (!isFriend && !hasPendingRequest && user.username !== (this.currentUser?.username || '')) {
              this.sendFriendRequest(user.username)
              wx.showToast({ title: '申请已发送', icon: 'success' })
            }
          }
        })
      }
      return
    }

    if (this.gameState === GameState.LOGIN_FORM) {
      if (this.isInButton(x, y, 10, 10, 50, 40)) {
        this.gameState = GameState.LOGIN
        return
      }

      const inputY = 150
      const inputHeight = 50
      const inputWidth = this.screenWidth - 80

      if (this.isInButton(x, y, 40, inputY, inputWidth, inputHeight)) {
        this.activeInput = 'login_username'
        wx.showModal({
          title: '请输入用户名',
          editable: true,
          placeholderText: '用户名',
          success: (res) => {
            if (res.confirm && res.content) {
              this.username = res.content
            }
            this.activeInput = null
          }
        })
      } else if (this.isInButton(x, y, 40, inputY + 70, inputWidth, inputHeight)) {
        this.activeInput = 'login_password'
        wx.showModal({
          title: '请输入密码',
          editable: true,
          placeholderText: '密码',
          password: true,
          success: (res) => {
            if (res.confirm && res.content) {
              this.password = res.content
            }
            this.activeInput = null
          }
        })
      } else if (this.isInButton(x, y, 40, inputY + 150, inputWidth, 60)) {
        if (!this.username) {
          wx.showToast({ title: '请输入用户名', icon: 'none' })
        } else if (!this.password) {
          wx.showToast({ title: '请输入密码', icon: 'none' })
        } else {
          const users = this.loadUsers()
          const user = users.find(u => u.username === this.username && u.password === this.password)
          if (user) {
            wx.showToast({ title: '登录成功', icon: 'success' })
            setTimeout(() => {
              this.isLoggedIn = true
              this.currentUser = { username: user.username, avatar: user.avatar }
              this.loadUserData(user.username)
              this.gameState = GameState.MENU
            }, 1000)
          } else {
            wx.showToast({ title: '用户名或密码错误', icon: 'none' })
          }
        }
      }
      return
    }

    if (this.gameState === GameState.MENU) {
      if (this.isInButton(x, y, this.screenWidth / 2 - 100, 230, 200, 60)) {
        this.gameState = GameState.MAP
      } else {
        const btnWidth = 120
        const btnHeight = 90
        const spacing = 20
        const cols = 2
        const startX = (this.screenWidth - (btnWidth * cols + spacing)) / 2
        const startY = 320

        const states = [GameState.SHOP, GameState.COLLECTION, GameState.LEADERBOARD, GameState.SETTINGS]

        for (let i = 0; i < 4; i++) {
          const row = Math.floor(i / cols)
          const col = i % cols
          const btnX = startX + col * (btnWidth + spacing)
          const btnY = startY + row * (btnHeight + spacing)
          if (this.isInButton(x, y, btnX, btnY, btnWidth, btnHeight)) {
            if (i === 2 && !this.isLoggedIn && !this.currentUser) {
              wx.showToast({
                title: '请登录账号以解锁排行功能',
                icon: 'none',
                duration: 2000
              })
            } else {
              this.gameState = states[i]
            }
            break
          }
        }
      }
    } else if (this.gameState === GameState.LEADERBOARD) {
      if (this.isInButton(x, y, 10, 10, 50, 40)) {
        this.gameState = GameState.MENU
        return
      }

      const searchBtnX = this.screenWidth - 60
      const searchBtnY = 100
      if (this.isInButton(x, y, searchBtnX - 40, searchBtnY, 50, 40)) {
        this.gameState = GameState.FRIEND_SEARCH
        this.searchFriendName = ''
        this.searchResults = null
        return
      }

      const requestBtnX = this.screenWidth - 120
      if (this.isInButton(x, y, requestBtnX - 40, searchBtnY, 50, 40)) {
        this.gameState = GameState.FRIEND_REQUESTS
        return
      }
    } else if (this.gameState === GameState.MAP) {
      if (x >= 10 && x <= 60 && y >= 10 && y <= 50) {
        this.gameState = GameState.MENU
        return
      }

      const levelWidth = 100
      const levelHeight = 100
      const spacing = 50
      const startX = (this.screenWidth - levelWidth) / 2 + this.mapOffset

      for (let i = 0; i < 8; i++) {
        const levelX = startX + i * (levelWidth + spacing)
        const levelY = this.screenHeight / 2 - levelHeight / 2

        if (x >= levelX && x <= levelX + levelWidth &&
            y >= levelY && y <= levelY + levelHeight) {
          const levelId = i + 1
          if (this.unlockedLevels.includes(levelId)) {
            this.currentLevel = levelId
            this.loadStory()
            this.gameState = GameState.STORY
          }
          break
        }
      }
    } else if (this.gameState === GameState.STORY) {
      const homeBtnX = x >= 10 && x <= 60 && y >= 10 && y <= 50
      if (homeBtnX) {
        this.gameState = GameState.MAP
        return
      }
      const dialogueY = 320
      const dialogueHeight = 120
      if (y >= dialogueY && y <= dialogueY + dialogueHeight) {
        this.currentDialogueIndex++
        const story = this.storyData || this.dataLoader.getStoryByLevelId(this.currentLevel)
        if (!story || this.currentDialogueIndex >= story.dialogues.length) {
          this.startGame()
        }
      }
    } else if (this.gameState === GameState.PLAYING) {
      if (x >= 10 && x <= 60 && y >= 10 && y <= 50) {
        this.gameState = GameState.MAP
        this.grid = null
      } else {
        this.handlePlayingClick(x, y)
      }
    } else if (this.gameState === GameState.CHOICE) {
      if (this.isInButton(x, y, this.screenWidth / 2 - 120, 380, 240, 50)) {
        if (this.score >= this.targetScore) {
          const stars = this.calculateStars()
          this.levelStars[this.currentLevel] = Math.max(this.levelStars[this.currentLevel] || 0, stars)
          this.saveLevelStars()

          this.levelScores[this.currentLevel] = Math.max(this.levelScores[this.currentLevel] || 0, this.score)
          this.saveLevelScores()
        }
        this.gameState = GameState.PLAYING
      } else if (this.isInButton(x, y, this.screenWidth / 2 - 120, 460, 240, 50)) {
        if (this.score >= this.targetScore) {
          const stars = this.calculateStars()
          this.levelStars[this.currentLevel] = Math.max(this.levelStars[this.currentLevel] || 0, stars)
          this.saveLevelStars()

          this.levelScores[this.currentLevel] = Math.max(this.levelScores[this.currentLevel] || 0, this.score)
          this.saveLevelScores()

          const nextLevel = this.currentLevel + 1
          if (nextLevel <= 8 && !this.unlockedLevels.includes(nextLevel)) {
            this.unlockedLevels.push(nextLevel)
            this.saveUnlockedLevels()
          }

          const baseCoins = 50
          const coinBonus = Math.floor((this.currentLevel - 1) / 2) * 30
          const coinReward = baseCoins + coinBonus
          this.coins += coinReward
          this.saveCoins()
        }

        const nextLevel = this.currentLevel + 1
        if (nextLevel <= 8) {
          this.currentLevel = nextLevel
          this.loadStory()
          this.gameState = GameState.STORY
        } else {
          this.showGameResult(true)
        }
      }
    } else if (this.gameState === GameState.RESULT) {
      const btnX = this.screenWidth / 2 - 80
      const returnBtnY = this.screenHeight - 120
      const replayBtnY = this.screenHeight - 200

      if (this.isInButton(x, y, btnX, returnBtnY, 160, 50)) {
        this.gameState = GameState.MAP
      } else if (this.isInButton(x, y, btnX, replayBtnY, 160, 50)) {
        this.startGame()
      }
    } else if (this.gameState === GameState.SHOP) {
      if (x >= 10 && x <= 60 && y >= 10 && y <= 50) {
        this.gameState = GameState.MENU
        return
      }

      const clothesPerRow = 2
      const clothesWidth = 120
      const clothesHeight = 140
      const spacing = 30
      const startX = (this.screenWidth - (clothesWidth * clothesPerRow + spacing)) / 2

      for (let i = 0; i < this.clothes.length; i++) {
        const row = Math.floor(i / clothesPerRow)
        const col = i % clothesPerRow
        const itemX = startX + col * (clothesWidth + spacing)
        const itemY = 100 + row * (clothesHeight + spacing)

        if (this.isInButton(x, y, itemX, itemY, clothesWidth, clothesHeight)) {
          const item = this.clothes[i]
          if (item.owned) {
            if (this.currentClothes !== item.id) {
              this.currentClothes = item.id
              this.saveCurrentClothes()
            }
          } else {
            if (this.coins >= item.price) {
              this.coins -= item.price
              item.owned = true
              this.saveCoins()
              this.saveClothes()
            }
          }
          break
        }
      }
    } else if (this.gameState === GameState.COLLECTION) {
      if (x >= 10 && x <= 60 && y >= 10 && y <= 50) {
        this.gameState = GameState.MENU
        return
      }
    } else if (this.gameState === GameState.LEADERBOARD) {
      if (x >= 10 && x <= 60 && y >= 10 && y <= 50) {
        this.gameState = GameState.MENU
        return
      }
    } else if (this.gameState === GameState.SETTINGS) {
      if (x >= 10 && x <= 60 && y >= 10 && y <= 50) {
        this.gameState = GameState.MENU
        return
      }

      const colorsPerRow = 4
      const colorSize = 50
      const spacing = 20
      const startX = (this.screenWidth - (colorSize * colorsPerRow + spacing * (colorsPerRow - 1))) / 2

      for (let i = 0; i < this.backgroundColors.length; i++) {
        const colorX = startX + (i % colorsPerRow) * (colorSize + spacing)
        const colorY = 150 + Math.floor(i / colorsPerRow) * (colorSize + spacing)
        if (this.isInButton(x, y, colorX, colorY, colorSize, colorSize)) {
          this.currentBgIndex = i
          this.saveBgIndex()
          break
        }
      }

      if (this.isInButton(x, y, 30, this.screenHeight - 230, this.screenWidth - 60, 50)) {
        this.saveBgIndex()
        wx.showToast({
          title: '颜色已更换',
          icon: 'success'
        })
      }

      if (this.isInButton(x, y, 30, this.screenHeight - 160, this.screenWidth - 60, 50)) {
        if (this.isLoggedIn && this.currentUser) {
          wx.showModal({
            title: '确认退出',
            content: '确定要退出当前账号吗？',
            success: (res) => {
              if (res.confirm) {
                this.isLoggedIn = false
                this.currentUser = null
                this.gameState = GameState.LOGIN
                wx.showToast({
                  title: '已退出登录',
                  icon: 'none'
                })
              }
            }
          })
        } else if (!this.isLoggedIn && !this.currentUser) {
          wx.showModal({
            title: '确认退出',
            content: '确定要退出游客模式吗？游戏数据将不会保存。',
            success: (res) => {
              if (res.confirm) {
                this.gameState = GameState.LOGIN
                wx.showToast({
                  title: '已退出游客模式',
                  icon: 'none'
                })
              }
            }
          })
        }
      }

      if (this.isInButton(x, y, 30, this.screenHeight - 90, this.screenWidth - 60, 50)) {
        wx.setStorageSync('unlockedLevels', JSON.stringify([1]))
        wx.setStorageSync('levelStars', JSON.stringify({}))
        wx.setStorageSync('coins', '1000')
        wx.setStorageSync('clothes', JSON.stringify([
          { id: 1, name: '休闲装', emoji: '👕', price: 0, owned: true },
          { id: 2, name: '运动装', emoji: '🏃', price: 200, owned: false },
          { id: 3, name: '礼服', emoji: '👗', price: 500, owned: false },
          { id: 4, name: '古装', emoji: '👘', price: 800, owned: false },
          { id: 5, name: '魔法装', emoji: '🧙', price: 1200, owned: false },
          { id: 6, name: '未来装', emoji: '🤖', price: 1500, owned: false }
        ]))
        wx.setStorageSync('currentClothes', '1')
        wx.setStorageSync('collection', JSON.stringify({}))
        wx.setStorageSync('bgIndex', '0')
        this.unlockedLevels = [1]
        this.levelStars = {}
        this.coins = 1000
        this.clothes = this.loadClothes()
        this.currentClothes = 1
        this.collection = {}
        this.currentBgIndex = 0
        this.gameState = GameState.MENU
      }
    }
  }

  handleTouchMove(x, y) {
    if (this.gameState === GameState.MAP) {
      const deltaX = x - this.touchX
      this.mapOffset += deltaX
      this.mapOffset = Math.max(-((this.dataLoader.levels.length - 1) * (100 + 50)), Math.min(0, this.mapOffset))
      this.touchX = x
    }
  }

  handleTouchEnd() {
    if (this.gameState === GameState.MAP) {
      const levelWidth = 100
      const spacing = 50
      const centerX = this.screenWidth / 2 - levelWidth / 2
      const currentPosition = -this.mapOffset
      const levelIndex = Math.round(currentPosition / (levelWidth + spacing))
      const clampedIndex = Math.max(0, Math.min(7, levelIndex))
      this.mapOffset = -clampedIndex * (levelWidth + spacing)
    }
  }

  isInButton(x, y, bx, by, bw, bh) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh
  }

  loadStory() {
    this.storyData = this.dataLoader.getStoryByLevelId(this.currentLevel)
    this.currentDialogueIndex = 0
    this.targetReached = false
  }

  startGame() {
    const level = this.dataLoader.getLevelById(this.currentLevel)
    if (!level) return

    this.maxSteps = level.maxSteps
    this.targetScore = level.targetScore
    this.score = 0
    this.steps = 0
    this.gameResult = null
    this.selectedCell = null
    this.isProcessing = false
    this.combo = 0
    this.showCombo = false
    this.targetReached = false

    this.initGrid(level.rows, level.cols, level.elementTypes)
    this.gameState = GameState.PLAYING
  }

  initGrid(rows, cols, elementTypes) {
    this.grid = []
    for (let r = 0; r < rows; r++) {
      this.grid[r] = []
      for (let c = 0; c < cols; c++) {
        let item
        do {
          item = Math.floor(Math.random() * elementTypes)
        } while (this.wouldMatch(r, c, item, rows, cols))
        this.grid[r][c] = {
          type: item,
          row: r,
          col: c,
          matched: false
        }
      }
    }
  }

  wouldMatch(r, c, val, rows, cols) {
    if (c >= 2 && this.grid[r][c - 1]?.type === val && this.grid[r][c - 2]?.type === val) {
      return true
    }
    if (r >= 2 && this.grid[r - 1]?.[c]?.type === val && this.grid[r - 2]?.[c]?.type === val) {
      return true
    }
    return false
  }

  handlePlayingClick(x, y) {
    if (this.isProcessing || !this.grid) return

    const level = this.dataLoader.getLevelById(this.currentLevel)
    if (!level) return

    const cellSize = Math.min(50, (this.screenWidth - 60) / level.cols)
    const boardWidth = level.cols * cellSize
    const boardX = (this.screenWidth - boardWidth) / 2
    const boardY = 140

    if (x >= boardX && x <= boardX + boardWidth &&
        y >= boardY && y <= boardY + level.rows * cellSize) {
      const col = Math.floor((x - boardX) / cellSize)
      const row = Math.floor((y - boardY) / cellSize)

      if (row >= 0 && row < level.rows && col >= 0 && col < level.cols) {
        if (!this.selectedCell) {
          this.selectedCell = { row, col }
        } else if (this.selectedCell.row === row && this.selectedCell.col === col) {
          this.selectedCell = null
        } else {
          const dr = Math.abs(row - this.selectedCell.row)
          const dc = Math.abs(col - this.selectedCell.col)

          if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            this.trySwap(this.selectedCell.row, this.selectedCell.col, row, col, level.rows, level.cols)
          } else {
            this.selectedCell = { row, col }
          }
        }
      }
    }
  }

  async trySwap(r1, c1, r2, c2, rows, cols) {
    this.isProcessing = true
    this.selectedCell = null

    this.swap(r1, c1, r2, c2)
    this.playMoveSound()

    await this.delay(150)

    const matches = this.findMatches(rows, cols)

    if (matches.length === 0) {
      this.swap(r1, c1, r2, c2)
      this.isProcessing = false
      return
    }

    this.steps++

    await this.processMatches(rows, cols)

    if (this.score >= this.targetScore && !this.targetReached) {
      this.targetReached = true
      this.gameState = GameState.CHOICE
      this.isProcessing = false
      return
    }

    if (this.steps >= this.maxSteps) {
      this.showGameResult(this.score >= this.targetScore)
    }

    this.isProcessing = false
  }

  swap(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1].type
    this.grid[r1][c1].type = this.grid[r2][c2].type
    this.grid[r2][c2].type = temp
  }

  findMatches(rows, cols) {
    const matches = new Set()

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 2; c++) {
        const type = this.grid[r][c]?.type
        if (type !== undefined && type === this.grid[r][c + 1]?.type && type === this.grid[r][c + 2]?.type) {
          matches.add(`${r},${c}`)
          matches.add(`${r},${c + 1}`)
          matches.add(`${r},${c + 2}`)
          let k = c + 3
          while (k < cols && this.grid[r][k]?.type === type) {
            matches.add(`${r},${k}`)
            k++
          }
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 2; r++) {
        const type = this.grid[r][c]?.type
        if (type !== undefined && type === this.grid[r + 1][c]?.type && type === this.grid[r + 2][c]?.type) {
          matches.add(`${r},${c}`)
          matches.add(`${r + 1},${c}`)
          matches.add(`${r + 2},${c}`)
          let k = r + 3
          while (k < rows && this.grid[k]?.[c]?.type === type) {
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

  async processMatches(rows, cols) {
    let matches = this.findMatches(rows, cols)
    this.combo = 0

    while (matches.length > 0) {
      this.combo++

      matches.forEach(match => {
        this.grid[match.row][match.col].matched = true
      })

      if (this.combo > 1) {
        this.playComboSound(this.combo)
      } else {
        this.playMatchSound()
      }

      await this.delay(200)

      const baseScore = matches.length * 10
      const comboBonus = this.combo > 1 ? (this.combo - 1) * 50 : 0
      this.score += baseScore + comboBonus

      if (this.combo > 1) {
        this.showComboAnimation(this.combo)
      }

      this.clearMatched()
      await this.delay(100)

      this.drop(cols)
      await this.delay(150)

      this.fill(rows, cols)
      await this.delay(100)

      matches = this.findMatches(rows, cols)
    }
  }

  showComboAnimation(combo) {
    this.showCombo = true
    this.comboValue = combo
    setTimeout(() => {
      this.showCombo = false
    }, 1000)
  }

  clearMatched() {
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[0].length; c++) {
        if (this.grid[r][c].matched) {
          this.grid[r][c].type = -1
          this.grid[r][c].matched = false
        }
      }
    }
  }

  drop(cols) {
    for (let c = 0; c < cols; c++) {
      let emptyRow = this.grid.length - 1
      for (let r = this.grid.length - 1; r >= 0; r--) {
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

  fill(rows, cols) {
    const elementTypes = this.dataLoader.getLevelById(this.currentLevel).elementTypes
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.grid[r][c].type === -1) {
          this.grid[r][c].type = Math.floor(Math.random() * elementTypes)
        }
      }
    }
  }

  showGameResult(win) {
    this.gameResult = win ? '胜利' : '失败'

    if (win) {
      const stars = this.calculateStars()
      this.levelStars[this.currentLevel] = Math.max(this.levelStars[this.currentLevel] || 0, stars)
      this.saveLevelStars()

      this.levelScores[this.currentLevel] = Math.max(this.levelScores[this.currentLevel] || 0, this.score)
      this.saveLevelScores()

      const nextLevel = this.currentLevel + 1
      if (nextLevel <= 8 && !this.unlockedLevels.includes(nextLevel)) {
        this.unlockedLevels.push(nextLevel)
        this.saveUnlockedLevels()
      }

      const baseCoins = 50
      const coinBonus = Math.floor((this.currentLevel - 1) / 2) * 30
      const coinReward = baseCoins + coinBonus
      this.coins += coinReward
      this.saveCoins()
    }

    this.gameState = GameState.RESULT
  }

  calculateStars() {
    if (this.score >= this.targetScore * 2) return 3
    if (this.score >= this.targetScore * 1.5) return 2
    if (this.score >= this.targetScore) return 1
    return 0
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  render() {
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight)

    switch (this.gameState) {
      case GameState.LOGIN:
        this.renderLogin()
        break
      case GameState.REGISTER:
        this.renderRegister()
        break
      case GameState.LOGIN_FORM:
        this.renderLoginForm()
        break
      case GameState.MENU:
        this.renderMenu()
        break
      case GameState.MAP:
        this.renderMap()
        break
      case GameState.STORY:
        this.renderStory()
        break
      case GameState.PLAYING:
        this.renderPlaying()
        break
      case GameState.CHOICE:
        this.renderChoice()
        break
      case GameState.RESULT:
        this.renderResult()
        break
      case GameState.SHOP:
        this.renderShop()
        break
      case GameState.COLLECTION:
        this.renderCollection()
        break
      case GameState.LEADERBOARD:
        this.renderLeaderboard()
        break
      case GameState.FRIEND_SEARCH:
        this.renderFriendSearch()
        break
      case GameState.FRIEND_REQUESTS:
        this.renderFriendRequests()
        break
      case GameState.SETTINGS:
        this.renderSettings()
        break
    }
  }

  renderMenu() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`💰 ${this.coins}`, this.screenWidth - 20, 50)

    const currentClothes = this.clothes.find(c => c.id === this.currentClothes)
    this.ctx.font = '36px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(currentClothes ? currentClothes.emoji : '👤', 20, 55)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 40px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🍬 消消乐之旅', this.screenWidth / 2, 120)

    this.ctx.font = '24px Arial'
    this.ctx.fillText('探索广东八大城市', this.screenWidth / 2, 180)

    this.roundRect(this.screenWidth / 2 - 100, 230, 200, 60, 30)
    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.fill()

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.fillText('开始游戏', this.screenWidth / 2, 270)

    const btnWidth = 120
    const btnHeight = 90
    const spacing = 20
    const cols = 2
    const startX = (this.screenWidth - (btnWidth * cols + spacing)) / 2
    const startY = 320

    const buttons = [
      { emoji: '🛒', name: '商城', color: '#FF6B6B' },
      { emoji: '📖', name: '图鉴', color: '#4ECDC4' },
      { emoji: '🏆', name: '排行', color: '#FFD700' },
      { emoji: '⚙️', name: '设置', color: '#9B59B6' }
    ]

    buttons.forEach((btn, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      const x = startX + col * (btnWidth + spacing)
      const y = startY + row * (btnHeight + spacing)

      this.roundRect(x, y, btnWidth, btnHeight, 20)
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      this.ctx.fill()

      this.ctx.font = '40px Arial'
      this.ctx.fillStyle = btn.color
      this.ctx.textAlign = 'center'
      this.ctx.fillText(btn.emoji, x + btnWidth / 2, y + 45)

      this.ctx.font = '18px Arial'
      this.ctx.fillText(btn.name, x + btnWidth / 2, y + 75)
    })

    this.ctx.font = '16px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.fillText('🍀 收集金币，解锁更多城市', this.screenWidth / 2, this.screenHeight - 40)
  }

  renderChoice() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(this.screenWidth / 2 - 150, 150, 300, 370, 20)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    this.ctx.fill()

    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🎉 目标达成！', this.screenWidth / 2, 200)

    const stars = this.calculateStars()
    const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars)
    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.fillText(starDisplay, this.screenWidth / 2, 260)

    this.ctx.fillStyle = '#333'
    this.ctx.font = '22px Arial'
    this.ctx.fillText(`当前分数: ${this.score}`, this.screenWidth / 2, 310)

    const baseCoins = 50
    const coinBonus = Math.floor((this.currentLevel - 1) / 2) * 30
    const coinReward = baseCoins + coinBonus
    this.ctx.font = '18px Arial'
    this.ctx.fillStyle = '#FFD700'
    this.ctx.fillText(`预计奖励: 💰 ${coinReward}`, this.screenWidth / 2, 345)

    this.roundRect(this.screenWidth / 2 - 120, 380, 240, 50, 15)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 22px Arial'
    this.ctx.fillText('继续游玩', this.screenWidth / 2, 415)

    this.roundRect(this.screenWidth / 2 - 120, 460, 240, 50, 15)
    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 22px Arial'
    this.ctx.fillText('进入下一关', this.screenWidth / 2, 495)
  }

  renderLogin() {
    this.ctx.fillStyle = '#667eea'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🍬', this.screenWidth / 2, 120)

    this.ctx.font = 'bold 36px Arial'
    this.ctx.fillText('消消乐之旅', this.screenWidth / 2, 180)

    this.ctx.font = '22px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.fillText('探索广东八大城市', this.screenWidth / 2, 230)

    const btnWidth = this.screenWidth - 80
    const btnHeight = 60
    const btnY = 300

    this.roundRect(40, btnY, btnWidth, btnHeight, 30)
    this.ctx.fillStyle = '#07C160'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('微信授权登录', this.screenWidth / 2, btnY + 38)

    this.roundRect(40, btnY + 80, btnWidth, btnHeight, 30)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText('注册账号', this.screenWidth / 2, btnY + 118)

    this.roundRect(40, btnY + 80, btnWidth, btnHeight, 30)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText('账号密码登录', this.screenWidth / 2, btnY + 118)

    this.roundRect(40, btnY + 160, btnWidth, btnHeight, 30)
    this.ctx.fillStyle = '#9B59B6'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText('注册账号', this.screenWidth / 2, btnY + 198)

    this.roundRect(40, btnY + 240, btnWidth, btnHeight, 30)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    this.ctx.fillText('游客登录', this.screenWidth / 2, btnY + 278)

    this.ctx.font = '16px Arial'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    this.ctx.fillText('登录后可保存游戏进度', this.screenWidth / 2, this.screenHeight - 40)
  }

  renderRegister() {
    this.ctx.fillStyle = '#9B59B6'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.fillText('📝 注册账号', this.screenWidth / 2, 80)

    const inputY = 150
    const inputHeight = 50
    const inputWidth = this.screenWidth - 80

    this.roundRect(40, inputY, inputWidth, inputHeight, 10)
    this.ctx.fillStyle = this.activeInput === 'register_username' ? '#E8F5E9' : '#fff'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'left'
    const usernameText = this.username || '请输入用户名'
    this.ctx.fillText(usernameText, 55, inputY + 35)
    if (this.activeInput === 'register_username' && this.username) {
      this.ctx.fillStyle = '#07C160'
      this.ctx.fillText('|', 55 + this.ctx.measureText(this.username).width, inputY + 35)
    }

    this.roundRect(40, inputY + 70, inputWidth, inputHeight, 10)
    this.ctx.fillStyle = this.activeInput === 'register_password' ? '#E8F5E9' : '#fff'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    const passwordText = this.password ? '*'.repeat(this.password.length) : '请输入密码'
    this.ctx.fillText(passwordText, 55, inputY + 105)
    if (this.activeInput === 'register_password' && this.password) {
      this.ctx.fillStyle = '#07C160'
      this.ctx.fillText('|', 55 + this.ctx.measureText(passwordText).width, inputY + 105)
    }

    this.roundRect(40, inputY + 140, inputWidth, inputHeight, 10)
    this.ctx.fillStyle = this.activeInput === 'register_confirm' ? '#E8F5E9' : '#fff'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    const confirmText = this.confirmPassword ? '*'.repeat(this.confirmPassword.length) : '请确认密码'
    this.ctx.fillText(confirmText, 55, inputY + 175)
    if (this.activeInput === 'register_confirm' && this.confirmPassword) {
      this.ctx.fillStyle = '#07C160'
      this.ctx.fillText('|', 55 + this.ctx.measureText(confirmText).width, inputY + 175)
    }

    this.roundRect(40, inputY + 220, inputWidth, 60, 30)
    this.ctx.fillStyle = '#07C160'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('注册', this.screenWidth / 2, inputY + 258)
  }

  renderLoginForm() {
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 32px Arial'
    this.ctx.fillText('🔐 账号登录', this.screenWidth / 2, 80)

    const inputY = 150
    const inputHeight = 50
    const inputWidth = this.screenWidth - 80

    this.roundRect(40, inputY, inputWidth, inputHeight, 10)
    this.ctx.fillStyle = this.activeInput === 'login_username' ? '#E8F5E9' : '#fff'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'left'
    const usernameText = this.username || '请输入用户名'
    this.ctx.fillText(usernameText, 55, inputY + 35)
    if (this.activeInput === 'login_username' && this.username) {
      this.ctx.fillStyle = '#07C160'
      this.ctx.fillText('|', 55 + this.ctx.measureText(this.username).width, inputY + 35)
    }

    this.roundRect(40, inputY + 70, inputWidth, inputHeight, 10)
    this.ctx.fillStyle = this.activeInput === 'login_password' ? '#E8F5E9' : '#fff'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    const passwordText = this.password ? '*'.repeat(this.password.length) : '请输入密码'
    this.ctx.fillText(passwordText, 55, inputY + 105)
    if (this.activeInput === 'login_password' && this.password) {
      this.ctx.fillStyle = '#07C160'
      this.ctx.fillText('|', 55 + this.ctx.measureText(passwordText).width, inputY + 105)
    }

    this.roundRect(40, inputY + 150, inputWidth, 60, 30)
    this.ctx.fillStyle = '#07C160'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('登录', this.screenWidth / 2, inputY + 188)
  }

  renderShop() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🛒 商城', this.screenWidth / 2, 60)

    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`💰 ${this.coins}`, this.screenWidth - 20, 60)

    const clothesPerRow = 2
    const clothesWidth = 120
    const clothesHeight = 140
    const spacing = 30
    const startX = (this.screenWidth - (clothesWidth * clothesPerRow + spacing)) / 2

    this.clothes.forEach((item, index) => {
      const row = Math.floor(index / clothesPerRow)
      const col = index % clothesPerRow
      const x = startX + col * (clothesWidth + spacing)
      const y = 100 + row * (clothesHeight + spacing)

      this.roundRect(x, y, clothesWidth, clothesHeight, 15)
      if (item.owned) {
        this.ctx.fillStyle = this.currentClothes === item.id ? '#4ECDC4' : 'rgba(255, 255, 255, 0.9)'
      } else {
        this.ctx.fillStyle = '#f0f0f0'
      }
      this.ctx.fill()

      if (item.owned) {
        this.ctx.font = '48px Arial'
        this.ctx.fillStyle = '#333'
        this.ctx.textAlign = 'center'
        this.ctx.fillText(item.emoji, x + clothesWidth / 2, y + 55)
        this.ctx.font = '18px Arial'
        this.ctx.fillText(item.name, x + clothesWidth / 2, y + 95)
        if (this.currentClothes === item.id) {
          this.ctx.fillStyle = '#4ECDC4'
          this.ctx.font = '14px Arial'
          this.ctx.fillText('已装备', x + clothesWidth / 2, y + 120)
        } else {
          this.roundRect(x + 15, y + 100, clothesWidth - 30, 25, 10)
          this.ctx.fillStyle = '#4ECDC4'
          this.ctx.fill()
          this.ctx.fillStyle = '#fff'
          this.ctx.font = '14px Arial'
          this.ctx.fillText('装备', x + clothesWidth / 2, y + 118)
        }
      } else {
        this.ctx.font = '48px Arial'
        this.ctx.fillStyle = '#ccc'
        this.ctx.textAlign = 'center'
        this.ctx.fillText(item.emoji, x + clothesWidth / 2, y + 55)
        this.ctx.font = '18px Arial'
        this.ctx.fillText('???', x + clothesWidth / 2, y + 95)
        this.roundRect(x + 15, y + 100, clothesWidth - 30, 25, 10)
        if (this.coins >= item.price) {
          this.ctx.fillStyle = '#FF6B6B'
          this.ctx.fill()
          this.ctx.fillStyle = '#fff'
          this.ctx.font = '14px Arial'
          this.ctx.fillText(`💰 ${item.price}`, x + clothesWidth / 2, y + 118)
        } else {
          this.ctx.fillStyle = '#ccc'
          this.ctx.fill()
          this.ctx.fillStyle = '#999'
          this.ctx.font = '14px Arial'
          this.ctx.fillText('金币不足', x + clothesWidth / 2, y + 118)
        }
      }
    })
  }

  renderCollection() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('📖 美食图鉴', this.screenWidth / 2, 60)

    const levelWidth = 80
    const levelHeight = 100
    const spacing = 20
    const startX = (this.screenWidth - (levelWidth * 4 + spacing * 3)) / 2

    this.dataLoader.levels.forEach((level, index) => {
      const x = startX + index % 4 * (levelWidth + spacing)
      const y = 100 + Math.floor(index / 4) * (levelHeight + spacing)

      this.roundRect(x, y, levelWidth, levelHeight, 15)
      if (this.unlockedLevels.includes(level.id)) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      } else {
        this.ctx.fillStyle = '#e0e0e0'
      }
      this.ctx.fill()

      this.ctx.font = '32px Arial'
      this.ctx.fillStyle = this.unlockedLevels.includes(level.id) ? '#333' : '#999'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(this.unlockedLevels.includes(level.id) ? level.icon : '🔒', x + levelWidth / 2, y + 40)

      this.ctx.font = '14px Arial'
      this.ctx.fillText(this.unlockedLevels.includes(level.id) ? level.name : '???', x + levelWidth / 2, y + 65)

      if (this.unlockedLevels.includes(level.id)) {
        const collected = this.collection[level.id] || 0
        const total = level.elementTypes
        this.ctx.fillStyle = '#FFD700'
        this.ctx.font = '12px Arial'
        this.ctx.fillText(`${collected}/${total}`, x + levelWidth / 2, y + 85)
      }
    })

    this.ctx.font = '16px Arial'
    this.ctx.fillStyle = '#666'
    this.ctx.fillText('解锁城市后收集当地美食', this.screenWidth / 2, this.screenHeight - 30)
  }

  renderFriendRequests() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('📩 好友申请', this.screenWidth / 2, 60)

    const myRequests = this.friendRequests.filter(r => r.to === this.currentUser?.username && r.status === 'pending')
    
    if (myRequests.length === 0) {
      this.ctx.fillStyle = '#666'
      this.ctx.font = '20px Arial'
      this.ctx.fillText('暂无好友申请', this.screenWidth / 2, 150)
    } else {
      myRequests.forEach((request, index) => {
        const y = 100 + index * 80
        
        this.roundRect(20, y, this.screenWidth - 40, 70, 15)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        this.ctx.fill()

        this.ctx.font = '32px Arial'
        this.ctx.textAlign = 'left'
        this.ctx.fillStyle = '#333'
        this.ctx.fillText(request.fromAvatar, 35, y + 45)
        this.ctx.font = '24px Arial'
        this.ctx.fillText(request.from, 80, y + 45)

        const acceptBtnX = this.screenWidth - 160
        const rejectBtnX = this.screenWidth - 70
        
        this.roundRect(acceptBtnX, y + 15, 70, 40, 20)
        this.ctx.fillStyle = '#07C160'
        this.ctx.fill()
        this.ctx.fillStyle = '#fff'
        this.ctx.font = '16px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('接受', acceptBtnX + 35, y + 40)

        this.roundRect(rejectBtnX, y + 15, 70, 40, 20)
        this.ctx.fillStyle = '#FF6B6B'
        this.ctx.fill()
        this.ctx.fillStyle = '#fff'
        this.ctx.fillText('拒绝', rejectBtnX + 35, y + 40)
      })
    }
  }

  renderFriendSearch() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🔍 搜索好友', this.screenWidth / 2, 60)

    const inputY = 120
    const inputHeight = 50
    const inputWidth = this.screenWidth - 80

    this.roundRect(40, inputY, inputWidth, inputHeight, 10)
    this.ctx.fillStyle = '#fff'
    this.ctx.fill()
    this.ctx.fillStyle = '#666'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(this.searchFriendName || '请输入好友用户名', 55, inputY + 35)

    this.roundRect(40, inputY + 70, inputWidth, 50, 25)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 22px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('搜索', this.screenWidth / 2, inputY + 100)

    if (this.searchFriendName && this.searchResults && this.searchResults.length > 0) {
      this.searchResults.forEach((user, index) => {
        const y = inputY + 140 + index * 60
        this.roundRect(20, y, this.screenWidth - 40, 50, 15)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        this.ctx.fill()

        this.ctx.font = '24px Arial'
        this.ctx.textAlign = 'left'
        this.ctx.fillStyle = '#333'
        this.ctx.fillText(user.avatar, 35, y + 35)
        this.ctx.fillText(user.username, 70, y + 35)

        const isFriend = this.friends.some(f => f.username === user.username)
        const hasPendingRequest = this.friendRequests.some(
          r => r.from === this.currentUser?.username && r.to === user.username && r.status === 'pending'
        )
        
        if (!isFriend && user.username !== (this.currentUser?.username || '')) {
          if (hasPendingRequest) {
            this.roundRect(this.screenWidth - 100, y + 5, 80, 40, 20)
            this.ctx.fillStyle = '#FFD700'
            this.ctx.fill()
            this.ctx.fillStyle = '#333'
            this.ctx.font = '16px Arial'
            this.ctx.textAlign = 'center'
            this.ctx.fillText('已申请', this.screenWidth - 60, y + 30)
          } else {
            this.roundRect(this.screenWidth - 100, y + 5, 80, 40, 20)
            this.ctx.fillStyle = '#07C160'
            this.ctx.fill()
            this.ctx.fillStyle = '#fff'
            this.ctx.font = '16px Arial'
            this.ctx.textAlign = 'center'
            this.ctx.fillText('申请', this.screenWidth - 60, y + 30)
          }
        } else if (isFriend) {
          this.roundRect(this.screenWidth - 100, y + 5, 80, 40, 20)
          this.ctx.fillStyle = '#999'
          this.ctx.fill()
          this.ctx.fillStyle = '#fff'
          this.ctx.font = '16px Arial'
          this.ctx.textAlign = 'center'
          this.ctx.fillText('已添加', this.screenWidth - 60, y + 30)
        }
      })
    }
  }

  renderLeaderboard() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🏆 好友排行', this.screenWidth / 2, 60)

    const searchBtnX = this.screenWidth - 60
    const searchBtnY = 100
    this.roundRect(searchBtnX - 40, searchBtnY, 50, 40, 10)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '24px Arial'
    this.ctx.fillText('🔍', searchBtnX - 15, searchBtnY + 28)

    const requestBtnX = this.screenWidth - 120
    const myRequestsCount = this.friendRequests.filter(r => r.to === this.currentUser?.username && r.status === 'pending').length
    this.roundRect(requestBtnX - 40, searchBtnY, 50, 40, 10)
    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText('📩', requestBtnX - 15, searchBtnY + 28)
    
    if (myRequestsCount > 0) {
      this.roundRect(requestBtnX + 5, searchBtnY - 5, 20, 20, 10)
      this.ctx.fillStyle = '#FFD700'
      this.ctx.fill()
      this.ctx.fillStyle = '#333'
      this.ctx.font = '12px Arial'
      this.ctx.fillText(myRequestsCount.toString(), requestBtnX + 14, searchBtnY + 10)
    }

    this.ctx.fillStyle = '#666'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`我的分数: ${this.calculateTotalScore()}`, 30, 120)

    const myScore = this.calculateTotalScore()
    const friendData = this.friends.map(f => ({
      name: f.username,
      score: f.score || 0,
      avatar: f.avatar || '👤',
      isFriend: true
    }))
    
    friendData.push({
      name: this.currentUser ? this.currentUser.username : '你',
      score: myScore,
      avatar: this.currentUser ? this.currentUser.avatar : '👤',
      isSelf: true
    })
    
    friendData.sort((a, b) => b.score - a.score)

    const mockData = friendData.length > 0 ? friendData : [
      { name: '小明', score: 12500, avatar: '👦' },
      { name: '小红', score: 10800, avatar: '👧' },
      { name: '小刚', score: 9500, avatar: '👨' },
      { name: '小美', score: 8200, avatar: '👩' },
      { name: '你', score: myScore, avatar: '👤', isSelf: true },
      { name: '小华', score: 5800, avatar: '🧑' },
      { name: '小李', score: 4200, avatar: '👨‍💼' },
      { name: '小王', score: 3100, avatar: '👩‍💼' }
    ]

    mockData.forEach((item, index) => {
      const y = 160 + index * 60
      const isSelf = item.isSelf

      this.roundRect(20, y, this.screenWidth - 40, 50, 15)
      this.ctx.fillStyle = isSelf ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.9)'
      this.ctx.fill()

      this.ctx.font = 'bold 24px Arial'
      if (index === 0) this.ctx.fillStyle = '#FFD700'
      else if (index === 1) this.ctx.fillStyle = '#C0C0C0'
      else if (index === 2) this.ctx.fillStyle = '#CD7F32'
      else this.ctx.fillStyle = '#999'
      this.ctx.textAlign = 'left'
      this.ctx.fillText(`${index + 1}`, 35, y + 35)

      this.ctx.font = '32px Arial'
      this.ctx.fillStyle = '#333'
      this.ctx.fillText(item.avatar, 80, y + 38)

      this.ctx.font = '20px Arial'
      this.ctx.fillText(item.name, 130, y + 35)

      this.ctx.font = 'bold 18px Arial'
      this.ctx.fillStyle = '#FF6B6B'
      this.ctx.textAlign = 'right'
      this.ctx.fillText(item.score, this.screenWidth - 35, y + 35)
    })
  }

  renderSettings() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.fillStyle = '#9B59B6'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('⚙️ 设置', this.screenWidth / 2, 60)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = '22px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText('选择背景颜色:', 30, 120)

    const colorsPerRow = 4
    const colorSize = 50
    const spacing = 20
    const startX = (this.screenWidth - (colorSize * colorsPerRow + spacing * (colorsPerRow - 1))) / 2

    this.backgroundColors.forEach((color, index) => {
      const x = startX + (index % colorsPerRow) * (colorSize + spacing)
      const y = 150 + Math.floor(index / colorsPerRow) * (colorSize + spacing)

      this.roundRect(x, y, colorSize, colorSize, 10)
      this.ctx.fillStyle = color
      this.ctx.fill()

      this.roundRect(x, y, colorSize, colorSize, 10)
      this.ctx.strokeStyle = '#333'
      this.ctx.lineWidth = 1
      this.ctx.stroke()

      if (this.currentBgIndex === index) {
        this.roundRect(x - 3, y - 3, colorSize + 6, colorSize + 6, 12)
        this.ctx.strokeStyle = '#FF6B6B'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
        this.ctx.lineWidth = 1
      }
    })

    this.roundRect(30, this.screenHeight - 230, this.screenWidth - 60, 50, 15)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('确认颜色', this.screenWidth / 2, this.screenHeight - 198)

    if (this.isLoggedIn && this.currentUser) {
      this.roundRect(30, this.screenHeight - 160, this.screenWidth - 60, 50, 15)
      this.ctx.fillStyle = '#FF9500'
      this.ctx.fill()
      this.ctx.fillStyle = '#fff'
      this.ctx.font = 'bold 20px Arial'
      this.ctx.fillText('退出登录', this.screenWidth / 2, this.screenHeight - 128)
    } else if (!this.isLoggedIn && !this.currentUser) {
      this.roundRect(30, this.screenHeight - 160, this.screenWidth - 60, 50, 15)
      this.ctx.fillStyle = '#FF9500'
      this.ctx.fill()
      this.ctx.fillStyle = '#fff'
      this.ctx.font = 'bold 20px Arial'
      this.ctx.fillText('退出游客登录', this.screenWidth / 2, this.screenHeight - 128)
    }

    this.roundRect(30, this.screenHeight - 90, this.screenWidth - 60, 50, 15)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    this.ctx.fill()
    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.fillText('重置游戏数据', this.screenWidth / 2, this.screenHeight - 58)
  }

  renderMap() {
    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🏠', 35, 38)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🏙️ 选择城市', this.screenWidth / 2, 60)

    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = '20px Arial'
    this.ctx.fillText(`💰 ${this.coins}`, this.screenWidth - 60, 60)

    const levelWidth = 100
    const levelHeight = 100
    const spacing = 50
    const startX = (this.screenWidth - levelWidth) / 2 + this.mapOffset

    for (let i = 0; i < 8; i++) {
      const levelId = i + 1
      const level = this.dataLoader.getLevelById(levelId)
      const levelX = startX + i * (levelWidth + spacing)
      const levelY = this.screenHeight / 2 - levelHeight / 2

      if (this.unlockedLevels.includes(levelId)) {
        this.ctx.fillStyle = '#fff'
        this.roundRect(levelX, levelY, levelWidth, levelHeight, 20)
        this.ctx.fill()

        this.ctx.fillStyle = '#FF6B6B'
        this.roundRect(levelX + 5, levelY + 5, levelWidth - 10, levelHeight - 10, 15)
        this.ctx.fill()

        this.ctx.font = '40px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.fillText(level.icon, levelX + levelWidth / 2, levelY + 45)

        this.ctx.font = '16px Arial'
        this.ctx.fillStyle = '#fff'
        this.ctx.fillText(level.name, levelX + levelWidth / 2, levelY + 80)

        const stars = this.levelStars[levelId] || 0
        let starText = ''
        for (let s = 0; s < 3; s++) {
          starText += s < stars ? '⭐' : '☆'
        }
        this.ctx.font = '14px Arial'
        this.ctx.fillText(starText, levelX + levelWidth / 2, levelY + 100)
      } else {
        this.ctx.fillStyle = 'rgba(128, 128, 128, 0.5)'
        this.roundRect(levelX, levelY, levelWidth, levelHeight, 20)
        this.ctx.fill()

        this.ctx.font = '40px Arial'
        this.ctx.fillStyle = '#666'
        this.ctx.textAlign = 'center'
        this.ctx.fillText('🔒', levelX + levelWidth / 2, levelY + 45)

        this.ctx.font = '16px Arial'
        this.ctx.fillText('???', levelX + levelWidth / 2, levelY + 80)
      }
    }

    this.ctx.fillStyle = '#fff'
    this.ctx.font = '16px Arial'
    this.ctx.fillText('← 左右滑动 →', this.screenWidth / 2, this.screenHeight - 30)
  }

  renderStory() {
    let story = this.storyData || this.dataLoader.getStoryByLevelId(this.currentLevel)
    if (!story) {
      const level = this.dataLoader.getLevelById(this.currentLevel)
      story = {
        levelId: this.currentLevel,
        title: level ? level.name + '之旅' : '关卡' + this.currentLevel,
        character: '导游',
        avatar: '👋',
        dialogues: ['欢迎来到这个城市！', '准备好开始挑战了吗？'],
        background: '#E8E8E8'
      }
    }

    this.ctx.fillStyle = story.background || '#E8E8E8'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🏠', 35, 38)

    this.ctx.fillStyle = '#333'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(story.title, this.screenWidth / 2, 60)

    this.ctx.fillStyle = '#fff'
    this.roundRect(50, 100, this.screenWidth - 100, 200, 20)
    this.ctx.fillStyle = '#333'
    this.ctx.fill()

    this.ctx.font = '48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(story.avatar, this.screenWidth / 2, 160)

    this.ctx.font = '22px Arial'
    this.ctx.fillStyle = '#fff'
    this.ctx.fillText(story.character, this.screenWidth / 2, 210)

    this.roundRect(30, 320, this.screenWidth - 60, 120, 15)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    this.ctx.fill()

    this.ctx.fillStyle = '#333'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'left'
    const text = story.dialogues[this.currentDialogueIndex] || ''
    this.wrapText(text, 50, 360, this.screenWidth - 100)

    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('点击继续 ▼', this.screenWidth / 2, this.screenHeight - 40)
  }

  wrapText(text, x, y, maxWidth) {
    const words = text.split('')
    let line = ''

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = this.ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > maxWidth && i > 0) {
        this.ctx.fillText(line, x, y)
        line = words[i]
        y += 30
      } else {
        line = testLine
      }
    }
    this.ctx.fillText(line, x, y)
  }

  renderPlaying() {
    const level = this.dataLoader.getLevelById(this.currentLevel)
    if (!level) return

    this.ctx.fillStyle = this.backgroundColors[this.currentBgIndex]
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.roundRect(10, 10, 50, 40, 10)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('←', 35, 38)

    this.ctx.textAlign = 'center'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.fillText(level.name, this.screenWidth / 2, 40)

    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.fillText(`分数: ${this.score}`, this.screenWidth - 20, 40)

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    this.roundRect(30, 70, 120, 50, 10)
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('步数', 90, 85)
    this.ctx.font = 'bold 20px Arial'
    this.ctx.fillText(`${this.steps}/${this.maxSteps}`, 90, 108)

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    this.roundRect(this.screenWidth - 150, 70, 120, 50, 10)
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = '18px Arial'
    this.ctx.fillText('目标', this.screenWidth - 90, 85)
    this.ctx.font = 'bold 20px Arial'
    const targetText = this.score >= this.targetScore ? '✓' : this.targetScore.toString()
    this.ctx.fillText(targetText, this.screenWidth - 90, 108)

    if (!this.grid) {
      this.ctx.fillStyle = '#fff'
      this.ctx.font = '16px Arial'
      this.ctx.fillText('网格数据为空', this.screenWidth / 2, 200)
      return
    }

    const cellSize = Math.min(50, (this.screenWidth - 60) / level.cols)
    const boardWidth = level.cols * cellSize
    const boardX = (this.screenWidth - boardWidth) / 2
    const boardY = 140

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    this.roundRect(boardX - 10, boardY - 10, boardWidth + 20, level.rows * cellSize + 20, 15)
    this.ctx.fill()

    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const cell = this.grid[r][c]
        const x = boardX + c * cellSize
        const y = boardY + r * cellSize

        if (this.selectedCell && this.selectedCell.row === r && this.selectedCell.col === c) {
          this.ctx.fillStyle = '#ffd700'
          this.roundRect(x - 3, y - 3, cellSize + 6, cellSize + 6, 8)
          this.ctx.fill()
        }

        if (cell.type !== -1) {
          this.ctx.fillStyle = this.colors[cell.type] || '#ccc'
          this.roundRect(x, y, cellSize - 3, cellSize - 3, 8)
          this.ctx.fill()
        }
      }
    }

    if (this.showCombo) {
      this.ctx.fillStyle = '#ffd700'
      this.ctx.font = 'bold 60px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.globalAlpha = 0.8
      this.ctx.fillText(`${this.comboValue}x Combo!`, this.screenWidth / 2, this.screenHeight / 2)
      this.ctx.globalAlpha = 1
    }
  }

  renderResult() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.textAlign = 'center'

    if (this.gameResult === '胜利') {
      this.ctx.fillStyle = '#FFD700'
      this.ctx.fillText('🎉', this.screenWidth / 2, 150)
      this.ctx.fillStyle = '#fff'
      this.ctx.fillText('胜利！', this.screenWidth / 2, 220)

      const stars = this.calculateStars()
      let starText = ''
      for (let s = 0; s < 3; s++) {
        starText += s < stars ? '⭐' : '☆'
      }
      this.ctx.font = '40px Arial'
      this.ctx.fillText(starText, this.screenWidth / 2, 300)
    } else {
      this.ctx.fillStyle = '#FF6B6B'
      this.ctx.fillText('😢', this.screenWidth / 2, 150)
      this.ctx.fillStyle = '#fff'
      this.ctx.fillText('失败', this.screenWidth / 2, 220)
    }

    this.ctx.font = '24px Arial'
    this.ctx.fillText(`最终分数: ${this.score}`, this.screenWidth / 2, 370)
    this.ctx.fillText(`目标分数: ${this.targetScore}`, this.screenWidth / 2, 410)

    if (this.gameResult === '胜利') {
      this.ctx.fillStyle = '#FFD700'
      this.ctx.fillText(`+50 金币`, this.screenWidth / 2, 450)
    }

    this.roundRect(this.screenWidth / 2 - 80, this.screenHeight - 120, 160, 50, 25)
    this.ctx.fillStyle = '#FF6B6B'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 22px Arial'
    this.ctx.fillText('返回地图', this.screenWidth / 2, this.screenHeight - 87)

    this.roundRect(this.screenWidth / 2 - 80, this.screenHeight - 200, 160, 50, 25)
    this.ctx.fillStyle = '#4ECDC4'
    this.ctx.fill()
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 22px Arial'
    this.ctx.fillText('再来一关', this.screenWidth / 2, this.screenHeight - 167)
  }

  roundRect(x, y, width, height, radius) {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }

  loop() {
    this.render()
    requestAnimationFrame(() => this.loop())
  }
}

new Main()