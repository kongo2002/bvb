/**
 * Enumeration containing all different match types
 * and their scores
 */
var MatchType = {
    Bundesliga : {
        name : 'Bundesliga',
        factor : 1
    },
    Pokal : {
        name : 'Pokal',
        factor : 1.5
    },
    CLGroupPhase : {
        name : 'Champions League - Group phase',
        factor : 2.5
    },
    CL16 : {
        name : 'Champions League - Round of 16',
        factor : 3.5
    },
    CL8 : {
        name : 'Champions League - Quarter finals',
        factor : 4.5
    },
    CL4 : {
        name : 'Champions League - Semi finals',
        factor : 5.5
    },
    CLFinal : {
        name : 'Champions League - Final',
        factor : 6.5
    }
}

/**
 * Various bonus score rules
 */
var Bonus = {
    Schalke : {
        name : 'Schalke 04',
        description : 'Match against Schalke 04',
        func : function(match) { return match.score; }
    },
    Bayern : {
        name : 'Bayern München',
        description : 'Match against Bayern München',
        func : function(match) { return match.score; }
    },
    POTD : {
        name : 'Kicker Player of the day',
        description : 'Got elected as "Kicker Player of the day"',
        func : function(match) { return 200000; }
    },
    TOTD : {
        name : 'Kicker Team of the day',
        description : 'Got chosen for the "Kicker Team of the day"',
        func : function(match) { return 25000; }
    },
    ParriedPenalty : {
        name : 'Parried penalty kick',
        description : 'Parried a penalty kick',
        func : function(match) { return 300000; }
    },
    ShotPenalty : {
        name : 'Scored a penalty kick goal',
        description : 'Scored a penalty kick goal',
        func : function(match) { return 300000; }
    },
    MatchWinningGoal : {
        name : 'Scored match winning goal',
        description : 'Scored the match winning goal',
        func : function(match) { return match.score; }
    }
}

/**
 * Various triggered bonus scores
 */
var Triggers = [
    {
        name : 'Win!',
        description : 'Win bonus',
        pred : function(match) {
            return match.match.isWin();
        },
        func : function(match) {
            return 10000;
        }
    },
    {
        name : 'Hattrick',
        description : 'Scored 3 or more goals in one match',
        pred : function(match) {
            return match.goals >= 3;
        },
        func : function(match) {
            return 500000;
        }
    },
    {
        name : 'Yellow card',
        description : 'Got a yellow card',
        isMalus : true,
        pred : function(match) {
            return match.yellow == 1;
        },
        func : function(match) {
            return -25000;
        }
    },
    {
        name : 'Yellow/red card',
        description : 'Got a yellow followed by a red card',
        isMalus : true,
        pred : function(match) {
            return match.yellow > 1;
        },
        func : function(match) {
            return -100000;
        }
    },
    {
        name : 'Red card',
        description : 'Got banned from the match by a red card',
        isMalus : true,
        pred : function(match) {
            return match.red > 0;
        },
        func : function(match) {
            return -300000;
        }
    }
]

/**
 * Various helper functions
 */
var Helpers = {
    /* return a Date object based on the given date elements */
    day : function(year, month, day) {
        var date = new Date(year, month, day, 0, 0, 0, 0);
        return date;
    },

    /* sorting function */
    byDate : function(one, two) {
        if (one.date < two.date)
            return -1;
        return 1;
    },

    /* number to currency conversion */
    toCurrency : function(number) {
        var strNumber = number.toString();

        if (strNumber.length > 3)
            strNumber = strNumber.split('').reverse().reduce(function(acc, num, i) {
                return num + (i && !(i%3) ? ',' : '') + acc;
            });

        return strNumber + ' €';
    }
}

var Position = {
    T : {
        name : 'Goalkeeper',
        goal : 1000000,
        assist : 500000,
        holdPenalty : 300000,
        specials : [
        {
            name : '"Weisse Weste"',
            description : 'Bonus for a match with a clean sheet',
            pred : function(match) {
                return match.played && match.match.opponentGoals < 1;
            },
            func : function(match) {
                return 100000;
            }
        }]
    },
    IV : {
        name : 'Central defender',
        goal : 250000,
        assist : 250000,
        specials : [
        {
            name : '"Weisse Weste"',
            description : 'Bonus for a match with a clean sheet',
            pred : function(match) {
                return match.played && match.match.opponentGoals < 1;
            },
            func : function(match) {
                return 25000;
            }
        }]
    },
    AV : {
        name : 'Wing back',
        goal : 300000,
        assist : 100000
    },
    M : {
        name : 'Midfield',
        goal : 100000,
        assist : 50000
    },
    DM : {
        name : 'Defensive midfield',
        goal : 200000,
        assist : 100000
    },
    A : {
        name : 'Wing player',
        goal : 150000,
        assist : 75000
    },
    S : {
        name : 'Striker',
        goal : 75000,
        assist : 125000
    },
    Q : {
        name : 'Team'
    }
}

