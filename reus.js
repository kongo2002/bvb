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
 * Class encapsulating all major functionality
 */
function Reus() {

    /* transfer sum */
    this.transferSum = 17500000;

    /* list of games */
    var games = this.games = [];

    /* build a game object based on the given result and match type */
    var addGame = function(date, opponent, result, goals, assists, homegame, matchType) {

        var dortmund = '<em>Borussia Dortmund</em>';
        var game = homegame
            ? (dortmund + ' : ' + opponent)
            : (opponent + ' : ' + dortmund);

        var matchType = matchType || 'Bundesliga';
        var mType = MatchType[matchType];
        var score = mType.goal * goals + mType.assist * assists;

        games.push({
            'date' : date,
            'game' : game,
            'result' : result,
            'score' : score
        });
    }

    /* return a Date object based on the given date elements */
    var day = function(year, month, day) {
        var date = new Date(year, month, day, 0, 0, 0, 0);
        return date;
    }

    /* add all available games */
    addGame(day(2012, 8, 18), 'FC Oberneuland', '0:3', 1, 0, false, 'Pokal');
    addGame(day(2012, 8, 24), 'Werder Bremen', '2:1', 1, 0, true);
}

Reus.prototype.insertScores = function(table) {
    /* sorting function */
    var byDate = function(one, two) {
        if (one.date < two.date)
            return -1;
        return 1;
    }

    var toCurrency = function(number) {
        var strNumber = number.toString();

        if (strNumber.length > 3)
            strNumber = strNumber.split('').reverse().reduce(function(acc, num, i) {
                return num + (i && !(i%3) ? ',' : '') + acc;
            });

        return strNumber + ' €';
    }

    var buildRow = function(game) {
        return $('<tr><td>' + game.date.toLocaleDateString() + '</td>' +
                 '<td>' + game.game + '</td>' +
                 '<td>' + game.result + '</td>' +
                 '<td class="currency">' + toCurrency(game.score) + '</td></tr>');
    }

    var sum = 0;
    this.games.sort(byDate).forEach(function(game) {
        var row = buildRow(game);

        /* add mouse hover */
        var toggle = function() { row.toggleClass('activerow'); }
        row.on('mouseenter', toggle);
        row.on('mouseleave', toggle);

        sum = sum + game.score;

        table.append(row);
    });

    /* add acquired score row */
    table.append('<tr class="summary"><td colspan="3">Acquired score:</td>' +
            '<td class="currency">' + toCurrency(sum) + '</td></tr>');

    /* add remaining score/money row */
    table.append('<tr class="summary"><td colspan="3">Remaining:</td>' +
            '<td class="currency">' + toCurrency(this.transferSum - sum) + '</td></tr>');
};

/**
 * Document's OnLoad callback
 */
$(function() {
    /* initialize new Reus instance */
    var reus = new Reus();

    /* insert all scores into table */
    reus.insertScores($('#scores table'));

    /* remove all script tags from html */
    $('script').remove();
});
