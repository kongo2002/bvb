Utils =

  toDateString: (date) ->
    fmt = (x) ->
      if value < 10 then "0#{value}" else value.toString()

    day = date.getDate()
    month = date.getMonth() + 1
    year = date.getFullYear()

    "#{year}-#{fmt month}-#{fmt day}"

  call: (path, callback, data, mtd, error) ->
    method = mtd ? (if data? then 'GET' else 'POST')
    url = "rest/#{path}"

    failure = (e) ->
      msg = error ? "#{method} '#{url}' failed unexpectedly"

      if error and typeof error is 'function'
        error e
      else
        console.error msg

        box = $('#alertdiv')
        if box
          box.find('span').text(msg)
          box.addClass('in')

    onFailure = (_, stat, e) ->
      if error
        failure e
      else if stat
        failure stat
      else
        failure()

    onSuccess = (response) ->
      if response and response.success
        callback response.data if callback
      else if response.message
        failure response.message
      else
        failure()

    postData =
      if data
        if typeof data is 'string'
          data
        else
          JSON.stringify(data)
      else null

    $.ajax(
      type: method
      success: onSuccess
      error: onFailure
      data: postData
    )

  chainer: (count, cb, ctx) ->
    finished = 0
    () ->
      finished += 1
      if callback and finished >= count
        callback.call ctx

  contains: (array, elem) ->
    if array and element
      array.some (x) -> x is elem
    false

  pluck: (array, prop) ->
    elem[prop] for elem in array

  first: (array, pred) ->
    if array and pred
      return elem for elem in array when pred elem
    null

class Goal
  constructor: (id) ->
    @player = ko.observable(id || 0)

class Assist
  constructor: (id) ->
    @player = ko.observable(id || 0)

class Match
  constructor: (@bvb) ->
    @id = ko.observable(0)
    @date = ko.observable(new Date())
    @opponent = ko.observable(0)
    @opponentGoals = ko.observable(0)
    @homegame = ko.observable(true)
    @goals = ko.observableArray()
    @assists = ko.observableArray()
    @startingPlayers = ko.observableArray()
    @substitutePlayers = ko.observableArray()

    @goalCandidates = ko.computed =>
      candidates = []
      $.each @startingPlayers(), (_, p) -> candidates.push p
      $.each @startingPlayers(), (_, p) ->
        candidates.push p unless Utils.contains candidates, p
      candidates

    @substitutionCandidates = ko.computed =>
      candidates = []
      starters = @startingPlayers()
      $.each @bvb.players(), (_, p) ->
        candidates.push p unless Utils.contains candidates, p
      candidates

    @computedGoals = ko.computed =>
      @goals().filter((g) -> g.player() > 0).length

    @computedAssists = ko.computed =>
      @assists().filter((a) -> a.player() > 0).length

    @numPlayers = ko.computed =>
      @startingPlayers().length

    @numSubstitutes = ko.computed =>
      @substitutePlayers().length

    @isValid = ->
      substitutes = @numSubstitutes()

      @opponent() and
        substitutes >= 0 and
        substitutes <= 3 and
        @numPlayers() == 11

    @isNewMatch -> @id < 1

    @name = ko.computed =>
      opp = @opponent()
      if opp > 0
        team = @bvb.getTeam opp
        if team
          return team.name
      ''

    @actionName = ko.computed =>
      if @isNewMatch() then 'Add match' else 'Edit match'

    @matchName = ko.computed =>
      team = 'Borussia Dortmund'
      if @isNewMatch()
        ''
      else if @homegame()
        "#{team} : #{@name()} - #{@computedGoals()} : #{@opponentGoals()}"
      else
        "#{@name()} : #{team} - #{@opponentGoals()} : #{@computedGoals()}"

    @save = =>
      dto = @toDto()

      if @isNewMatch()
        Utils.call('matches/match', (m) =>
          @id(m.id)
        , dto)
      else
        Utils.call('matches/match', null, dto, 'PUT')

    @addGoal = => @goals.push new Goal()

    @addAssist = => @assists.push new Assist()

    @removeGoal = (g) => @goals.remove g

    @removeAssist = (a) => @assist.remove a

  toDto: ->
    getPlayer = (elem) ->
      id: elem.player()

    return (
      id            : @id()
      opponent      : @opponent()
      homegame      : @homegame()
      date          : @date()
      opponentGoals : @opponentGoals()
      starters      : @startingPlayers()
      substitutes   : @substitutePlayers()
      goals         : @goals().map getPlayer
      assists       : @assists().map getPlayer
    )

  fromDto: (dto, bvb) ->
    m = new Match bvb

    m.id dto.id
    m.homegame dto.homegame
    m.opponent dto.opponent
    m.opponentGoals dto.opponentGoals
    m.date dto.date

    m.startingPlayers Utils.pluck dto.starters, 'id' if dto.starters
    m.substitutePlayers Utils.pluck dto.substitutes, 'id' if dto.substitutes

    if dto.goals
      m.goals dto.goals.map (x) -> new Goal x.id

    if dto.assists
      m.assists dto.assists.map (x) -> new Assist x.id

    m

