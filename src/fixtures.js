const FIXTURES = [
  {
    "id": 560542,
    "gameweek": 1,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-08-21T19:00:00Z"
  },
  {
    "id": 560543,
    "gameweek": 1,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-08-22T11:30:00Z"
  },
  {
    "id": 560544,
    "gameweek": 1,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-08-22T14:00:00Z"
  },
  {
    "id": 560545,
    "gameweek": 1,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-08-22T14:00:00Z"
  },
  {
    "id": 560546,
    "gameweek": 1,
    "homeTeam": "Everton FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-08-22T14:00:00Z"
  },
  {
    "id": 560547,
    "gameweek": 1,
    "homeTeam": "Brentford FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-08-22T16:30:00Z"
  },
  {
    "id": 560548,
    "gameweek": 1,
    "homeTeam": "Manchester City FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-08-23T13:00:00Z"
  },
  {
    "id": 560549,
    "gameweek": 1,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-08-23T13:00:00Z"
  },
  {
    "id": 560550,
    "gameweek": 1,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-08-23T15:30:00Z"
  },
  {
    "id": 560551,
    "gameweek": 1,
    "homeTeam": "Fulham FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-08-24T19:00:00Z"
  },
  {
    "id": 560552,
    "gameweek": 2,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560553,
    "gameweek": 2,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560554,
    "gameweek": 2,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560555,
    "gameweek": 2,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560556,
    "gameweek": 2,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560557,
    "gameweek": 2,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560558,
    "gameweek": 2,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560559,
    "gameweek": 2,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560560,
    "gameweek": 2,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Everton FC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560561,
    "gameweek": 2,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-08-29T14:00:00Z"
  },
  {
    "id": 560562,
    "gameweek": 3,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560563,
    "gameweek": 3,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560564,
    "gameweek": 3,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560565,
    "gameweek": 3,
    "homeTeam": "Brentford FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560566,
    "gameweek": 3,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560567,
    "gameweek": 3,
    "homeTeam": "Everton FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560568,
    "gameweek": 3,
    "homeTeam": "Fulham FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560569,
    "gameweek": 3,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560570,
    "gameweek": 3,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560571,
    "gameweek": 3,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-09-05T14:00:00Z"
  },
  {
    "id": 560572,
    "gameweek": 4,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560573,
    "gameweek": 4,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560574,
    "gameweek": 4,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560575,
    "gameweek": 4,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560576,
    "gameweek": 4,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560577,
    "gameweek": 4,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560578,
    "gameweek": 4,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560579,
    "gameweek": 4,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560580,
    "gameweek": 4,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560581,
    "gameweek": 4,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-09-12T14:00:00Z"
  },
  {
    "id": 560582,
    "gameweek": 5,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560583,
    "gameweek": 5,
    "homeTeam": "Fulham FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560584,
    "gameweek": 5,
    "homeTeam": "Everton FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560585,
    "gameweek": 5,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560586,
    "gameweek": 5,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560587,
    "gameweek": 5,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560588,
    "gameweek": 5,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560589,
    "gameweek": 5,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560590,
    "gameweek": 5,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560591,
    "gameweek": 5,
    "homeTeam": "Brentford FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-09-19T14:00:00Z"
  },
  {
    "id": 560592,
    "gameweek": 6,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560593,
    "gameweek": 6,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560594,
    "gameweek": 6,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560595,
    "gameweek": 6,
    "homeTeam": "Chelsea FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560596,
    "gameweek": 6,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560597,
    "gameweek": 6,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560598,
    "gameweek": 6,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560599,
    "gameweek": 6,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560600,
    "gameweek": 6,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560601,
    "gameweek": 6,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-10-10T14:00:00Z"
  },
  {
    "id": 560602,
    "gameweek": 7,
    "homeTeam": "Fulham FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560603,
    "gameweek": 7,
    "homeTeam": "Everton FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560604,
    "gameweek": 7,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560605,
    "gameweek": 7,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560606,
    "gameweek": 7,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560607,
    "gameweek": 7,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560608,
    "gameweek": 7,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560609,
    "gameweek": 7,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560610,
    "gameweek": 7,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560611,
    "gameweek": 7,
    "homeTeam": "Brentford FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-10-17T14:00:00Z"
  },
  {
    "id": 560612,
    "gameweek": 8,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560613,
    "gameweek": 8,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560614,
    "gameweek": 8,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560615,
    "gameweek": 8,
    "homeTeam": "Manchester United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560616,
    "gameweek": 8,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560617,
    "gameweek": 8,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560618,
    "gameweek": 8,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560619,
    "gameweek": 8,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560620,
    "gameweek": 8,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560621,
    "gameweek": 8,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-10-24T14:00:00Z"
  },
  {
    "id": 560622,
    "gameweek": 9,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560623,
    "gameweek": 9,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560624,
    "gameweek": 9,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560625,
    "gameweek": 9,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560626,
    "gameweek": 9,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560627,
    "gameweek": 9,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560628,
    "gameweek": 9,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560629,
    "gameweek": 9,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560630,
    "gameweek": 9,
    "homeTeam": "Brentford FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560631,
    "gameweek": 9,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-10-31T15:00:00Z"
  },
  {
    "id": 560632,
    "gameweek": 10,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560633,
    "gameweek": 10,
    "homeTeam": "Fulham FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560634,
    "gameweek": 10,
    "homeTeam": "Everton FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560635,
    "gameweek": 10,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560636,
    "gameweek": 10,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560637,
    "gameweek": 10,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560638,
    "gameweek": 10,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560639,
    "gameweek": 10,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560640,
    "gameweek": 10,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560641,
    "gameweek": 10,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-11-07T15:00:00Z"
  },
  {
    "id": 560642,
    "gameweek": 11,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560643,
    "gameweek": 11,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560644,
    "gameweek": 11,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560645,
    "gameweek": 11,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560646,
    "gameweek": 11,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560647,
    "gameweek": 11,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560648,
    "gameweek": 11,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560649,
    "gameweek": 11,
    "homeTeam": "Brentford FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560650,
    "gameweek": 11,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560651,
    "gameweek": 11,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-11-21T15:00:00Z"
  },
  {
    "id": 560652,
    "gameweek": 12,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560653,
    "gameweek": 12,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560654,
    "gameweek": 12,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560655,
    "gameweek": 12,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560656,
    "gameweek": 12,
    "homeTeam": "Everton FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560657,
    "gameweek": 12,
    "homeTeam": "Fulham FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560658,
    "gameweek": 12,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560659,
    "gameweek": 12,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560660,
    "gameweek": 12,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560661,
    "gameweek": 12,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-11-28T15:00:00Z"
  },
  {
    "id": 560662,
    "gameweek": 13,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560663,
    "gameweek": 13,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560664,
    "gameweek": 13,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560665,
    "gameweek": 13,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560666,
    "gameweek": 13,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560667,
    "gameweek": 13,
    "homeTeam": "Brentford FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560668,
    "gameweek": 13,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560669,
    "gameweek": 13,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560670,
    "gameweek": 13,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560671,
    "gameweek": 13,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-12-02T20:00:00Z"
  },
  {
    "id": 560672,
    "gameweek": 14,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560673,
    "gameweek": 14,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560674,
    "gameweek": 14,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560675,
    "gameweek": 14,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560676,
    "gameweek": 14,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560677,
    "gameweek": 14,
    "homeTeam": "Brentford FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560678,
    "gameweek": 14,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560679,
    "gameweek": 14,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560680,
    "gameweek": 14,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560681,
    "gameweek": 14,
    "homeTeam": "Everton FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-12-05T15:00:00Z"
  },
  {
    "id": 560682,
    "gameweek": 15,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560683,
    "gameweek": 15,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560684,
    "gameweek": 15,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560685,
    "gameweek": 15,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560686,
    "gameweek": 15,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560687,
    "gameweek": 15,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560688,
    "gameweek": 15,
    "homeTeam": "Arsenal FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560689,
    "gameweek": 15,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560690,
    "gameweek": 15,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560691,
    "gameweek": 15,
    "homeTeam": "Fulham FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-12-12T15:00:00Z"
  },
  {
    "id": 560692,
    "gameweek": 16,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560693,
    "gameweek": 16,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560694,
    "gameweek": 16,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560695,
    "gameweek": 16,
    "homeTeam": "Brentford FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560696,
    "gameweek": 16,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560697,
    "gameweek": 16,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560698,
    "gameweek": 16,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Coventry City FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560699,
    "gameweek": 16,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560700,
    "gameweek": 16,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560701,
    "gameweek": 16,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-12-19T15:00:00Z"
  },
  {
    "id": 560702,
    "gameweek": 17,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560703,
    "gameweek": 17,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560704,
    "gameweek": 17,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560705,
    "gameweek": 17,
    "homeTeam": "Everton FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560706,
    "gameweek": 17,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560707,
    "gameweek": 17,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560708,
    "gameweek": 17,
    "homeTeam": "Fulham FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560709,
    "gameweek": 17,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560710,
    "gameweek": 17,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560711,
    "gameweek": 17,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-12-26T15:00:00Z"
  },
  {
    "id": 560712,
    "gameweek": 18,
    "homeTeam": "Fulham FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560713,
    "gameweek": 18,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560714,
    "gameweek": 18,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560715,
    "gameweek": 18,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560716,
    "gameweek": 18,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560717,
    "gameweek": 18,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560718,
    "gameweek": 18,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560719,
    "gameweek": 18,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560720,
    "gameweek": 18,
    "homeTeam": "Everton FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560721,
    "gameweek": 18,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-12-30T20:00:00Z"
  },
  {
    "id": 560722,
    "gameweek": 19,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560723,
    "gameweek": 19,
    "homeTeam": "Brentford FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560724,
    "gameweek": 19,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560725,
    "gameweek": 19,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560726,
    "gameweek": 19,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560727,
    "gameweek": 19,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560728,
    "gameweek": 19,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560729,
    "gameweek": 19,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560730,
    "gameweek": 19,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560731,
    "gameweek": 19,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-01-02T12:00:00Z"
  },
  {
    "id": 560732,
    "gameweek": 20,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560733,
    "gameweek": 20,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560734,
    "gameweek": 20,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560735,
    "gameweek": 20,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560736,
    "gameweek": 20,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560737,
    "gameweek": 20,
    "homeTeam": "Fulham FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560738,
    "gameweek": 20,
    "homeTeam": "Everton FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560739,
    "gameweek": 20,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560740,
    "gameweek": 20,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560741,
    "gameweek": 20,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-01-06T12:00:00Z"
  },
  {
    "id": 560742,
    "gameweek": 21,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560743,
    "gameweek": 21,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560744,
    "gameweek": 21,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560745,
    "gameweek": 21,
    "homeTeam": "Brentford FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560746,
    "gameweek": 21,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560747,
    "gameweek": 21,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560748,
    "gameweek": 21,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560749,
    "gameweek": 21,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560750,
    "gameweek": 21,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560751,
    "gameweek": 21,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-01-16T12:00:00Z"
  },
  {
    "id": 560752,
    "gameweek": 22,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560753,
    "gameweek": 22,
    "homeTeam": "Everton FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560754,
    "gameweek": 22,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560755,
    "gameweek": 22,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560756,
    "gameweek": 22,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560757,
    "gameweek": 22,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560758,
    "gameweek": 22,
    "homeTeam": "Fulham FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560759,
    "gameweek": 22,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560760,
    "gameweek": 22,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560761,
    "gameweek": 22,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-01-23T12:00:00Z"
  },
  {
    "id": 560762,
    "gameweek": 23,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560763,
    "gameweek": 23,
    "homeTeam": "Brentford FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560764,
    "gameweek": 23,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560765,
    "gameweek": 23,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560766,
    "gameweek": 23,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560767,
    "gameweek": 23,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560768,
    "gameweek": 23,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560769,
    "gameweek": 23,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560770,
    "gameweek": 23,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560771,
    "gameweek": 23,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-01-30T12:00:00Z"
  },
  {
    "id": 560772,
    "gameweek": 24,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560773,
    "gameweek": 24,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560774,
    "gameweek": 24,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560775,
    "gameweek": 24,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560776,
    "gameweek": 24,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560777,
    "gameweek": 24,
    "homeTeam": "Everton FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560778,
    "gameweek": 24,
    "homeTeam": "Fulham FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560779,
    "gameweek": 24,
    "homeTeam": "Leeds United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560780,
    "gameweek": 24,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560781,
    "gameweek": 24,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-02-06T12:00:00Z"
  },
  {
    "id": 560782,
    "gameweek": 25,
    "homeTeam": "Everton FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560783,
    "gameweek": 25,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560784,
    "gameweek": 25,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560785,
    "gameweek": 25,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560786,
    "gameweek": 25,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560787,
    "gameweek": 25,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560788,
    "gameweek": 25,
    "homeTeam": "Fulham FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560789,
    "gameweek": 25,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560790,
    "gameweek": 25,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560791,
    "gameweek": 25,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-02-10T12:00:00Z"
  },
  {
    "id": 560792,
    "gameweek": 26,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560793,
    "gameweek": 26,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560794,
    "gameweek": 26,
    "homeTeam": "Brentford FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560795,
    "gameweek": 26,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560796,
    "gameweek": 26,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560797,
    "gameweek": 26,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560798,
    "gameweek": 26,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560799,
    "gameweek": 26,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560800,
    "gameweek": 26,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560801,
    "gameweek": 26,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-02-20T12:00:00Z"
  },
  {
    "id": 560802,
    "gameweek": 27,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560803,
    "gameweek": 27,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560804,
    "gameweek": 27,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560805,
    "gameweek": 27,
    "homeTeam": "Coventry City FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560806,
    "gameweek": 27,
    "homeTeam": "Everton FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560807,
    "gameweek": 27,
    "homeTeam": "Fulham FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560808,
    "gameweek": 27,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560809,
    "gameweek": 27,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560810,
    "gameweek": 27,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560811,
    "gameweek": 27,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-02-27T12:00:00Z"
  },
  {
    "id": 560812,
    "gameweek": 28,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560813,
    "gameweek": 28,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560814,
    "gameweek": 28,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560815,
    "gameweek": 28,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560816,
    "gameweek": 28,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560817,
    "gameweek": 28,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560818,
    "gameweek": 28,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560819,
    "gameweek": 28,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560820,
    "gameweek": 28,
    "homeTeam": "Brentford FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560821,
    "gameweek": 28,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-03-03T12:00:00Z"
  },
  {
    "id": 560822,
    "gameweek": 29,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560823,
    "gameweek": 29,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560824,
    "gameweek": 29,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560825,
    "gameweek": 29,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560826,
    "gameweek": 29,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560827,
    "gameweek": 29,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560828,
    "gameweek": 29,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560829,
    "gameweek": 29,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560830,
    "gameweek": 29,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560831,
    "gameweek": 29,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-03-13T12:00:00Z"
  },
  {
    "id": 560832,
    "gameweek": 30,
    "homeTeam": "Brentford FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560833,
    "gameweek": 30,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560834,
    "gameweek": 30,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560835,
    "gameweek": 30,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560836,
    "gameweek": 30,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560837,
    "gameweek": 30,
    "homeTeam": "Fulham FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560838,
    "gameweek": 30,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560839,
    "gameweek": 30,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560840,
    "gameweek": 30,
    "homeTeam": "Everton FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560841,
    "gameweek": 30,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-03-20T12:00:00Z"
  },
  {
    "id": 560842,
    "gameweek": 31,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560843,
    "gameweek": 31,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560844,
    "gameweek": 31,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560845,
    "gameweek": 31,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560846,
    "gameweek": 31,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560847,
    "gameweek": 31,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560848,
    "gameweek": 31,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560849,
    "gameweek": 31,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560850,
    "gameweek": 31,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560851,
    "gameweek": 31,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-04-10T12:00:00Z"
  },
  {
    "id": 560852,
    "gameweek": 32,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560853,
    "gameweek": 32,
    "homeTeam": "Fulham FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560854,
    "gameweek": 32,
    "homeTeam": "Brentford FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560855,
    "gameweek": 32,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560856,
    "gameweek": 32,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560857,
    "gameweek": 32,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560858,
    "gameweek": 32,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560859,
    "gameweek": 32,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560860,
    "gameweek": 32,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560861,
    "gameweek": 32,
    "homeTeam": "Everton FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-04-17T12:00:00Z"
  },
  {
    "id": 560862,
    "gameweek": 33,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560863,
    "gameweek": 33,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560864,
    "gameweek": 33,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560865,
    "gameweek": 33,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560866,
    "gameweek": 33,
    "homeTeam": "Everton FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560867,
    "gameweek": 33,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560868,
    "gameweek": 33,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560869,
    "gameweek": 33,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560870,
    "gameweek": 33,
    "homeTeam": "Brentford FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560871,
    "gameweek": 33,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-04-24T12:00:00Z"
  },
  {
    "id": 560872,
    "gameweek": 34,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560873,
    "gameweek": 34,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560874,
    "gameweek": 34,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560875,
    "gameweek": 34,
    "homeTeam": "Hull City AFC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560876,
    "gameweek": 34,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560877,
    "gameweek": 34,
    "homeTeam": "Fulham FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560878,
    "gameweek": 34,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560879,
    "gameweek": 34,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560880,
    "gameweek": 34,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560881,
    "gameweek": 34,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-05-01T12:00:00Z"
  },
  {
    "id": 560882,
    "gameweek": 35,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560883,
    "gameweek": 35,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560884,
    "gameweek": 35,
    "homeTeam": "Fulham FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560885,
    "gameweek": 35,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560886,
    "gameweek": 35,
    "homeTeam": "Brentford FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560887,
    "gameweek": 35,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560888,
    "gameweek": 35,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560889,
    "gameweek": 35,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560890,
    "gameweek": 35,
    "homeTeam": "Everton FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560891,
    "gameweek": 35,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-05-08T12:00:00Z"
  },
  {
    "id": 560892,
    "gameweek": 36,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560893,
    "gameweek": 36,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560894,
    "gameweek": 36,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560895,
    "gameweek": 36,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560896,
    "gameweek": 36,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560897,
    "gameweek": 36,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560898,
    "gameweek": 36,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560899,
    "gameweek": 36,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560900,
    "gameweek": 36,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560901,
    "gameweek": 36,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-05-15T12:00:00Z"
  },
  {
    "id": 560902,
    "gameweek": 37,
    "homeTeam": "Brentford FC",
    "awayTeam": "Hull City AFC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560903,
    "gameweek": 37,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560904,
    "gameweek": 37,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560905,
    "gameweek": 37,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560906,
    "gameweek": 37,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560907,
    "gameweek": 37,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Ipswich Town FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560908,
    "gameweek": 37,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Chelsea FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560909,
    "gameweek": 37,
    "homeTeam": "Fulham FC",
    "awayTeam": "Coventry City FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560910,
    "gameweek": 37,
    "homeTeam": "Everton FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560911,
    "gameweek": 37,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2027-05-23T12:00:00Z"
  },
  {
    "id": 560912,
    "gameweek": 38,
    "homeTeam": "Ipswich Town FC",
    "awayTeam": "Everton FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560913,
    "gameweek": 38,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560914,
    "gameweek": 38,
    "homeTeam": "Liverpool FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560915,
    "gameweek": 38,
    "homeTeam": "Coventry City FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560916,
    "gameweek": 38,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560917,
    "gameweek": 38,
    "homeTeam": "Hull City AFC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560918,
    "gameweek": 38,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560919,
    "gameweek": 38,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560920,
    "gameweek": 38,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2027-05-30T12:00:00Z"
  },
  {
    "id": 560921,
    "gameweek": 38,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2027-05-30T12:00:00Z"
  }
];

export default FIXTURES;
