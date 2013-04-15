var Utils = {
    zeroFilled : function(value) {
        if (value < 10)
            return '0' + value;
        return value.toString();
    },
    toDateString : function(date) {
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();

        return this.zeroFilled(month) + '/' + this.zeroFilled(day) + '/' + year;
    },
    call : function(path, callback, data, mtd) {
        var method = (!mtd) ? (!data) ? 'GET' : 'POST' : mtd;
        var url = 'rest/' + path;

        var failure = function(error) {
            if (error)
                console.error(error);
            else
                console.error(method + ' "' + url + '" failed unexpectedly');
        }

        var onFailure = function(_, stat, error) {
            if (error)
                failure(error);
            else if (stat)
                failure(stat);
            else
                failure();
        }

        var onSuccess = function(response) {
            if (response && response.success)
                callback(response.data);
            else if (response.message)
                failure(response.message);
            else
                failure();
        }

        $.ajax(url, {
            type: method,
            success: onSuccess,
            error: onFailure
        });
    },
    contains : function(array, element) {
        if (!array || !element) return false;
        var length = array.length;
        for (var i=0; i<length; i++) {
            if (element == array[i])
                return true;
        }
        return false;
    },
    chainer : function(numCallbacks, callback, context) {
        var finished = 0;
        return function() {
            finished += 1;
            if (callback && finished >= numCallbacks) {
                callback.call(context);
            }
        };
    },
    pluck : function(array, property) {
        var newArray = [], len = array.length;
        for (var i=0; i<len; i++) {
            newArray[i] = array[i][property];
        }
        return newArray;
    }
}

function Goal(playerId) {
    this.player = ko.observable(playerId || 0);
}

function Match(bvb) {
    var self = this;
    var now = Utils.toDateString(new Date());

    this.bvb = bvb;
    this.id = ko.observable(0);
    this.date = ko.observable(now);
    this.opponent = ko.observable('');
    this.opponentGoals = ko.observable(0);
    this.homegame = ko.observable(true);
    this.goals = ko.observableArray();
    this.startingPlayers = ko.observableArray();
    this.substitutePlayers = ko.observableArray();

    this.goalCandidates = ko.computed(function() {
        var candidates = [];
        $.each(self.startingPlayers(), function(_, p) { candidates.push(p); });
        $.each(self.substitutePlayers(), function(_, p) {
            if (!Utils.contains(candidates, p))
                candidates.push(p);
        });
        return bvb.getPlayers(candidates);
    });

    this.computedGoals = ko.computed(function() {
        return self.goals().filter(function(g) {
            return g.player() > 0;
        }).length;
    });

    this.numPlayers = ko.computed(function() {
        return self.startingPlayers().length;
    });

    this.numSubstitutes = ko.computed(function() {
        return self.substitutePlayers().length;
    });

    this.isValid = function() {
        var substitutes = self.numSubstitutes();

        if (self.opponent() &&
            self.numPlayers() == 11 &&
            substitutes >= 0 && substitutes <= 3)
            return true;
        return false;
    }

    this.isNewMatch = function() {
        return self.id() < 1;
    }

    this.actionName = ko.computed(function() {
        return self.isNewMatch() ? 'Add match' : 'Edit match';
    });

    this.save = function() {
        /* TODO */
        var goals = self.goals();
        console.debug(goals);
        console.debug(goals.length);
    }

    this.addGoal = function() {
        self.goals.push(new Goal());
    }

    this.removeGoal = function(goal) {
        self.goals.remove(goal);
    }
}

Match.fromDto = function(dto, bvb) {
    var m = new Match(bvb);

    m.id(dto.id);
    m.homegame(dto.homegame);
    m.opponent(dto.name);
    m.opponentGoals(dto.opponentGoals);
    m.date(dto.date);

    if (dto.starters) {
        m.startingPlayers(Utils.pluck(dto.starters, 'id'));
    }

    if (dto.substitutes) {
        m.substitutePlayers(Utils.pluck(dto.substitutes, 'id'));
    }

    if (dto.goals) {
        m.goals($.map(dto.goals, function(x) { return new Goal(x.id); }));
    }

    return m;
}

function Admin(bvb) {
    var self = this;
    this.bvb = bvb;
    this.selectedMatch = ko.observable();
    this.match = ko.observable(new Match(bvb));

    this.selectedMatch.subscribe(function (selection) {
        if (selection && selection.id) {
            Utils.call('matches/match/'+selection.id, function(m) {
                self.match(Match.fromDto(m, bvb));
            });
        } else
            self.match(new Match(bvb));
    });
}

function BVB() {
    this.matches = ko.observableArray();
    this.players = ko.observableArray();
    this.teams = ko.observableArray();
};

BVB.prototype.loadPlayers = function(callback) {
    var self = this;

    Utils.call('players', function(ps) {
        self.players.removeAll();
        $.each(ps, function(_, p) { self.players.push(p); });

        /* invoke callback if given */
        if (callback) {
            callback.call(self, ps);
        }
    });
};

BVB.prototype.loadTeams = function(callback) {
    var self = this;

    Utils.call('teams', function(ts) {
        self.teams.removeAll();
        $.each(ts, function(_, t) { self.teams.push(t); });

        /* invoke callback if given */
        if (callback) {
            callback.call(self, ts);
        }
    });
};

BVB.prototype.loadMatches = function(callback) {
    var self = this;
    var team = 'Borussia Dortmund';

    function match(m) {
        var home = m.homegame;
        return {
            id : m.id,
            date : m.date,
            showName : m.opponent+' ('+m.date+')',
            name : home ? (team+' : '+m.opponent) : (m.opponent+' : '+team),
            result : m.result
        };
    }

    Utils.call('matches', function(ms) {
        self.matches.removeAll();
        $.each(ms, function(_, m) { self.matches.push(match(m)); });

        /* invoke callback if given */
        if (callback) {
            callback.call(self, ms);
        }
    });
};

BVB.prototype.getPlayer = function(id) {
    var players = this.players();
    var len = players.length;
    for (var i=0; i<len; i++) {
        var player = players[i];
        if (player.id == id)
            return player;
    }
    return null;
};

BVB.prototype.getPlayers = function(playerIds) {
    var players = [], len = playerIds.length;
    for (var i=0; i<len; i++) {
        var player = this.getPlayer(playerIds[i]);
        if (player != null)
            players.push(player);
    }
    return players;
};

BVB.prototype.init = function(callback) {
    var chain = Utils.chainer(3, callback, this);

    this.loadPlayers(chain);
    this.loadMatches(chain);
    this.loadTeams(chain);
};

$(function() {
    /* initialize */
    console.debug('initializing bvb.js');

    /* global AJAX setup */
    $.ajaxSetup({
        url: 'index.php',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        cache: false,
        timeout: 5000
    });

    /* initialize BVB instance */
    var bvb = new BVB();

    bvb.init(function() {
        /* initialize admin */
        bvb.admin = new ko.observable(new Admin(bvb));

        /* apply knockout MVVM bindings after BVB was initialized */
        ko.applyBindings(bvb);

        /* hook into datepickers */
        $('.datepicker').datepicker({
            format: 'yyyy-mm-dd'
        });
    });
});
