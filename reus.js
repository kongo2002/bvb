/**
 * Enumeration containing all different match types
 * and their scores
 */
var MatchType = {
    Bundesliga : {
        name : 'Bundesliga',
        goal : 100000,
        assist : 50000
    },
    Pokal : {
        name : 'Pokal',
        goal : 150000,
        assist : 50000
    },
    CLGroupPhase : {
        name : 'Champions League - Group phase',
        goal : 250000,
        assist : 100000
    },
    CL16 : {
        name : 'Champions League - Round of 16',
        goal : 350000,
        assist : 200000
    },
    CL8 : {
        name : 'Champions League - Quarter finals',
        goal : 500000,
        assist : 250000
    },
    CL4 : {
        name : 'Champions League - Semi finals',
        goal : 750000,
        assist : 400000
    },
    CLFinal : {
        name : 'Champions League - Final',
        goal : 800000,
        assist : 500000
    }
}

/**
 * Various bonus score rules
 */
var Bonus = {
    Schalke : {
        name : 'Schalke 04',
        bonus : function(value) { return value; }
    },
    Bayern : {
        name : 'Bayern München',
        bonus : function(value) { return value; }
    },
    POTD : {
        name : 'Kicker Player of the day',
        bonus : function(value) { return 200000; }
    },
    TOTD : {
        name : 'Kicker Team of the day',
        bonus : function(value) { return 25000; }
    }
}

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
    T : 'Torwart',
    A : 'Abwehr',
    M : 'Mittelfeld',
    S : 'Sturm',
    Q : 'Team'
}

/**
 * @constructor
 *
 * Class describing a player
 */
function Player(name, firstName, position, transfer) {
    this.name = name;
    this.firstName = firstName;
    this.position = position;
    this.matches = [];
    this.goals = [];
    this.assists = [];
    this.boni = [];
    this.transfer = transfer || 0;
    this.score = 0;
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

Player.prototype.addMatch = function(match) {
    this.matches.push(match);

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
    return function(name, firstName, transfer) {
        return new Player(name, firstName, position, transfer);
    }
}

var Torwart = getPlayer(Position.T);
var Abwehr = getPlayer(Position.A);
var Mittelfeld = getPlayer(Position.M);
var Sturm = getPlayer(Position.S);

var Players = {
    Team : new Player('Borussia Dortmund', 'Team', Position.Q),

    Alomerovic : Torwart('Alomerovic', 'Zlatan'),
    Langerak : Torwart('Langerak', 'Mitchell'),
    Weidenfeller : Torwart('Weidenfeller', 'Roman'),

    Santana : Abwehr('Santana', 'Felipe'),
    Hummels : Abwehr('Hummels', 'Mats'),
    Kirch : Abwehr('Kirch', 'Oliver'),
    Löwe : Abwehr('Löwe', 'Chris'),
    Owomoyela : Abwehr('Owomoyela', 'Patrick'),
    Piszczek : Abwehr('Piszczek', 'Lukasz'),
    Schmelzer : Abwehr('Schmelzer', 'Marcel'),
    Subotic : Abwehr('Subotic', 'Neven'),

    Amini : Mittelfeld('Amini', 'Mustafa'),
    Bender : Mittelfeld('Bender', 'Sven'),
    Bittencourt : Mittelfeld('Bittencourt', 'Leonardo'),
    Blaszczykowski : Mittelfeld('Blaszczykowski', 'Jakub'),
    Götze : Mittelfeld('Götze', 'Mario'),
    Grosskreutz : Mittelfeld('Grosskreutz', 'Kevin'),
    Gündogan : Mittelfeld('Gündogan', 'Ilkay'),
    Kehl : Mittelfeld('Kehl', 'Sebastian'),
    Leitner : Mittelfeld('Leitner', 'Moritz'),
    Perisic : Mittelfeld('Perisic', 'Ivan'),
    Reus : Mittelfeld('Reus', 'Marco', 17100000),

    Ducksch : Sturm('Ducksch', 'Marvin'),
    Lewandowski : Sturm('Lewandowski', 'Robert'),
    Schieber : Sturm('Schieber', 'Julian'),

    forEach : function(func) {
        var i = 0;
        for (var name in this) {
            var player = this[name];
            if (typeof player !== 'function') {
                func.call(player, player, i, name);
                i += 1;
            }
        }
    }
}

/**
 * @constructor
 *
 * Class encapsulating all major functionality
 */
function BVB() {

    /* list of games */
    var games = this.games = [];

    /* build a game object based on the given result and match type */
    var addMatch = function(date, opponent, result, scores, homegame, matchType) {

        var dortmund = '<em>Borussia Dortmund</em>';
        var game = homegame
            ? (dortmund + ' : ' + opponent)
            : (opponent + ' : ' + dortmund);

        var buildMatch = function() {
            return {
                date : date,
                game : game,
                result : result,
                type : mType,
                score : 0,
                goals : 0,
                assists : 0,
                boni : [],
                boniSum : 0
            }
        }

        var matchType = matchType || 'Bundesliga';
        var mType = MatchType[matchType];

        var overall = buildMatch();

        Players.forEach(function(player, i, name) {
            /* create an empty match object */
            var match = buildMatch();

            if (scores[name]) {
                var p = scores[name];

                /* process player's goals */
                match.goals = p.goals || 0;
                var goalValue = mType.goal * match.goals;

                match.score += goalValue;

                overall.goals += match.goals;
                overall.score += goalValue;

                /* process player's assists */
                match.assists = p.assists || 0;
                var assistValue = mType.assist * match.assists;

                match.score += assistValue;

                overall.assists += match.assists;
                overall.score += assistValue;

                /* process boni */
                if (p.boni) {
                    var bonusScore = 0;

                    p.boni.forEach(function(b) {
                        bonusScore += b.bonus(match.score);
                        match.boni.push(b);
                        overall.boni.push(b);
                    });

                    match.boniSum = bonusScore;
                    overall.score += bonusScore;
                    overall.boniSum += bonusScore;
                }
            }

            if (player.position != Position.Q)
                player.addMatch(match);
        });

        Players.Team.addMatch(overall);
        games.push(overall);
    }

    /* add all available matches */
    addMatch(Helpers.day(2012, 8, 18), 'FC Oberneuland', '0:3', {
            Blaszczykowski : { goals : 1, assists : 1 },
            Reus : { goals : 1 },
            Perisic : { goals : 1 },
            Lewandowski : { assists : 1 },
            Piszczek : { assists : 1 }
        },
        false, 'Pokal');

    addMatch(Helpers.day(2012, 8, 24), 'Werder Bremen', '2:1', {
             Reus : { goals : 1, boni : [ Bonus.TOTD ] },
             Kehl : { boni : [ Bonus.TOTD ] },
             Götze : { goals : 1 },
             Blaszczykowski : { assists : 1 },
             Lewandowski : { assists : 1 }
        },
        true, 'Bundesliga');

    addMatch(Helpers.day(2012, 9, 1), '1. FC Nürnberg', '1:1', {
             Blaszczykowski : { goals : 1 },
             Perisic : { assists : 1 }
        });
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

    Players.forEach(function(player, i, name) {
        var id = '#tab' + i;
        var position = player.position.toString().toLowerCase();

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
                 '<td>' + match.result + '</td>' +
                 '<td class="currency">' + Helpers.toCurrency(match.score) + '</td></tr>');
    }

    /* build a match's detail view */
    var buildDetail = function(match) {
        var score = 0;
        var detail = '<tr class="hidden"><td class="detail" colspan="4">' +
            '<div class="detailRow"><span>' + match.type.name + ':</span></div>';

        /* add goals score */
        if (match.goals) {
            var value = match.goals * match.type.goal;
            score += value;

            detail += '<div class="detailRow">Goals: ' + match.goals + ' * ' +
                Helpers.toCurrency(match.type.goal) + ' = ' +
                Helpers.toCurrency(value) + '</div>';
        }

        /* add assists score */
        if (match.assists) {
            var value = match.assists * match.type.assist;
            score += value;

            detail += '<div class="detailRow">Assists: ' + match.assists + ' * ' +
                Helpers.toCurrency(match.type.assist) + ' = ' +
                Helpers.toCurrency(value) + '</div>';
        }

        /* add bonus scores */
        if (match.bonus) {
            match.bonus.forEach(function(b) {
                detail += '<div class="detailRow">' + b.name + ' = ' +
                    Helpers.toCurrency(b.bonus(score)) + '</div>';
            });
        }

        /* player didn't score at all */
        if (!match.goals && !match.assists && !match.bonus) {
            detail += '<div class="detailRow">No scores at all</div>';
        }

        detail += '</td></tr>';
        return $(detail);
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
        elem.append('<h2>Development</h2>');
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

    Players.forEach(function(player, i) {
        /* player's score div */
        var div = $('<div id="tab' + i + '" class="player"></div>');

    /* table header */
        div.append('<h2>Scores</h2>');
        var table = $('<table><tr><th>Date</th><th>Match</th><th>Result</th><th>Points</th></tr></table>');

        var sum = 0;
        player.matches.sort(Helpers.byDate).forEach(function(game) {
            var row = buildRow(game);
            var detail = buildDetail(game);

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