/**
 * @constructor
 *
 * Class describing a player
 */
function Player(name, firstName, position, transfer, extraFuncs) {
    this.name = name;
    this.firstName = firstName;
    this.position = position;
    this.matches = [];
    this.goals = [];
    this.assists = [];
    this.boni = [];
    this.transfer = transfer || 0;
    this.score = 0;
    this.extraFuncs = extraFuncs;
    this.played = 0;
    this.substituted = 0;
}

Player.prototype.getGoalCount = function() {
    return this.goals.length;
}

Player.prototype.getAssistCount = function() {
    return this.assists.length;
}

Player.prototype.getTransfer = function() {
    return this.transfer;
}

Player.prototype.getScore = function() {
    return this.score;
}

Player.prototype.getName = function() {
    if (this.position == Position.Q)
        return this.name;
    return this.firstName + ' ' + this.name;
}

Player.prototype.addMatch = function(match) {
    this.matches.push(match);

    if (match.played)
        this.played += 1;

    if (match.substituted)
        this.substituted += 1;

    if (match.goals)
        this.goals.push({ date : match.date, goals : match.goals });

    if (match.assists)
        this.assists.push({ date : match.date, assists : match.assists });

    if (match.boni) {
        var boni = this.boni;
        match.boni.forEach(function(b) {
            boni.push({ date : match.date, bonus : b.boni });
        });
    }
}

Player.prototype._get = function(selector) {
    var data = [];

    this.matches.sort(Helpers.byDate).forEach(function(match) {
        data.push([match.date, selector(match)]);
    });

    return data;
}

Player.prototype.getScores = function() {
    return this._get(function(elem) { return elem.score; });
}

Player.prototype.getGoals = function() {
    return this._get(function(elem) { return elem.goals; });
}

Player.prototype.getAssists = function() {
    return this._get(function(elem) { return elem.assists; });
}

var getPlayer = function(position) {
    return function(name, firstName, transfer, extraFuncs) {
        return new Player(name, firstName, position, transfer, extraFuncs);
    }
}

var Torwart = getPlayer(Position.T);
var InnenVerteidigung = getPlayer(Position.IV);
var AussenVerteidigung = getPlayer(Position.AV);
var Mittelfeld = getPlayer(Position.M);
var DefensivesMittelfeld = getPlayer(Position.DM);
var Aussen = getPlayer(Position.A);
var Sturm = getPlayer(Position.S);

/**
 * @constructor
 *
 * All players of Borussia Dortmund
 */
function Players() {
    this.Team = new Player('Borussia Dortmund', 'Team', Position.Q);

    this.Alomerovic = Torwart('Alomerovic', 'Zlatan');
    this.Langerak = Torwart('Langerak', 'Mitchell');
    this.Weidenfeller = Torwart('Weidenfeller', 'Roman');

    this.Santana = InnenVerteidigung('Santana', 'Felipe');
    this.Hummels = InnenVerteidigung('Hummels', 'Mats');
    this.Subotic = InnenVerteidigung('Subotic', 'Neven');

    this.Kirch = AussenVerteidigung('Kirch', 'Oliver', 350000);
    this.Löwe = AussenVerteidigung('Löwe', 'Chris');
    this.Owomoyela = AussenVerteidigung('Owomoyela', 'Patrick');
    this.Piszczek = AussenVerteidigung('Piszczek', 'Lukasz');
    this.Schmelzer = AussenVerteidigung('Schmelzer', 'Marcel');

    this.Gündogan = DefensivesMittelfeld('Gündogan', 'Ilkay');
    this.Kehl = DefensivesMittelfeld('Kehl', 'Sebastian');
    this.Bender = DefensivesMittelfeld('Bender', 'Sven');

    this.Grosskreutz = Aussen('Grosskreutz', 'Kevin');
    this.Blaszczykowski = Aussen('Blaszczykowski', 'Jakub');

    this.Amini = Mittelfeld('Amini', 'Mustafa');
    this.Bittencourt = Mittelfeld('Bittencourt', 'Leonardo');
    this.Götze = Mittelfeld('Götze', 'Mario');
    this.Leitner = Mittelfeld('Leitner', 'Moritz');
    this.Perisic = Mittelfeld('Perisic', 'Ivan');
    this.Reus = Mittelfeld('Reus', 'Marco', 17100000);

    this.Ducksch = Sturm('Ducksch', 'Marvin');
    this.Lewandowski = Sturm('Lewandowski', 'Robert');
    this.Schieber = Sturm('Schieber', 'Julian', 5500000);
}

