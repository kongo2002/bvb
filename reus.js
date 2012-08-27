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
    var addGame = function(date, opponent, result, goals, assists, homegame, matchType, bonus) {

        var dortmund = '<em>Borussia Dortmund</em>';
        var game = homegame
            ? (dortmund + ' : ' + opponent)
            : (opponent + ' : ' + dortmund);

        var matchType = matchType || 'Bundesliga';
        var mType = MatchType[matchType];
        var score = mType.goal * goals + mType.assist * assists;

        if (bonus) {
            /* TODO: make this consts */
            if (bonus.multiplier)
                score *= 2;
            if (bonus.potd)
                score += 200000;
        }

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

    /* add all available games */
    addGame(Helpers.day(2012, 8, 18), 'FC Oberneuland', '0:3', 1, 0, false, 'Pokal');
    addGame(Helpers.day(2012, 8, 24), 'Werder Bremen', '2:1', 1, 0, true);
}

Reus.prototype.getDevelopment = function() {
    var data = [];

    this.games.sort(Helpers.byDate).forEach(function(match) {
        data.push([match.date, match.score]);
    });

    return data;
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
        var detail = '<tr class="hidden"><td class="detail" colspan="4">' +
            '<div class="detailRow"><span>' + match.type.name + ':</span></div>';

        if (match.goals)
            detail += '<div class="detailRow">Goals: ' + match.goals + ' * ' +
                Helpers.toCurrency(match.type.goal) + ' = ' +
                Helpers.toCurrency(match.goals * match.type.goal) + '</div>';

        if (match.assists)
            detail += '<div class="detailRow">Assists: ' + match.assists + ' * ' +
                Helpers.toCurrency(match.type.assist) + ' = ' +
                Helpers.toCurrency(match.assists * match.type.assist) + '</div>';

        if (match.bonus) {
            if (match.bonus.multiplier)
                detail += '<div class="detailRow">' + match.bonus.multiplier + ' (* 2) = ' +
                    Helpers.toCurrency(match.type.goal * match.goals + match.type.assist * match.assists) +
                    '</div>';
            if (match.bonus.potd)
                detail += '<div class="detailRow">Kicker Player of the Day = ' +
                    Helpers.toCurrency(200000) + '</div>';
        }

        detail += '</td></tr>';
        return $(detail);
    }

    /* build a summary table row */
    var buildSummary = function(description, sum) {
        return '<tr class="summary"><td colspan="3">' + description + '</td>' +
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
    table.append(buildSummary('Remaining:', this.transferSum - sum));
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
        data : reus.getDevelopment(),
        points : { show : true },
        lines : { show : true },
        label : 'Score',
        shadowSize : 0,
    }],
    {
        xaxis : { mode : 'time' },
        yaxis : {
            tickFormatter : function(value, axis) {
                return Helpers.toCurrency(value);
            },
            min : 0
        },
    });

    /* remove all script tags from html */
    $('script').remove();

});
