DROP TABLE IF EXISTS `assists`;
CREATE TABLE `assists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `match` int(11) NOT NULL,
  `player` int(11) NOT NULL,
  `assists` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_as_match_idx` (`match`),
  KEY `fk_as_player_idx` (`player`),
  CONSTRAINT `fk_as_match` FOREIGN KEY (`match`) REFERENCES `matches` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `fk_as_player` FOREIGN KEY (`player`) REFERENCES `players` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `goals`;
CREATE TABLE `goals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player` int(11) NOT NULL,
  `match` int(11) NOT NULL,
  `goals` tinyint(2) NOT NULL DEFAULT '1',
  `owngoal` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_match_idx` (`match`),
  KEY `fk_player_idx` (`player`),
  CONSTRAINT `fk_match` FOREIGN KEY (`match`) REFERENCES `matches` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `fk_player` FOREIGN KEY (`player`) REFERENCES `players` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `matches`;
CREATE TABLE `matches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `opponent` int(11) NOT NULL,
  `tournament` int(11) NOT NULL,
  `homegame` tinyint(1) NOT NULL DEFAULT '0',
  `date` date NOT NULL,
  `opponent_goals` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_opponent_idx` (`opponent`),
  KEY `fk_tournament_idx` (`tournament`),
  CONSTRAINT `fk_opponent` FOREIGN KEY (`opponent`) REFERENCES `teams` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `fk_tournament` FOREIGN KEY (`tournament`) REFERENCES `tournaments` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `matchup`;
CREATE TABLE `matchup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player` int(11) NOT NULL,
  `match` int(11) NOT NULL,
  `substitution` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_player_idx` (`player`),
  KEY `fk_match_idx` (`match`),
  CONSTRAINT `fk_mu_match` FOREIGN KEY (`match`) REFERENCES `matches` (`id`) ON UPDATE NO ACTION,
  CONSTRAINT `fk_mu_player` FOREIGN KEY (`player`) REFERENCES `players` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `players`;
CREATE TABLE `players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `firstname` varchar(128) NOT NULL,
  `lastname` varchar(256) NOT NULL,
  `position` int(11) NOT NULL,
  `since` date NOT NULL DEFAULT '2012-08-01',
  PRIMARY KEY (`id`),
  KEY `fk_position_idx` (`position`),
  CONSTRAINT `fk_position` FOREIGN KEY (`position`) REFERENCES `positions` (`id`) ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `positions`;
CREATE TABLE `positions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `goal` double NOT NULL,
  `assist` double NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `teams`;
CREATE TABLE `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(256) NOT NULL,
  `factor` double NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8;
DROP TABLE IF EXISTS `tournaments`;
CREATE TABLE `tournaments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(256) NOT NULL,
  `factor` double NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8;