Players.prototype.forEach = function(func) {
    var i = 0;
    for (var name in this) {
        var player = this[name];
        if (typeof player !== 'function') {
            func.call(player, player, i, name);
            i += 1;
        }
    }
}

/**
 * @constructor
 *
 * Class holding one match's information
 */
function Match(date, goals, opponentGoals, home, type) {
    this.date = date;
    this.goals = goals;
    this.opponentGoals = opponentGoals;
    this.home = home;
    this.matchType = type;
}

Match.prototype.isWin = function() {
    return this.goals > this.opponentGoals;
}

/**
 * @constructor
 *
 * Class holding a reference information for an
 * aquired bonus score.
 */
function BonusInfo(date, bonus, value) {
    this.date = date;
    this.name = bonus.name;
    this.description = bonus.description || '';
    this.value = value;
}

/**
 * @constructor
 *
 * Class encapsulating all major functionality
 */
function BVB() {

    var self = this;

    /* initialize players */
    this.players = new Players();

    /* list of games */
    this.games = [];

    /* build a game object based on the given result and match type */
    var addMatch = function(date, opponent, goals, opponentGoals, scores, players, substitutions, homegame, matchType) {

        var dortmund = '<em>Borussia Dortmund</em>';
        var matchType = matchType || 'Bundesliga';
        var mType = MatchType[matchType];
        var game = homegame
            ? (dortmund + ' : ' + opponent)
            : (opponent + ' : ' + dortmund);
        var result = homegame
            ? goals + ':' + opponentGoals
            : opponentGoals + ':' + goals;

        var match = new Match(date, goals, opponentGoals, home, mType);

        var buildMatch = function() {
            return {
                date : date,
                game : game,
                result : result,
                type : mType,
                match : match,
                score : 0,
                goals : 0,
                assists : 0,
                boni : [],
                boniSum : 0,
                goalSum : 0,
                assistSum : 0,
                yellow : 0,
                red : 0,
                played : false,
                substituted : false
            }
        }

        var didPlay = function(player) {
            if (players) {
                for (var p in players) {
                    if (player.name == players[p])
                        return true;
                }
            }
            return false;
        };

        var wasSubstituted = function(player) {
            if (substitutions) {
                for (var s in substitutions) {
                    if (player.name == substitutions[s])
                        return true;
                }
            }
            return false;
        };

        var overall = buildMatch();

        self.players.forEach(function(player, i, name) {
            /* create an empty match object */
            var match = buildMatch();

            /* return if it's the team's virtual player */
            if (player.position == Position.Q)
                return;

            if (scores[name]) {
                var p = scores[name];

                /* player is in the scores collection
                 * so he obviously took part in the match */
                match.played = true;

                /* process player's goals */
                match.goals = p.goals || 0;
                var goalValue = player.position.goal * mType.factor * match.goals;

                match.goalSum += goalValue;
                match.score += goalValue;

                overall.goals += match.goals;
                overall.goalSum += goalValue;
                overall.score += goalValue;

                /* process player's assists */
                match.assists = p.assists || 0;
                var assistValue = player.position.assist * mType.factor * match.assists;

                match.assistSum += assistValue;
                match.score += assistValue;

                overall.assists += match.assists;
                overall.assistSum += assistValue;
                overall.score += assistValue;

                /* process boni */
                if (p.boni) {
                    p.boni.forEach(function(b) {
                        var value = b.func.call(player, match);
                        match.boniSum += value;

                        var bonusInfo = new BonusInfo(match.date, b, value);

                        match.boni.push(bonusInfo);
                        overall.boni.push(bonusInfo);
                    });
                }

                /* process cards */
                var yellow = p.yellow || 0;
                var red = p.red || 0;

                match.yellow += yellow;
                match.red += red;

                overall.yellow += yellow;
                overall.red += red;
            }
            else if (didPlay(player))
                match.played = true;
            else if (wasSubstituted(player)) {
                match.played = true;
                match.substituted = true;
            }

            /* process the player's custom boni */
            if (player.extraFuncs) {
                player.extraFuncs.forEach(function(b) {
                    var applies = !b.pred || b.pred.call(player, match);
                    if (applies) {
                        var value = b.func.call(player, match);
                        match.boniSum += value;

                        var bonusInfo = new BonusInfo(match.date, b, value);

                        match.boni.push(bonusInfo);
                        overall.boni.push(bonusInfo);
                    }
                });
            }

            /* process the player's position boni */
            if (player.position.specials) {
                player.position.specials.forEach(function(s) {
                    var applies = !s.pred || s.pred.call(player, match);
                    if (applies) {
                        var value = s.func.call(player, match);
                        match.boniSum += value;

                        var bonusInfo = new BonusInfo(match.date, s, value);

                        match.boni.push(bonusInfo);
                        overall.boni.push(bonusInfo);
                    }
                });
            }

            /* process triggered boni */
            Triggers.forEach(function(t) {
                var applies = !t.pred || t.pred.call(player, match);
                if (applies) {
                    var value = t.func.call(player, match);
                    match.boniSum += value;

                    var bonusInfo = new BonusInfo(match.date, t, value);

                    match.boni.push(bonusInfo);
                    overall.boni.push(bonusInfo);
                }
            });

            /* add sum of boni at last in order to calculate all
             * other bonus scores based on the pure score value */
            match.score += match.boniSum;
            overall.boniSum += match.boniSum;
            overall.score += match.boniSum;

            player.addMatch(match);
        });

        if (overall.goals != goals)
            throw 'Number of goals (' + goals + ') does not match with the specified players\' scores ('
                    + overall.goals + ')';

        self.players.Team.addMatch(overall);
        self.games.push(overall);
    }

    /* add all available matches */
    addMatch(Helpers.day(2012, 8, 18), 'FC Oberneuland', 3, 0, {
            Blaszczykowski : { goals : 1, assists : 1 },
            Reus : { goals : 1 },
            Perisic : { goals : 1 },
            Lewandowski : { assists : 1 },
            Piszczek : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Santana', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Perisic', 'Reus', 'Lewandowski'], [ 'Götze', 'Schieber', 'Grosskreutz' ],
        false, 'Pokal');

    addMatch(Helpers.day(2012, 8, 24), 'Werder Bremen', 2, 1, {
             Reus : { goals : 1, boni : [ Bonus.TOTD ] },
             Kehl : { boni : [ Bonus.TOTD ] },
             Götze : { goals : 1 },
             Blaszczykowski : { assists : 1 },
             Lewandowski : { assists : 1 }
        },
        [ 'Weidenfeller', 'Kirch', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Grosskreutz', 'Reus', 'Lewandowski'], [ 'Leitner', 'Götze', 'Perisic' ],
        true);

    addMatch(Helpers.day(2012, 9, 1), '1. FC Nürnberg', 1, 1, {
             Blaszczykowski : { goals : 1 },
             Perisic : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Perisic', 'Reus', 'Lewandowski'], [ 'Götze', 'Schieber', 'Grosskreutz' ]);

    addMatch(Helpers.day(2012, 9, 15), 'Bayer Leverkusen', 3, 0, {
            Hummels : { goals : 1, boni : [ Bonus.TOTD ] },
            Schmelzer : { assists : 1, boni : [ Bonus.TOTD ] },
            Blaszczykowski : { goals : 1 },
            Reus : { assists : 1 },
            Lewandowski : { goals : 1, boni : [ Bonus.TOTD ] },
            Piszczek : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Götze', 'Grosskreutz', 'Lewandowski'], [ 'Reus', 'Perisic', 'Leitner' ],
        true);

    addMatch(Helpers.day(2012, 9, 18), 'Ajax Amsterdam', 1, 0, {
            Lewandowski : { goals : 1, boni : [ Bonus.MatchWinningGoal ] },
            Piszczek : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Götze', 'Reus', 'Lewandowski'], [ 'Leitner', 'Schieber', 'Perisic' ],
        true, 'CLGroupPhase');

    addMatch(Helpers.day(2012, 9, 22), 'Hamburger SV', 2, 3, {
            Perisic : { goals : 2 },
            Lewandowski : { assists : 1 },
            Piszczek : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Leitner', 'Kehl', 'Perisic', 'Götze', 'Reus', 'Lewandowski'], [ 'Schieber', 'Blaszczykowski' ]);

    addMatch(Helpers.day(2012, 9, 25), 'Eintracht Frankfurt', 3, 3, {
            Götze : { goals : 1, boni : [ Bonus.TOTD ] },
            Piszczek : { goals : 1, assists : 1 },
            Reus : { goals : 1 },
            Hummels : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Leitner', 'Kehl', 'Blaszczykowski', 'Perisic', 'Reus', 'Lewandowski'], [ 'Götze', 'Grosskreutz', 'Gündogan' ]);

    addMatch(Helpers.day(2012, 9, 29), 'Borussia Mönchengladbach', 5, 0, {
            Reus : { goals : 2 },
            Subotic : { goals : 1 },
            Blaszczykowski : { goals : 1, assists : 2 },
            Götze : { assists : 1 },
            Gündogan : { goals : 1, assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Götze', 'Reus', 'Schieber'], [ 'Grosskreutz', 'Bender', 'Santana' ],
        true);
}

BVB.prototype.activatePlayer = function(scores, link, id) {
    return function() {
        scores.find('div.player').addClass('hidden');
        scores.find('ul.navigation li').removeClass('activetab');

        link.addClass('activetab');

        scores.find(id).removeClass('hidden');
    }
}

BVB.prototype.insertPlayers = function(scores) {
    var self = this;
    var list = $('<ul class="navigation"></ul>');

    this.players.forEach(function(player, i, name) {
            var id = '#tab' + i;
        var position = player.position.name.toLowerCase().replace(/[- ]/, '');

        var link = $('<li class="' + position + ' tab'
            + '" id="nav'+i+'"><a href="'+id+'">' + name
            + '</a></li>');

        link.on('click', self.activatePlayer(scores, link, id));

        list.append(link);
    });

    scores.append(list);
}

BVB.prototype.insertScores = function(scores) {
    var games = this.games;

    /* build a score table row */
    var buildRow = function(match) {
        return $('<tr class="row"><td>' + match.date.toLocaleDateString() + '</td>' +
                 '<td>' + match.game + '</td>' +
                 '<td>' + match.type.name + '</td>' +
                 '<td>' + match.result + '</td>' +
                 '<td class="currency">' + Helpers.toCurrency(match.score) + '</td></tr>');
    }

    /* build a match's detail view */
    var buildDetail = function(player, match) {
        var detail = '<tr class="hidden"><td class="detail" colspan="5">' +
            '<div class="detailRow"><span>' + match.type.name + ':</span></div>';

        /* add goals score */
        if (match.goals) {
            detail += '<div class="detailRow">Goals: ' + match.goals;

            if (player.position.goal)
                detail += ' * ' + Helpers.toCurrency(player.position.goal * match.type.factor);

            detail += ' = ' + Helpers.toCurrency(match.goalSum) + '</div>';
        }

        /* add assists score */
        if (match.assists) {
            detail += '<div class="detailRow">Assists: ' + match.assists;

            if (player.position.assist)
                detail += ' * ' + Helpers.toCurrency(player.position.assist * match.type.factor);

            detail += ' = ' + Helpers.toCurrency(match.assistSum) +'</div>';
        }

        /* add bonus scores */
        if (match.boni) {
            match.boni.forEach(function(b) {
                detail += '<div class="detailRow">' + b.name + ' = ' +
                    Helpers.toCurrency(b.value) + '</div>';
            });
        }

        /* player didn't score at all */
        if (!match.goals && !match.assists && !match.boniSum) {
            detail += '<div class="detailRow">No scores at all</div>';
        }

        detail += '</td></tr>';
        return $(detail);
    }

    /* build the player's information */
    var buildInfo = function(elem, player, i) {
        var div = $('<div id="info' + i + '"></div>');
        var table = $('<table class="information"></table>');

        /* add information rows */
        var addRow = function(name, value) {
            table.append('<tr><td class="infoname">' + name + ':</td><td class="infovalue">' + value + '</td></tr>');
        };

        addRow('Position', player.position.name);
        addRow('Games played', player.played + (player.substituted
                    ? (' (' + player.substituted + ' substitutions)')
                    : ''));

        var goals = player.getGoalCount();
        var assists = player.getAssistCount();

        if (goals) addRow('Goals', goals);
        if (assists) addRow('Assists', assists);

        div.append(table);
        elem.append('<h2>' + player.getName() + '</h2>');
        elem.append(div);
    }

    /* build a summary table row */
    var buildSummary = function(description, sum, title) {
        var tip = title || '';
        return '<tr class="summary" title="' + tip + '"><td colspan="4">' + description + '</td>' +
            '<td class="currency">' + Helpers.toCurrency(sum) + '</td></tr>';
    }

    /* build the player specific chart */
    var buildChart = function(elem, player, i) {
        /* create header and div */
        var div = $('<div id="chart' + i +'" class="chart"></div>');
        elem.append('<h3>Development</h3>');
        elem.append(div);

        var chart = $.plot(div, [{
            data : player.getScores(),
            yaxis : 1,
            color : '#f2bc00',
            points : { show : true },
            lines : { show : true },
            label : 'Score (in €)',
            shadowSize : 0
        }, {
            data : player.getGoals(),
            yaxis : 2,
            color : '#f8d763',
            points : { show : true },
            lines : { show : true },
            shadowSize : 0,
            label : 'Goals'
        }, {
            data : player.getAssists(),
            yaxis : 2,
            color : '#584400',
            points : { show : true },
            lines : { show : true },
            shadowSize : 0,
            label : 'Assists'
        }],
        {
            grid : { hoverable : true },
            legend : { backgroundOpacity : 0.25 },
            xaxis : { mode : 'time' },
            yaxis : { min : 0 },
            yaxes : [{
                tickFormatter : function(value, axis) {
                    return Helpers.toCurrency(value);
                }
            }, {
                position : 'right'
            }]
        });

        /* highlight the data points of the match row that
         * is currently being hovered over */
        elem.find('tr.row').each(function(i) {
            var elem = $(this);
            elem.on('mouseenter', function() {
                chart.highlight(0, i);
                chart.highlight(1, i);
                chart.highlight(2, i);
            });
            elem.on('mouseleave', function() { chart.unhighlight(); });
        });
    }

    this.players.forEach(function(player, i) {
        /* player's score div */
        var div = $('<div id="tab' + i + '" class="player"></div>');

        /* add player's information */
        if (player.position != Position.Q)
            buildInfo(div, player, i);

        /* table header */
        div.append('<h3>Scores</h3>');
        var table = $('<table><tr><th>Date</th><th>Match</th>' +
            '<th>Championship</th><th>Result</th><th>Points</th></tr></table>');

        var sum = 0;
        player.matches.sort(Helpers.byDate).forEach(function(game) {
            var row = buildRow(game);
            var detail = buildDetail(player, game);

            /* add mouse hover */
            var toggle = function() { row.toggleClass('activerow'); }
            row.on('mouseenter', toggle);
            row.on('mouseleave', toggle);

            /* add detail handler */
            row.on('click', function() { detail.toggleClass('hidden'); });

            sum = sum + game.score;

            table.append(row);
            table.append(detail);
        });

        /* add acquired score row */
        table.append(buildSummary('Acquired score:', sum));

        /* add remaining score/money row (if specified) */
        if (player.getTransfer()) {
            table.append(buildSummary('Remaining:', player.getTransfer() - sum,
                        'Remaining score til reaching the transfer amount of ' +
                        Helpers.toCurrency(player.getTransfer())));
        }

        div.append(table);
        scores.append(div);

        buildChart(div, player, i);
    });
}

/**
 * Document's OnLoad callback
 */
$(function() {
    /* initialize new BVB instance */
    var bvb = new BVB();
    var scores = $('#scores');

    /* insert player's names as tab-like navigation */
    bvb.insertPlayers(scores);

    /* insert all scores into table */
    bvb.insertScores(scores);

    /* active 'team' statistics at first */
    bvb.activatePlayer(scores, $('#nav0'), '#tab0')();

    /* remove all script tags from html */
    $('script').remove();

});
