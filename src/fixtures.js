const FIXTURES = [
  {
    "id": 537785,
    "gameweek": 1,
    "homeTeam": "Liverpool FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-08-15T19:00:00Z"
  },
  {
    "id": 537786,
    "gameweek": 1,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-08-16T11:30:00Z"
  },
  {
    "id": 537787,
    "gameweek": 1,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-08-16T14:00:00Z"
  },
  {
    "id": 537789,
    "gameweek": 1,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-08-16T14:00:00Z"
  },
  {
    "id": 537790,
    "gameweek": 1,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-08-16T14:00:00Z"
  },
  {
    "id": 537791,
    "gameweek": 1,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-08-16T16:30:00Z"
  },
  {
    "id": 537788,
    "gameweek": 1,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-08-17T13:00:00Z"
  },
  {
    "id": 537792,
    "gameweek": 1,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-08-17T13:00:00Z"
  },
  {
    "id": 537793,
    "gameweek": 1,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-08-17T15:30:00Z"
  },
  {
    "id": 537794,
    "gameweek": 1,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-08-18T19:00:00Z"
  },
  {
    "id": 537804,
    "gameweek": 2,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-08-22T19:00:00Z"
  },
  {
    "id": 537802,
    "gameweek": 2,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-08-23T11:30:00Z"
  },
  {
    "id": 537795,
    "gameweek": 2,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-08-23T14:00:00Z"
  },
  {
    "id": 537798,
    "gameweek": 2,
    "homeTeam": "Brentford FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-08-23T14:00:00Z"
  },
  {
    "id": 537799,
    "gameweek": 2,
    "homeTeam": "Burnley FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-08-23T14:00:00Z"
  },
  {
    "id": 537797,
    "gameweek": 2,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-08-23T16:30:00Z"
  },
  {
    "id": 537796,
    "gameweek": 2,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-08-24T13:00:00Z"
  },
  {
    "id": 537800,
    "gameweek": 2,
    "homeTeam": "Everton FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-08-24T13:00:00Z"
  },
  {
    "id": 537801,
    "gameweek": 2,
    "homeTeam": "Fulham FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-08-24T15:30:00Z"
  },
  {
    "id": 537803,
    "gameweek": 2,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-08-25T19:00:00Z"
  },
  {
    "id": 537808,
    "gameweek": 3,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-08-30T11:30:00Z"
  },
  {
    "id": 537805,
    "gameweek": 3,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-08-30T14:00:00Z"
  },
  {
    "id": 537811,
    "gameweek": 3,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-08-30T14:00:00Z"
  },
  {
    "id": 537813,
    "gameweek": 3,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-08-30T14:00:00Z"
  },
  {
    "id": 537814,
    "gameweek": 3,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-08-30T14:00:00Z"
  },
  {
    "id": 537810,
    "gameweek": 3,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-08-30T16:30:00Z"
  },
  {
    "id": 537807,
    "gameweek": 3,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-08-31T13:00:00Z"
  },
  {
    "id": 537812,
    "gameweek": 3,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-08-31T13:00:00Z"
  },
  {
    "id": 537809,
    "gameweek": 3,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-08-31T15:30:00Z"
  },
  {
    "id": 537806,
    "gameweek": 3,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-08-31T18:00:00Z"
  },
  {
    "id": 537817,
    "gameweek": 4,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-09-13T11:30:00Z"
  },
  {
    "id": 537815,
    "gameweek": 4,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-09-13T14:00:00Z"
  },
  {
    "id": 537816,
    "gameweek": 4,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-09-13T14:00:00Z"
  },
  {
    "id": 537820,
    "gameweek": 4,
    "homeTeam": "Everton FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-09-13T14:00:00Z"
  },
  {
    "id": 537821,
    "gameweek": 4,
    "homeTeam": "Fulham FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-09-13T14:00:00Z"
  },
  {
    "id": 537823,
    "gameweek": 4,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-09-13T14:00:00Z"
  },
  {
    "id": 537824,
    "gameweek": 4,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-09-13T16:30:00Z"
  },
  {
    "id": 537818,
    "gameweek": 4,
    "homeTeam": "Brentford FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-09-13T19:00:00Z"
  },
  {
    "id": 537819,
    "gameweek": 4,
    "homeTeam": "Burnley FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-09-14T13:00:00Z"
  },
  {
    "id": 537822,
    "gameweek": 4,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-09-14T15:30:00Z"
  },
  {
    "id": 537831,
    "gameweek": 5,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-09-20T11:30:00Z"
  },
  {
    "id": 537827,
    "gameweek": 5,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-09-20T14:00:00Z"
  },
  {
    "id": 537829,
    "gameweek": 5,
    "homeTeam": "Burnley FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-09-20T14:00:00Z"
  },
  {
    "id": 537833,
    "gameweek": 5,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-09-20T14:00:00Z"
  },
  {
    "id": 537834,
    "gameweek": 5,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-09-20T14:00:00Z"
  },
  {
    "id": 537832,
    "gameweek": 5,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-09-20T16:30:00Z"
  },
  {
    "id": 537830,
    "gameweek": 5,
    "homeTeam": "Fulham FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-09-20T19:00:00Z"
  },
  {
    "id": 537825,
    "gameweek": 5,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-09-21T13:00:00Z"
  },
  {
    "id": 537826,
    "gameweek": 5,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-09-21T13:00:00Z"
  },
  {
    "id": 537828,
    "gameweek": 5,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-09-21T15:30:00Z"
  },
  {
    "id": 537837,
    "gameweek": 6,
    "homeTeam": "Brentford FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-09-27T11:30:00Z"
  },
  {
    "id": 537836,
    "gameweek": 6,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-09-27T14:00:00Z"
  },
  {
    "id": 537838,
    "gameweek": 6,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-09-27T14:00:00Z"
  },
  {
    "id": 537840,
    "gameweek": 6,
    "homeTeam": "Leeds United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-09-27T14:00:00Z"
  },
  {
    "id": 537841,
    "gameweek": 6,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-09-27T14:00:00Z"
  },
  {
    "id": 537843,
    "gameweek": 6,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-09-27T16:30:00Z"
  },
  {
    "id": 537844,
    "gameweek": 6,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-09-27T19:00:00Z"
  },
  {
    "id": 537835,
    "gameweek": 6,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-09-28T13:00:00Z"
  },
  {
    "id": 537842,
    "gameweek": 6,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-09-28T15:30:00Z"
  },
  {
    "id": 537839,
    "gameweek": 6,
    "homeTeam": "Everton FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-09-29T19:00:00Z"
  },
  {
    "id": 537845,
    "gameweek": 7,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-10-03T19:00:00Z"
  },
  {
    "id": 537851,
    "gameweek": 7,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-10-04T11:30:00Z"
  },
  {
    "id": 537847,
    "gameweek": 7,
    "homeTeam": "Arsenal FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-10-04T14:00:00Z"
  },
  {
    "id": 537852,
    "gameweek": 7,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-10-04T14:00:00Z"
  },
  {
    "id": 537849,
    "gameweek": 7,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-10-04T16:30:00Z"
  },
  {
    "id": 537846,
    "gameweek": 7,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-10-05T13:00:00Z"
  },
  {
    "id": 537850,
    "gameweek": 7,
    "homeTeam": "Everton FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-10-05T13:00:00Z"
  },
  {
    "id": 537853,
    "gameweek": 7,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-10-05T13:00:00Z"
  },
  {
    "id": 537854,
    "gameweek": 7,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-10-05T13:00:00Z"
  },
  {
    "id": 537848,
    "gameweek": 7,
    "homeTeam": "Brentford FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-10-05T15:30:00Z"
  },
  {
    "id": 537862,
    "gameweek": 8,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-10-18T11:30:00Z"
  },
  {
    "id": 537856,
    "gameweek": 8,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-10-18T14:00:00Z"
  },
  {
    "id": 537857,
    "gameweek": 8,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-10-18T14:00:00Z"
  },
  {
    "id": 537858,
    "gameweek": 8,
    "homeTeam": "Burnley FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-10-18T14:00:00Z"
  },
  {
    "id": 537861,
    "gameweek": 8,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-10-18T14:00:00Z"
  },
  {
    "id": 537855,
    "gameweek": 8,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-10-18T14:00:00Z"
  },
  {
    "id": 537859,
    "gameweek": 8,
    "homeTeam": "Fulham FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-10-18T16:30:00Z"
  },
  {
    "id": 537863,
    "gameweek": 8,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-10-19T13:00:00Z"
  },
  {
    "id": 537860,
    "gameweek": 8,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-10-19T15:30:00Z"
  },
  {
    "id": 537864,
    "gameweek": 8,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-10-20T19:00:00Z"
  },
  {
    "id": 537871,
    "gameweek": 9,
    "homeTeam": "Leeds United FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-10-24T19:00:00Z"
  },
  {
    "id": 537869,
    "gameweek": 9,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-10-25T14:00:00Z"
  },
  {
    "id": 537873,
    "gameweek": 9,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-10-25T14:00:00Z"
  },
  {
    "id": 537872,
    "gameweek": 9,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-10-25T16:30:00Z"
  },
  {
    "id": 537868,
    "gameweek": 9,
    "homeTeam": "Brentford FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-10-25T19:00:00Z"
  },
  {
    "id": 537865,
    "gameweek": 9,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-10-26T14:00:00Z"
  },
  {
    "id": 537866,
    "gameweek": 9,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-10-26T14:00:00Z"
  },
  {
    "id": 537867,
    "gameweek": 9,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-10-26T14:00:00Z"
  },
  {
    "id": 537874,
    "gameweek": 9,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-10-26T14:00:00Z"
  },
  {
    "id": 537870,
    "gameweek": 9,
    "homeTeam": "Everton FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-10-26T16:30:00Z"
  },
  {
    "id": 537876,
    "gameweek": 10,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-11-01T15:00:00Z"
  },
  {
    "id": 537877,
    "gameweek": 10,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-11-01T15:00:00Z"
  },
  {
    "id": 537878,
    "gameweek": 10,
    "homeTeam": "Burnley FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-11-01T15:00:00Z"
  },
  {
    "id": 537879,
    "gameweek": 10,
    "homeTeam": "Fulham FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-11-01T15:00:00Z"
  },
  {
    "id": 537882,
    "gameweek": 10,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-11-01T15:00:00Z"
  },
  {
    "id": 537883,
    "gameweek": 10,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-11-01T17:30:00Z"
  },
  {
    "id": 537880,
    "gameweek": 10,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-11-01T20:00:00Z"
  },
  {
    "id": 537884,
    "gameweek": 10,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-11-02T14:00:00Z"
  },
  {
    "id": 537881,
    "gameweek": 10,
    "homeTeam": "Manchester City FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-11-02T16:30:00Z"
  },
  {
    "id": 537875,
    "gameweek": 10,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-11-03T20:00:00Z"
  },
  {
    "id": 537893,
    "gameweek": 11,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-11-08T12:30:00Z"
  },
  {
    "id": 537890,
    "gameweek": 11,
    "homeTeam": "Everton FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-11-08T15:00:00Z"
  },
  {
    "id": 537894,
    "gameweek": 11,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-11-08T15:00:00Z"
  },
  {
    "id": 537885,
    "gameweek": 11,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-11-08T17:30:00Z"
  },
  {
    "id": 537889,
    "gameweek": 11,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-11-08T20:00:00Z"
  },
  {
    "id": 537886,
    "gameweek": 11,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-11-09T14:00:00Z"
  },
  {
    "id": 537887,
    "gameweek": 11,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-11-09T14:00:00Z"
  },
  {
    "id": 537888,
    "gameweek": 11,
    "homeTeam": "Brentford FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-11-09T14:00:00Z"
  },
  {
    "id": 537892,
    "gameweek": 11,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-11-09T14:00:00Z"
  },
  {
    "id": 537891,
    "gameweek": 11,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-11-09T16:30:00Z"
  },
  {
    "id": 537898,
    "gameweek": 12,
    "homeTeam": "Burnley FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-11-22T12:30:00Z"
  },
  {
    "id": 537895,
    "gameweek": 12,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-11-22T15:00:00Z"
  },
  {
    "id": 537896,
    "gameweek": 12,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-11-22T15:00:00Z"
  },
  {
    "id": 537899,
    "gameweek": 12,
    "homeTeam": "Fulham FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-11-22T15:00:00Z"
  },
  {
    "id": 537900,
    "gameweek": 12,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-11-22T15:00:00Z"
  },
  {
    "id": 537904,
    "gameweek": 12,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-11-22T15:00:00Z"
  },
  {
    "id": 537903,
    "gameweek": 12,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-11-22T17:30:00Z"
  },
  {
    "id": 537901,
    "gameweek": 12,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-11-23T14:00:00Z"
  },
  {
    "id": 537897,
    "gameweek": 12,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-11-23T16:30:00Z"
  },
  {
    "id": 537902,
    "gameweek": 12,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-11-24T20:00:00Z"
  },
  {
    "id": 537905,
    "gameweek": 13,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-11-29T15:00:00Z"
  },
  {
    "id": 537908,
    "gameweek": 13,
    "homeTeam": "Brentford FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-11-29T15:00:00Z"
  },
  {
    "id": 537911,
    "gameweek": 13,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-11-29T15:00:00Z"
  },
  {
    "id": 537910,
    "gameweek": 13,
    "homeTeam": "Everton FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-11-29T17:30:00Z"
  },
  {
    "id": 537913,
    "gameweek": 13,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-11-29T20:00:00Z"
  },
  {
    "id": 537907,
    "gameweek": 13,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-11-30T12:00:00Z"
  },
  {
    "id": 537906,
    "gameweek": 13,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-11-30T14:05:00Z"
  },
  {
    "id": 537912,
    "gameweek": 13,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-11-30T14:05:00Z"
  },
  {
    "id": 537914,
    "gameweek": 13,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-11-30T14:05:00Z"
  },
  {
    "id": 537909,
    "gameweek": 13,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-11-30T16:30:00Z"
  },
  {
    "id": 537915,
    "gameweek": 14,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Everton FC",
    "kickoff": "2025-12-02T19:30:00Z"
  },
  {
    "id": 537919,
    "gameweek": 14,
    "homeTeam": "Fulham FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-12-02T19:30:00Z"
  },
  {
    "id": 537923,
    "gameweek": 14,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-12-02T20:15:00Z"
  },
  {
    "id": 537916,
    "gameweek": 14,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-12-03T19:30:00Z"
  },
  {
    "id": 537917,
    "gameweek": 14,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-12-03T19:30:00Z"
  },
  {
    "id": 537918,
    "gameweek": 14,
    "homeTeam": "Burnley FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-12-03T19:30:00Z"
  },
  {
    "id": 537924,
    "gameweek": 14,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-12-03T19:30:00Z"
  },
  {
    "id": 537920,
    "gameweek": 14,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-12-03T20:15:00Z"
  },
  {
    "id": 537921,
    "gameweek": 14,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-12-03T20:15:00Z"
  },
  {
    "id": 537922,
    "gameweek": 14,
    "homeTeam": "Manchester United FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-12-04T20:00:00Z"
  },
  {
    "id": 537926,
    "gameweek": 15,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-12-06T12:30:00Z"
  },
  {
    "id": 537925,
    "gameweek": 15,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-12-06T15:00:00Z"
  },
  {
    "id": 537928,
    "gameweek": 15,
    "homeTeam": "Everton FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-12-06T15:00:00Z"
  },
  {
    "id": 537931,
    "gameweek": 15,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-12-06T15:00:00Z"
  },
  {
    "id": 537932,
    "gameweek": 15,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-12-06T15:00:00Z"
  },
  {
    "id": 537933,
    "gameweek": 15,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-12-06T15:00:00Z"
  },
  {
    "id": 537930,
    "gameweek": 15,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-12-06T17:30:00Z"
  },
  {
    "id": 537927,
    "gameweek": 15,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-12-07T14:00:00Z"
  },
  {
    "id": 537929,
    "gameweek": 15,
    "homeTeam": "Fulham FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-12-07T16:30:00Z"
  },
  {
    "id": 537934,
    "gameweek": 15,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-12-08T20:00:00Z"
  },
  {
    "id": 537940,
    "gameweek": 16,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-12-13T15:00:00Z"
  },
  {
    "id": 537941,
    "gameweek": 16,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-12-13T15:00:00Z"
  },
  {
    "id": 537939,
    "gameweek": 16,
    "homeTeam": "Burnley FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-12-13T17:30:00Z"
  },
  {
    "id": 537937,
    "gameweek": 16,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-12-13T20:00:00Z"
  },
  {
    "id": 537935,
    "gameweek": 16,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-12-14T14:00:00Z"
  },
  {
    "id": 537936,
    "gameweek": 16,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-12-14T14:00:00Z"
  },
  {
    "id": 537943,
    "gameweek": 16,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-12-14T14:00:00Z"
  },
  {
    "id": 537944,
    "gameweek": 16,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-12-14T14:00:00Z"
  },
  {
    "id": 537938,
    "gameweek": 16,
    "homeTeam": "Brentford FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-12-14T16:30:00Z"
  },
  {
    "id": 537942,
    "gameweek": 16,
    "homeTeam": "Manchester United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-12-15T20:00:00Z"
  },
  {
    "id": 537952,
    "gameweek": 17,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2025-12-20T12:30:00Z"
  },
  {
    "id": 537945,
    "gameweek": 17,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Burnley FC",
    "kickoff": "2025-12-20T15:00:00Z"
  },
  {
    "id": 537947,
    "gameweek": 17,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2025-12-20T15:00:00Z"
  },
  {
    "id": 537951,
    "gameweek": 17,
    "homeTeam": "Manchester City FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2025-12-20T15:00:00Z"
  },
  {
    "id": 537954,
    "gameweek": 17,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2025-12-20T15:00:00Z"
  },
  {
    "id": 537953,
    "gameweek": 17,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2025-12-20T17:30:00Z"
  },
  {
    "id": 537948,
    "gameweek": 17,
    "homeTeam": "Everton FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2025-12-20T20:00:00Z"
  },
  {
    "id": 537950,
    "gameweek": 17,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2025-12-20T20:00:00Z"
  },
  {
    "id": 537946,
    "gameweek": 17,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2025-12-21T16:30:00Z"
  },
  {
    "id": 537949,
    "gameweek": 17,
    "homeTeam": "Fulham FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2025-12-22T20:00:00Z"
  },
  {
    "id": 537962,
    "gameweek": 18,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-12-26T20:00:00Z"
  },
  {
    "id": 537963,
    "gameweek": 18,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2025-12-27T12:30:00Z"
  },
  {
    "id": 537957,
    "gameweek": 18,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-12-27T15:00:00Z"
  },
  {
    "id": 537958,
    "gameweek": 18,
    "homeTeam": "Brentford FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-12-27T15:00:00Z"
  },
  {
    "id": 537959,
    "gameweek": 18,
    "homeTeam": "Burnley FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-12-27T15:00:00Z"
  },
  {
    "id": 537961,
    "gameweek": 18,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-12-27T15:00:00Z"
  },
  {
    "id": 537964,
    "gameweek": 18,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2025-12-27T15:00:00Z"
  },
  {
    "id": 537960,
    "gameweek": 18,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-12-27T17:30:00Z"
  },
  {
    "id": 537955,
    "gameweek": 18,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2025-12-28T14:00:00Z"
  },
  {
    "id": 537956,
    "gameweek": 18,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2025-12-28T16:30:00Z"
  },
  {
    "id": 537969,
    "gameweek": 19,
    "homeTeam": "Burnley FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2025-12-30T19:30:00Z"
  },
  {
    "id": 537970,
    "gameweek": 19,
    "homeTeam": "Chelsea FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2025-12-30T19:30:00Z"
  },
  {
    "id": 537973,
    "gameweek": 19,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Everton FC",
    "kickoff": "2025-12-30T19:30:00Z"
  },
  {
    "id": 537974,
    "gameweek": 19,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2025-12-30T19:30:00Z"
  },
  {
    "id": 537967,
    "gameweek": 19,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2025-12-30T20:15:00Z"
  },
  {
    "id": 537972,
    "gameweek": 19,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2025-12-30T20:15:00Z"
  },
  {
    "id": 537966,
    "gameweek": 19,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-01-01T17:30:00Z"
  },
  {
    "id": 537971,
    "gameweek": 19,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-01-01T17:30:00Z"
  },
  {
    "id": 537965,
    "gameweek": 19,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-01-01T20:00:00Z"
  },
  {
    "id": 537968,
    "gameweek": 19,
    "homeTeam": "Brentford FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-01-01T20:00:00Z"
  },
  {
    "id": 537976,
    "gameweek": 20,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-01-03T12:30:00Z"
  },
  {
    "id": 537977,
    "gameweek": 20,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-01-03T15:00:00Z"
  },
  {
    "id": 537984,
    "gameweek": 20,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-01-03T15:00:00Z"
  },
  {
    "id": 537975,
    "gameweek": 20,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-01-03T17:30:00Z"
  },
  {
    "id": 537980,
    "gameweek": 20,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-01-04T12:30:00Z"
  },
  {
    "id": 537978,
    "gameweek": 20,
    "homeTeam": "Everton FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-01-04T15:00:00Z"
  },
  {
    "id": 537982,
    "gameweek": 20,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-01-04T15:00:00Z"
  },
  {
    "id": 537983,
    "gameweek": 20,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-01-04T15:00:00Z"
  },
  {
    "id": 537979,
    "gameweek": 20,
    "homeTeam": "Fulham FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-01-04T15:15:00Z"
  },
  {
    "id": 537981,
    "gameweek": 20,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-01-04T17:30:00Z"
  },
  {
    "id": 537994,
    "gameweek": 21,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-01-06T20:00:00Z"
  },
  {
    "id": 537985,
    "gameweek": 21,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-01-07T19:30:00Z"
  },
  {
    "id": 537986,
    "gameweek": 21,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-01-07T19:30:00Z"
  },
  {
    "id": 537988,
    "gameweek": 21,
    "homeTeam": "Brentford FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-01-07T19:30:00Z"
  },
  {
    "id": 537990,
    "gameweek": 21,
    "homeTeam": "Everton FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-01-07T19:30:00Z"
  },
  {
    "id": 537991,
    "gameweek": 21,
    "homeTeam": "Fulham FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-01-07T19:30:00Z"
  },
  {
    "id": 537992,
    "gameweek": 21,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-01-07T19:30:00Z"
  },
  {
    "id": 537989,
    "gameweek": 21,
    "homeTeam": "Burnley FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-01-07T20:15:00Z"
  },
  {
    "id": 537993,
    "gameweek": 21,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-01-07T20:15:00Z"
  },
  {
    "id": 537987,
    "gameweek": 21,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-01-08T20:00:00Z"
  },
  {
    "id": 538001,
    "gameweek": 22,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-01-17T12:30:00Z"
  },
  {
    "id": 537995,
    "gameweek": 22,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-01-17T15:00:00Z"
  },
  {
    "id": 537998,
    "gameweek": 22,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-01-17T15:00:00Z"
  },
  {
    "id": 537999,
    "gameweek": 22,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-01-17T15:00:00Z"
  },
  {
    "id": 538000,
    "gameweek": 22,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-01-17T15:00:00Z"
  },
  {
    "id": 538003,
    "gameweek": 22,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-01-17T15:00:00Z"
  },
  {
    "id": 538002,
    "gameweek": 22,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-01-17T17:30:00Z"
  },
  {
    "id": 538004,
    "gameweek": 22,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-01-18T14:00:00Z"
  },
  {
    "id": 537996,
    "gameweek": 22,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-01-18T16:30:00Z"
  },
  {
    "id": 537997,
    "gameweek": 22,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-01-19T20:00:00Z"
  },
  {
    "id": 538014,
    "gameweek": 23,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-01-24T12:30:00Z"
  },
  {
    "id": 538009,
    "gameweek": 23,
    "homeTeam": "Burnley FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-01-24T15:00:00Z"
  },
  {
    "id": 538011,
    "gameweek": 23,
    "homeTeam": "Fulham FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-01-24T15:00:00Z"
  },
  {
    "id": 538012,
    "gameweek": 23,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-01-24T15:00:00Z"
  },
  {
    "id": 538005,
    "gameweek": 23,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-01-24T17:30:00Z"
  },
  {
    "id": 538006,
    "gameweek": 23,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-01-25T14:00:00Z"
  },
  {
    "id": 538008,
    "gameweek": 23,
    "homeTeam": "Brentford FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-01-25T14:00:00Z"
  },
  {
    "id": 538013,
    "gameweek": 23,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-01-25T14:00:00Z"
  },
  {
    "id": 538007,
    "gameweek": 23,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-01-25T16:30:00Z"
  },
  {
    "id": 538010,
    "gameweek": 23,
    "homeTeam": "Everton FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-01-26T20:00:00Z"
  },
  {
    "id": 538017,
    "gameweek": 24,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-01-31T15:00:00Z"
  },
  {
    "id": 538020,
    "gameweek": 24,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-01-31T15:00:00Z"
  },
  {
    "id": 538024,
    "gameweek": 24,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-01-31T15:00:00Z"
  },
  {
    "id": 538018,
    "gameweek": 24,
    "homeTeam": "Chelsea FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-01-31T17:30:00Z"
  },
  {
    "id": 538019,
    "gameweek": 24,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-01-31T20:00:00Z"
  },
  {
    "id": 538016,
    "gameweek": 24,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-02-01T14:00:00Z"
  },
  {
    "id": 538021,
    "gameweek": 24,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-02-01T14:00:00Z"
  },
  {
    "id": 538022,
    "gameweek": 24,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-02-01T14:00:00Z"
  },
  {
    "id": 538023,
    "gameweek": 24,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-02-01T16:30:00Z"
  },
  {
    "id": 538015,
    "gameweek": 24,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-02-02T20:00:00Z"
  },
  {
    "id": 538031,
    "gameweek": 25,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-02-06T20:00:00Z"
  },
  {
    "id": 538032,
    "gameweek": 25,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-02-07T12:30:00Z"
  },
  {
    "id": 538025,
    "gameweek": 25,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-02-07T15:00:00Z"
  },
  {
    "id": 538027,
    "gameweek": 25,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-02-07T15:00:00Z"
  },
  {
    "id": 538028,
    "gameweek": 25,
    "homeTeam": "Burnley FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-02-07T15:00:00Z"
  },
  {
    "id": 538029,
    "gameweek": 25,
    "homeTeam": "Fulham FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-02-07T15:00:00Z"
  },
  {
    "id": 538034,
    "gameweek": 25,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-02-07T15:00:00Z"
  },
  {
    "id": 538033,
    "gameweek": 25,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-02-07T17:30:00Z"
  },
  {
    "id": 538026,
    "gameweek": 25,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-02-08T14:00:00Z"
  },
  {
    "id": 538030,
    "gameweek": 25,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-02-08T16:30:00Z"
  },
  {
    "id": 538039,
    "gameweek": 26,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-02-10T19:30:00Z"
  },
  {
    "id": 538040,
    "gameweek": 26,
    "homeTeam": "Everton FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-02-10T19:30:00Z"
  },
  {
    "id": 538043,
    "gameweek": 26,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-02-10T19:30:00Z"
  },
  {
    "id": 538044,
    "gameweek": 26,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-02-10T20:15:00Z"
  },
  {
    "id": 538036,
    "gameweek": 26,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-02-11T19:30:00Z"
  },
  {
    "id": 538037,
    "gameweek": 26,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-02-11T19:30:00Z"
  },
  {
    "id": 538041,
    "gameweek": 26,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-02-11T19:30:00Z"
  },
  {
    "id": 538042,
    "gameweek": 26,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-02-11T19:30:00Z"
  },
  {
    "id": 538035,
    "gameweek": 26,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-02-11T20:15:00Z"
  },
  {
    "id": 538038,
    "gameweek": 26,
    "homeTeam": "Brentford FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-02-12T20:00:00Z"
  },
  {
    "id": 538051,
    "gameweek": 27,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-02-21T12:30:00Z"
  },
  {
    "id": 538046,
    "gameweek": 27,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-02-21T15:00:00Z"
  },
  {
    "id": 538047,
    "gameweek": 27,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-02-21T15:00:00Z"
  },
  {
    "id": 538048,
    "gameweek": 27,
    "homeTeam": "Brentford FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-02-21T15:00:00Z"
  },
  {
    "id": 538049,
    "gameweek": 27,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-02-21T15:00:00Z"
  },
  {
    "id": 538052,
    "gameweek": 27,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-02-21T15:00:00Z"
  },
  {
    "id": 538054,
    "gameweek": 27,
    "homeTeam": "West Ham United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-02-21T17:30:00Z"
  },
  {
    "id": 538045,
    "gameweek": 27,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-02-22T14:00:00Z"
  },
  {
    "id": 538053,
    "gameweek": 27,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-02-22T16:30:00Z"
  },
  {
    "id": 538050,
    "gameweek": 27,
    "homeTeam": "Everton FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-02-23T20:00:00Z"
  },
  {
    "id": 538064,
    "gameweek": 28,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-02-27T20:00:00Z"
  },
  {
    "id": 538055,
    "gameweek": 28,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-02-28T12:30:00Z"
  },
  {
    "id": 538056,
    "gameweek": 28,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-02-28T15:00:00Z"
  },
  {
    "id": 538058,
    "gameweek": 28,
    "homeTeam": "Burnley FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-02-28T15:00:00Z"
  },
  {
    "id": 538060,
    "gameweek": 28,
    "homeTeam": "Liverpool FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-02-28T15:00:00Z"
  },
  {
    "id": 538062,
    "gameweek": 28,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-02-28T15:00:00Z"
  },
  {
    "id": 538063,
    "gameweek": 28,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-02-28T15:00:00Z"
  },
  {
    "id": 538061,
    "gameweek": 28,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-02-28T17:30:00Z"
  },
  {
    "id": 538059,
    "gameweek": 28,
    "homeTeam": "Fulham FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-03-01T14:00:00Z"
  },
  {
    "id": 538057,
    "gameweek": 28,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-03-01T16:30:00Z"
  },
  {
    "id": 538065,
    "gameweek": 29,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538066,
    "gameweek": 29,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538067,
    "gameweek": 29,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538068,
    "gameweek": 29,
    "homeTeam": "Everton FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538069,
    "gameweek": 29,
    "homeTeam": "Fulham FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538070,
    "gameweek": 29,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538071,
    "gameweek": 29,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538072,
    "gameweek": 29,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538073,
    "gameweek": 29,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538074,
    "gameweek": 29,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-03-04T20:00:00Z"
  },
  {
    "id": 538075,
    "gameweek": 30,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538076,
    "gameweek": 30,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538077,
    "gameweek": 30,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538078,
    "gameweek": 30,
    "homeTeam": "Brentford FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538079,
    "gameweek": 30,
    "homeTeam": "Burnley FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538080,
    "gameweek": 30,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538081,
    "gameweek": 30,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538082,
    "gameweek": 30,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538083,
    "gameweek": 30,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538084,
    "gameweek": 30,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-03-14T15:00:00Z"
  },
  {
    "id": 538085,
    "gameweek": 31,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538086,
    "gameweek": 31,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538087,
    "gameweek": 31,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538088,
    "gameweek": 31,
    "homeTeam": "Everton FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538089,
    "gameweek": 31,
    "homeTeam": "Fulham FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538090,
    "gameweek": 31,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538091,
    "gameweek": 31,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538092,
    "gameweek": 31,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538093,
    "gameweek": 31,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538094,
    "gameweek": 31,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-03-21T15:00:00Z"
  },
  {
    "id": 538095,
    "gameweek": 32,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538096,
    "gameweek": 32,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538097,
    "gameweek": 32,
    "homeTeam": "Arsenal FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538098,
    "gameweek": 32,
    "homeTeam": "Brentford FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538099,
    "gameweek": 32,
    "homeTeam": "Burnley FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538100,
    "gameweek": 32,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538101,
    "gameweek": 32,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538102,
    "gameweek": 32,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538103,
    "gameweek": 32,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538104,
    "gameweek": 32,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-04-11T14:00:00Z"
  },
  {
    "id": 538112,
    "gameweek": 33,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538113,
    "gameweek": 33,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538114,
    "gameweek": 33,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538105,
    "gameweek": 33,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538106,
    "gameweek": 33,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538107,
    "gameweek": 33,
    "homeTeam": "Brentford FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538108,
    "gameweek": 33,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538109,
    "gameweek": 33,
    "homeTeam": "Everton FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538110,
    "gameweek": 33,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538111,
    "gameweek": 33,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-04-18T14:00:00Z"
  },
  {
    "id": 538115,
    "gameweek": 34,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538116,
    "gameweek": 34,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538117,
    "gameweek": 34,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538118,
    "gameweek": 34,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538119,
    "gameweek": 34,
    "homeTeam": "Burnley FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538120,
    "gameweek": 34,
    "homeTeam": "Fulham FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538121,
    "gameweek": 34,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538122,
    "gameweek": 34,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538123,
    "gameweek": 34,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538124,
    "gameweek": 34,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-04-25T14:00:00Z"
  },
  {
    "id": 538125,
    "gameweek": 35,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538126,
    "gameweek": 35,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538127,
    "gameweek": 35,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538128,
    "gameweek": 35,
    "homeTeam": "Brentford FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538129,
    "gameweek": 35,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538130,
    "gameweek": 35,
    "homeTeam": "Everton FC",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538131,
    "gameweek": 35,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538132,
    "gameweek": 35,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538133,
    "gameweek": 35,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538134,
    "gameweek": 35,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-05-02T14:00:00Z"
  },
  {
    "id": 538135,
    "gameweek": 36,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538136,
    "gameweek": 36,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538137,
    "gameweek": 36,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538138,
    "gameweek": 36,
    "homeTeam": "Burnley FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538139,
    "gameweek": 36,
    "homeTeam": "Fulham FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538140,
    "gameweek": 36,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538141,
    "gameweek": 36,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538142,
    "gameweek": 36,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538143,
    "gameweek": 36,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538144,
    "gameweek": 36,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-05-09T14:00:00Z"
  },
  {
    "id": 538145,
    "gameweek": 37,
    "homeTeam": "AFC Bournemouth",
    "awayTeam": "Manchester City FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538146,
    "gameweek": 37,
    "homeTeam": "Aston Villa FC",
    "awayTeam": "Liverpool FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538147,
    "gameweek": 37,
    "homeTeam": "Arsenal FC",
    "awayTeam": "Burnley FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538148,
    "gameweek": 37,
    "homeTeam": "Brentford FC",
    "awayTeam": "Crystal Palace FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538149,
    "gameweek": 37,
    "homeTeam": "Chelsea FC",
    "awayTeam": "Tottenham Hotspur FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538150,
    "gameweek": 37,
    "homeTeam": "Everton FC",
    "awayTeam": "Sunderland AFC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538151,
    "gameweek": 37,
    "homeTeam": "Leeds United FC",
    "awayTeam": "Brighton & Hove Albion FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538152,
    "gameweek": 37,
    "homeTeam": "Manchester United FC",
    "awayTeam": "Nottingham Forest FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538153,
    "gameweek": 37,
    "homeTeam": "Newcastle United FC",
    "awayTeam": "West Ham United FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538154,
    "gameweek": 37,
    "homeTeam": "Wolverhampton Wanderers FC",
    "awayTeam": "Fulham FC",
    "kickoff": "2026-05-17T14:00:00Z"
  },
  {
    "id": 538155,
    "gameweek": 38,
    "homeTeam": "Sunderland AFC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538156,
    "gameweek": 38,
    "homeTeam": "Brighton & Hove Albion FC",
    "awayTeam": "Manchester United FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538157,
    "gameweek": 38,
    "homeTeam": "Crystal Palace FC",
    "awayTeam": "Arsenal FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538158,
    "gameweek": 38,
    "homeTeam": "Burnley FC",
    "awayTeam": "Wolverhampton Wanderers FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538159,
    "gameweek": 38,
    "homeTeam": "Fulham FC",
    "awayTeam": "Newcastle United FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538160,
    "gameweek": 38,
    "homeTeam": "Liverpool FC",
    "awayTeam": "Brentford FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538161,
    "gameweek": 38,
    "homeTeam": "Manchester City FC",
    "awayTeam": "Aston Villa FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538162,
    "gameweek": 38,
    "homeTeam": "Nottingham Forest FC",
    "awayTeam": "AFC Bournemouth",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538163,
    "gameweek": 38,
    "homeTeam": "Tottenham Hotspur FC",
    "awayTeam": "Everton FC",
    "kickoff": "2026-05-24T15:00:00Z"
  },
  {
    "id": 538164,
    "gameweek": 38,
    "homeTeam": "West Ham United FC",
    "awayTeam": "Leeds United FC",
    "kickoff": "2026-05-24T15:00:00Z"
  }
] 

export default FIXTURES;
