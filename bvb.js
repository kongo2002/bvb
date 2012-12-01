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
        var date = new Date(year, month-1, day, 0, 0, 0, 0);
        return date;
    },

    /* sorting function: by date */
    byDate : function(one, two) {
        if (one.date < two.date)
            return -1;
        return 1;
    },

    /* sorting function: by total score */
    byScore : function(one, two) {
        return two.score - one.score;
    },

    /* sorting function: by score per match */
    byScorePerMatch : function(one, two){
        return two.getScorePerMatch() - one.getScorePerMatch();
    },

    /* number to currency conversion */
    toCurrency : function(number) {
        var strNumber = number.toFixed(2);

        if (strNumber.length > 3)
            strNumber = strNumber.split('').reverse().reduce(function(acc, num, i) {
                return num + (i && !(i%3) && i>3 && num != '-' ? ',' : '') + acc;
            });

        /* strip decimals if zero */
        if (strNumber.match(/\.00$/))
            strNumber = strNumber.substring(0, strNumber.length-3);

        return strNumber + ' €';
    },

    /* take the first N elements of the given Array */
    take : function(array, n) {
        var list = [];
        var length = array ? array.length : 0;
        for (var i=0; i<n && i<length; i++)
            list.push(array[i]);
        return list;
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
        assist : 100000,
        specials : [
        {
            name : 'No cards',
            description : 'Finished a match without getting a yellow/red card',
            pred : function(match) {
                return match.played && !match.substituted &&
                    match.yellow < 1 && match.red < 1;
            },
            func : function(match) {
                return 25000;
            }
        }]
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

Player.prototype.getScorePerMatch = function() {
    if (this.played && this.score && this.played > this.substituted) {
        return this.score / (this.played - this.substituted);
    }
    return 0;
}

Player.prototype.getName = function() {
    if (this.position == Position.Q)
        return this.name;
    return this.firstName + ' ' + this.name;
}

Player.prototype.addMatch = function(match) {
    this.matches.push(match);

    this.score += match.score;

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

    this.Santana = InnenVerteidigung('Santana', 'Felipe', 0, [{
        name : 'Tele Commander',
        description : 'Score multiplier of 2 and a goal score of one million',
        easteregg : true,
        func : function(match) { return match.goals * 1000000 + match.score * 2; }
        }]);
    this.Hummels = InnenVerteidigung('Hummels', 'Mats');
    this.Subotic = InnenVerteidigung('Subotic', 'Neven');

    this.Kirch = AussenVerteidigung('Kirch', 'Oliver', 350000, [{
        name : 'Kirch malus',
        description : 'Kirch has a base malus per startup of -100.000',
        easteregg : true,
        pred : function(match) { return match.played && !match.substituted; },
        func : function(match) { return -100000; }
        }]);
    this.Löwe = AussenVerteidigung('Löwe', 'Chris');
    this.Owomoyela = AussenVerteidigung('Owomoyela', 'Patrick', 0, [{
        name : 'Uwe Special',
        description : 'Uwe gets a score multiplier of 4',
        easteregg : true,
        func : function(match) { return match.score * 4; }
        }]);
    this.Piszczek = AussenVerteidigung('Piszczek', 'Lukasz');
    this.Schmelzer = AussenVerteidigung('Schmelzer', 'Marcel');

    this.Gündogan = DefensivesMittelfeld('Gündogan', 'Ilkay');
    this.Kehl = DefensivesMittelfeld('Kehl', 'Sebastian');
    this.Bender = DefensivesMittelfeld('Bender', 'Sven');

    this.Grosskreutz = Aussen('Grosskreutz', 'Kevin');
    this.Blaszczykowski = Aussen('Blaszczykowski', 'Jakub');

    this.Amini = Mittelfeld('Amini', 'Mustafa', 0, [{
        name : 'Pumuckl bonus',
        description : 'Mustafa Amini get a score multiplier of 10',
        easteregg : true,
        func : function(match) { return match.score * 10; }
        }]);
    this.Bittencourt = Mittelfeld('Bittencourt', 'Leonardo');
    this.Götze = Mittelfeld('Götze', 'Mario');
    this.Leitner = Mittelfeld('Leitner', 'Moritz');
    this.Perisic = Mittelfeld('Perisic', 'Ivan', 0, [ {
        name : 'Perisic Special',
        description : 'Startup bonus for Ivan Perisic',
        easteregg : true,
        pred : function(match) { return match.played && !match.substituted; },
        func : function(match) { return 100000; }
        }]);
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

Players.prototype.sort = function(sorter, skipTeam) {
    var list = [];
    for (var name in this) {
        var player = this[name];
        if (typeof player !== 'function') {
            if (!skipTeam || player.position != Position.Q) {
                list.push(player);
            }
        }
    }
    return list.sort(sorter);
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
    this.easteregg = bonus.easteregg;
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

        var match = new Match(date, goals, opponentGoals, homegame, mType);

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
                        if (value != 0) {
                            match.boniSum += value;

                            var bonusInfo = new BonusInfo(match.date, b, value);

                            match.boni.push(bonusInfo);
                            overall.boni.push(bonusInfo);
                        }
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
                        if (value != 0) {
                            match.boniSum += value;

                            var bonusInfo = new BonusInfo(match.date, b, value);

                            match.boni.push(bonusInfo);
                            overall.boni.push(bonusInfo);
                        }
                    }
                });
            }

            /* process the player's position boni */
            if (player.position.specials) {
                player.position.specials.forEach(function(s) {
                    var applies = !s.pred || s.pred.call(player, match);
                    if (applies) {
                        var value = s.func.call(player, match);
                        if (value != 0) {
                            match.boniSum += value;

                            var bonusInfo = new BonusInfo(match.date, s, value);

                            match.boni.push(bonusInfo);
                            overall.boni.push(bonusInfo);
                        }
                    }
                });
            }

            /* process triggered boni */
            Triggers.forEach(function(t) {
                var applies = !t.pred || t.pred.call(player, match);
                if (applies) {
                    var value = t.func.call(player, match);
                    if (value != 0) {
                        match.boniSum += value;

                        var bonusInfo = new BonusInfo(match.date, t, value);

                        match.boni.push(bonusInfo);
                        overall.boni.push(bonusInfo);
                    }
                }
            });

            /* add sum of boni at last in order to calculate all
             * other bonus scores based on the pure score value */
            match.score += match.boniSum;
            overall.boniSum += match.boniSum;
            overall.score += match.boniSum;

            player.addMatch(match);
        });

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
             Kehl : { boni : [ Bonus.TOTD ], yellow : 1 },
             Götze : { goals : 1 },
             Blaszczykowski : { assists : 1 },
             Lewandowski : { assists : 1 },
             Gündogan : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Kirch', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Grosskreutz', 'Reus', 'Lewandowski'], [ 'Leitner', 'Götze', 'Perisic' ],
        true);

    addMatch(Helpers.day(2012, 9, 1), '1. FC Nürnberg', 1, 1, {
             Blaszczykowski : { goals : 1 },
             Perisic : { assists : 1 },
             Piszczek : { yellow : 1 },
             Grosskreutz : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Perisic', 'Reus', 'Lewandowski'], [ 'Götze', 'Schieber', 'Grosskreutz' ]);

    addMatch(Helpers.day(2012, 9, 15), 'Bayer Leverkusen', 3, 0, {
            Hummels : { goals : 1, boni : [ Bonus.TOTD ] },
            Schmelzer : { assists : 1, boni : [ Bonus.TOTD ], yellow : 1 },
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
            Piszczek : { assists : 1 },
            Schmelzer : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Leitner', 'Kehl', 'Perisic', 'Götze', 'Reus', 'Lewandowski'], [ 'Schieber', 'Blaszczykowski' ]);

    addMatch(Helpers.day(2012, 9, 25), 'Eintracht Frankfurt', 3, 3, {
            Götze : { goals : 1, boni : [ Bonus.TOTD ] },
            Piszczek : { goals : 1, assists : 1 },
            Reus : { goals : 1 },
            Hummels : { assists : 1 },
            Lewandowski : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Leitner', 'Kehl', 'Blaszczykowski', 'Perisic', 'Reus', 'Lewandowski'], [ 'Götze', 'Grosskreutz', 'Gündogan' ]);

    addMatch(Helpers.day(2012, 9, 29), 'Borussia Mönchengladbach', 5, 0, {
            Reus : { goals : 2, boni : [ Bonus.TOTD, Bonus.POTD ] },
            Subotic : { goals : 1, boni : [ Bonus.TOTD ] },
            Blaszczykowski : { goals : 1, assists : 2, boni : [ Bonus.TOTD ] },
            Götze : { assists : 1 },
            Gündogan : { goals : 1, assists : 1, boni : [ Bonus.TOTD ] }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Kehl', 'Blaszczykowski', 'Götze', 'Reus', 'Schieber'], [ 'Grosskreutz', 'Bender', 'Santana' ],
        true);

    addMatch(Helpers.day(2012, 10, 3), 'Manchester City', 1, 1, {
            Reus : { goals : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Gündogan', 'Bender', 'Blaszczykowski', 'Götze', 'Reus', 'Lewandowski'], [ 'Grosskreutz', 'Kehl', 'Santana' ],
        false, 'CLGroupPhase');

    addMatch(Helpers.day(2012, 10, 8), 'Hannover 96', 1, 1, {
            Lewandowski : { goals : 1 },
            Piszczek : { assists : 1, boni : [ Bonus.TOTD ] },
            Weidenfeller : { boni : [ Bonus.TOTD ] }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Schmelzer', 'Kehl', 'Bender', 'Blaszczykowski', 'Götze', 'Reus', 'Lewandowski'], [ 'Grosskreutz', 'Leitner', 'Santana' ]);

    addMatch(Helpers.day(2012, 10, 20), 'Schalke 04', 1, 2, {
            Lewandowski : { goals : 1, boni : [ Bonus.Schalke] },
            Reus : { assists : 1, boni : [ Bonus.Schalke] },
            Schieber : { yellow : 1 },
            Leitner : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Bender', 'Kehl', 'Grosskreutz', 'Perisic', 'Leitner', 'Reus', 'Lewandowski'], [ 'Bittencourt', 'Schieber', 'Santana' ], true);

    addMatch(Helpers.day(2012, 10, 24), 'Real Madrid', 2, 1, {
            Lewandowski : { goals : 1 },
            Schmelzer : { goals : 1, boni : [ Bonus.MatchWinningGoal ] },
            Kehl : { assists : 1 },
            Gündogan : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Bender', 'Kehl', 'Grosskreutz', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Gündogan', 'Schieber', 'Perisic' ], true, 'CLGroupPhase');

    addMatch(Helpers.day(2012, 10, 27), 'SC Freibug', 2, 0, {
            Subotic : { goals : 1, yellow : 1 },
            Götze : { goals : 1, boni : [ Bonus.TOTD ] },
            Reus : { assists : 1 },
            Lewandowski : { assists : 1 },
            Kehl : { yellow : 1 },
            Gündogan : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Kehl', 'Grosskreutz', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Leitner', 'Schieber', 'Perisic' ]);

    addMatch(Helpers.day(2012, 10, 30), 'VfR Aalen', 4, 1, {
            Hummels : { goals : 1 },
            Lewandowski : { assists : 2 },
            Schmelzer : { goals : 1 },
            Leitner : { assists : 1 },
            Götze : { goals : 1 },
            Schieber : { goals : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Leitner', 'Perisic', 'Schmelzer', 'Götze', 'Grosskreutz', 'Lewandowski'], [ 'Santana', 'Schieber', 'Kehl' ], false, 'Pokal');

    addMatch(Helpers.day(2012, 11, 3), 'VfB Stuttgart', 0, 0, { },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Kehl', 'Grosskreutz', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Leitner', 'Schieber', 'Perisic' ], true);

    addMatch(Helpers.day(2012, 11, 6), 'Real Madrid', 2, 2, {
        Reus : { goals : 1 },
        Lewandowski : { assists : 1 },
        Grosskreutz : { assists : 1 },
        Hummels : { yellow : 1 },
        Grosskreutz : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Kehl', 'Grosskreutz', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Leitner', 'Bender', 'Perisic' ], false, 'CLGroupPhase');

    addMatch(Helpers.day(2012, 11, 10), 'FC Augsburg', 3, 1, {
        Reus : { goals : 1, assists : 1 },
        Lewandowski : { goals : 2 },
        Götze : { assists : 1 },
        Bender : { yellow : 1 },
        Weidenfeller : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Santana', 'Hummels', 'Gündogan', 'Bender', 'Grosskreutz', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Schieber', 'Leitner', 'Kirch' ]);

    addMatch(Helpers.day(2012, 11, 17), 'Greuther Fürth', 3, 1, {
        Lewandowski : { goals : 2, yellow : 1 },
        Blaszczykowski : { assists : 1 },
        Götze : { assists : 1, goals : 1 },
        Perisic : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Bender', 'Perisic', 'Schmelzer', 'Götze', 'Blaszczykowski', 'Lewandowski'], [ 'Grosskreutz', 'Leitner', 'Reus' ],
        true);

    addMatch(Helpers.day(2012, 11, 21), 'Ajax Amsterdam', 4, 1, {
        Reus : { goals : 1 },
        Lewandowski : { goals : 2 },
        Götze : { assists : 3, goals : 1, yellow : 1 },
        Hummels : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Bender', 'Grosskreutz', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Perisic', 'Blaszczykowski', 'Schieber' ],
        false, 'CLGroupPhase');

    addMatch(Helpers.day(2012, 11, 24), '1. FSV Mainz', 2, 1, {
        Reus : { assists : 1 },
        Lewandowski : { goals : 2 },
        Götze : { assists : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Hummels', 'Gündogan', 'Bender', 'Blaszczykowski', 'Schmelzer', 'Götze', 'Reus', 'Lewandowski'], [ 'Perisic', 'Grosskreutz', 'Leitner' ]);

    addMatch(Helpers.day(2012, 11, 27), 'Fortuna Düsseldorf', 1, 1, {
        Blaszczykowski : { goals : 1 },
        Grosskreutz : { assists : 1 },
        Subotic : { yellow : 1 }
        },
        [ 'Weidenfeller', 'Piszczek', 'Subotic', 'Santana', 'Kehl', 'Bender', 'Blaszczykowski', 'Schmelzer', 'Grosskreutz', 'Reus', 'Lewandowski'], [ 'Perisic', 'Schieber', 'Leitner' ],
        true);
}

BVB.prototype.activatePlayer = function(scores, id, elem) {
    var link = elem || $('#nav'+id);

    return function() {
        /* hide all players and deactive all navigation buttons */
        scores.find('div.player').addClass('hidden');
        scores.find('ul.navigation li').removeClass('activetab');

        /* activate player's navigation button */
        link.addClass('activetab');

        /* unhide player's details */
        scores.find('#'+id).removeClass('hidden');
    }
}

BVB.prototype.insertPlayers = function(scores) {
    var self = this;
    var list = $('<ul class="navigation"></ul>');

    this.players.forEach(function(player, i, name) {
        var id = name.toLowerCase();
        var position = player.position.name.toLowerCase().replace(/[- ]/, '');

        var link = $('<li class="' + position + ' tab'
            + '" id="nav'+id+'"><a href="#'+id+'">' + name
            + '</a></li>');

        link.on('click', self.activatePlayer(scores, id, link));

        list.append(link);
    });

    scores.append(list);
}

BVB.prototype.buildHighscore = function(element) {
    var div = $('<div class="highscores"></div>');

    var getTable = function(name, str) {
        return '<table class="highscore"><thead><tr><td></td><td>Player</td><td>' + name +
            '</td></tr></thead><tbody>' + str + '</tbody></table>';
    }

    /* scores table */
    var content = '';
    Helpers.take(this.players.sort(Helpers.byScore, true), 5).forEach(function(p, i) {
        content += '<tr><td>' + (i+1) + '.</td><td>' + p.getName() + '</td><td>' +
            Helpers.toCurrency(p.score) + '</td></tr>';
    });

    div.append(getTable('Score', content));

    /* scores per match table */
    content = '';
    Helpers.take(this.players.sort(Helpers.byScorePerMatch, true), 5).forEach(function(p, i) {
        content += '<tr><td>' + (i+1) + '.</td><td>' + p.getName() + '</td><td>' +
            Helpers.toCurrency(p.getScorePerMatch()) + ' (' + (p.played-p.substituted) + ')</td></tr>';
    });

    div.append(getTable('Score/match', content));

    /* prepend table div */
    element.prepend(div);

    /* prepend header */
    element.prepend('<h3>Highscores</h3>');
}

BVB.prototype.insertScores = function(scores) {
    var games = this.games;

    /* build a score table row */
    var buildRow = function(match) {
        return $('<tr class="row"><td>' + match.date.toLocaleDateString() + '</td>' +
                 '<td>' + match.game + '</td>' +
                 '<td>' + match.result + '</td>' +
                 '<td class="currency">' + Helpers.toCurrency(match.score) + '</td></tr>');
    }

    /* build a match's detail view */
    var buildDetail = function(player, match) {
        var detail = '<tr class="hidden"><td class="detail" colspan="4">' +
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
                detail += '<div class="detailRow' +
                    (b.easteregg ? ' easteregg' : '') + '">' + b.name + ' = ' +
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
            table.append('<tr><td class="infoname">' + name + ':</td><td class="infovalue">' +
                    value + '</td></tr>');
        };

        addRow('Position', player.position.name);
        addRow('Games played', player.played + (player.substituted
                    ? (' (' + player.substituted + ' substitutions)')
                    : ''));

        var goals = player.getGoalCount();
        var assists = player.getAssistCount();

        if (goals) addRow('Goals', goals);
        if (assists) addRow('Assists', assists);

        var score = player.getScore();
        addRow('Score', Helpers.toCurrency(score));

        if (score && player.played)
            addRow('Score per game', Helpers.toCurrency(score / player.played));

        div.append(table);
        elem.append('<h2>' + player.getName() + '</h2>');
        elem.append(div);
    }

    /* build a summary table row */
    var buildSummary = function(description, sum, title) {
        var tip = title || '';
        return '<tr class="summary" title="' + tip + '"><td colspan="3">' + description + '</td>' +
            '<td class="currency">' + Helpers.toCurrency(sum) + '</td></tr>';
    }

    /* build the player specific chart */
    var buildChart = function(elem, player, i) {
        /* create header and div */
        var div = $('<div id="chart' + i +'" class="chart"></div>');
        elem.append('<h3>Development</h3>');
        elem.append(div);

        var dayWidth = 24*60*60*1000;
        var goalColor = 'rgba(248, 215, 99, 0.7)';
        var assistColor = 'rgba(146, 113, 0, 0.7)';
        var scoreColor = 'rgba(0, 0, 0, 0.7)';

        var chart = $.plot(div, [{
            data : player.getGoals(),
            yaxis : 2,
            color : goalColor,
            bars : {
                show : true,
                lineWidth : 0,
                fillColor : goalColor,
                barWidth : dayWidth*2,
                align : 'right'
            },
            shadowSize : 0,
            label : 'Goals'
        }, {
            data : player.getAssists(),
            yaxis : 2,
            color : assistColor,
            bars : {
                show : true,
                fillColor : assistColor,
                lineWidth : 0,
                barWidth : dayWidth*2,
                align : 'left'
            },
            shadowSize : 0,
            label : 'Assists'
        }, {
            data : player.getScores(),
            yaxis : 1,
            color : scoreColor,
            points : { show : true },
            lines : { show : true },
            label : 'Score (in €)',
            shadowSize : 0
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

    this.players.forEach(function(player, i, name) {
        /* player's score div */
        var div = $('<div id="' + name.toLowerCase() + '" class="player"></div>');

        /* add player's information */
        if (player.position != Position.Q)
            buildInfo(div, player, i);

        /* table header */
        div.append('<h3>Scores</h3>');
        var table = $('<table><thead><tr><td>Date</td><td>Match</td>' +
            '<td>Result</td><td>Points</td></tr></thead></table>');

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
    bvb.activatePlayer(scores, 'team')();

    bvb.buildHighscore($('#team'));

    /* remove all script tags from html */
    $('script').remove();

});