class Admin

  constructor: (@bvb) ->

    @selectedMatch = ko.observable()
    @match = ko.observable(new Match @bvb)

    @selectedMatch.subscribe (sel) =>
      if sel and sel.id
        Utils.call "matches/match/#{sel.id}", (m) =>
          @match Match.fromDto m, @bvb
      else
        @match new Match @bvb

  remove: ->
    m = @match()

    if not m.isNewMatch()
      Utils.call("matches/match/#{m.id()}", =>
        # refresh match list
        @bvb.loadMatches => @selectedMatch null
      , null, 'DELETE')

class BVB

  constructor: ->

    @matches = ko.observableArray()
    @players = ko.observableArray()
    @teams = ko.observableArray()

    @loggedIn = ko.observable(false)
    @user = ko.observable('')

    @welcome = ko.computed =>
      if @loggedIn() then "Welcome, #{@user()}" else 'Login'

  loadPlayers: (cb) =>
    Utils.call 'players', (ps) =>
      @players.removeAll()
      $.each ps, (_, p) => @players.push p

      # invoke callback if given
      cb.call @, ps if cb

  loadTeams: (cb) =>
    Utils.call 'teams', (ts) =>
      @teams.removeAll()
      $.each ts, (_, t) => @teams.push t

      # invoke callback if given
      cb.call @, ts if cb

  loadMatches: (cb) =>
    team = 'Borussia Dortmund'

    match = (m) -> (
      id: m.id
      date: m.date
      showName: "#{m.opponent} (#{m.date})"
      name: if m.homegame then "#{team} : #{m.opponent}" else "#{m.opponent} : #{team}"
      result: m.result
    )

    Utils.call 'matches', (ms) =>
      @matches.removeAll()
      $.each ms, (_, m) => @matches.push match m

      # invoke callback if given
      cb.call @, ms if cb

  getTeam: (id) ->
    teams = @teams()
    Utils.first teams, (t) -> t.id == id

  getPlayer: (id) ->
    players = @players()
    Utils.first players, (p) -> p.id == id

  getPlayers: (ids) ->
    @players().filter (p) ->
      ids.indexOf p.id != -1

  init: (cb) ->
    chain = Utils.chainer 4, cb, @

    @loadPlayers chain
    @loadMatches chain
    @loadTeams   chain
    @checkLogin  chain

  login: (user, pw, cb, err) ->
    data = user: user, password: pw if user and pw

    Utils.call 'login', (x) =>
      @loggedIn true
      @user x.user if x.user

      cb.call @, x if cb and typeof cb is 'function'
    , data, 'POST', err

  checkLogin: (cb) ->
    @login null, null, cb, (x) =>
      cb.call @, x if cb and typeof cb is 'function'

  logout: (cb) ->
    Utils.call 'logout', (x) =>
      @loggedIn false
      @user ''

      cb.call @, x if cb and typeof cb is 'function'
    , null, 'POST'

# vim: set et sts=2 sw=2:
