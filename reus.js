/**
 * Enumeration containing all different match types
 * and their scores
 */
var MatchType = {
    Bundesliga : {
        name : 'Bundesliga',
        goal : 100000,
        assist : 50000,
    },
    Pokal : {
        name : 'Pokal',
        goal : 150000,
        assist : 50000,
    },
    CLGroupPhase : {
        name : 'Champions League - Group phase',
        goal : 250000,
        assist : 100000,
    },
    CL16 : {
        name : 'Champions League - Round of 16',
        goal : 350000,
        assist : 200000,
    },
    CL8 : {
        name : 'Champions League - Quarter finals',
        goal : 500000,
        assist : 250000,
    },
    CL4 : {
        name : 'Champions League - Semi finals',
        goal : 750000,
        assist : 400000,
    },
    CLFinal : {
        name : 'Champions League - Final',
        goal : 800000,
        assist : 500000,
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

/**
 * Class encapsulating all major functionality
 */
function Reus() {

    /* transfer sum */
    this.transferSum = 17100000;

    /* list of games */
    var games = this.games = [];

    /* build a game object based on the given result and match type */
    var addMatch = function(date, opponent, result, goals, assists, homegame, matchType, bonus) {

        var dortmund = '<em>Borussia Dortmund</em>';
        var game = homegame
            ? (dortmund + ' : ' + opponent)
            : (opponent + ' : ' + dortmund);

        var matchType = matchType || 'Bundesliga';
        var mType = MatchType[matchType];
        var score = mType.goal * goals + mType.assist * assists;

        if (bonus)
            bonus.forEach(function(b) { score += b.bonus(score); });

        games.push({
            'date' : date,
            'game' : game,
            'result' : result,
            'score' : score,
            'type' : mType,
            'goals' : goals,
            'assists' : assists,
            'bonus' : bonus
        });
    }

    /* add all available matches */
    addMatch(Helpers.day(2012, 8, 18), 'FC Oberneuland', '0:3', 1, 0, false, 'Pokal');
    addMatch(Helpers.day(2012, 8, 24), 'Werder Bremen', '2:1', 1, 0, true, 'Bundesliga', [ Bonus.TOTD ]);
    addMatch(Helpers.day(2012, 9, 1), '1. FC Nürnberg', '1:1', 0, 0);
}

Reus.prototype._get = function(selector) {
    var data = [];

    this.games.sort(Helpers.byDate).forEach(function(match) {
        data.push([match.date, selector(match)]);
    });

    return data;
};

Reus.prototype.getScores = function() {
    return this._get(function(elem) { return elem.score; });
};

Reus.prototype.getGoals = function() {
    return this._get(function(elem) { return elem.goals; });
};

Reus.prototype.getAssists = function() {
    return this._get(function(elem) { return elem.assists; });
};

Reus.prototype.insertScores = function(table) {
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

    var sum = 0;
    this.games.sort(Helpers.byDate).forEach(function(game) {
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

    /* add remaining score/money row */
    table.append(buildSummary('Remaining:', this.transferSum - sum,
                'Remaining score til reaching the transfer amount of ' +
                Helpers.toCurrency(this.transferSum)));
};

/**
 * Document's OnLoad callback
 */
$(function() {
    /* initialize new Reus instance */
    var reus = new Reus();

    /* insert all scores into table */
    reus.insertScores($('#scores table'));

    /* draw chart */
    var chart = $.plot($('#chart'), [{
        data : reus.getScores(),
        yaxis : 1,
        color : '#f2bc00',
        points : { show : true },
        lines : { show : true },
        label : 'Score (in €)',
        shadowSize : 0
    }, {
        data : reus.getGoals(),
        yaxis : 2,
        color : '#f8d763',
        points : { show : true },
        lines : { show : true },
        shadowSize : 0,
        label : 'Goals'
    }, {
        data : reus.getAssists(),
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
    $('tr.row').each(function(i) {
        var elem = $(this);
        elem.on('mouseenter', function() {
            chart.highlight(0, i);
            chart.highlight(1, i);
            chart.highlight(2, i);
        });
        elem.on('mouseleave', function() { chart.unhighlight(); });
    });

    /* remove all script tags from html */
    $('script').remove();

});
