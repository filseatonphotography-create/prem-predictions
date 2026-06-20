const group = (name, position) => ({ kind: "group", group: name, position });
const third = (groups) => ({ kind: "third", groups });
const winner = (match) => ({ kind: "winner", match });
const loser = (match) => ({ kind: "loser", match });

const WORLD_CUP_KNOCKOUT_MATCHES = [
  { match: 73, id: 537417, stage: "round32", kickoff: "2026-06-28T19:00:00Z", stadium: "Los Angeles Stadium", sources: [group("A", 2), group("B", 2)] },
  { match: 74, id: 537423, stage: "round32", kickoff: "2026-06-29T17:00:00Z", stadium: "Boston Stadium", sources: [group("E", 1), third("ABCDF")] },
  { match: 75, id: 537415, stage: "round32", kickoff: "2026-06-29T20:30:00Z", stadium: "Estadio Monterrey", sources: [group("F", 1), group("C", 2)] },
  { match: 76, id: 537418, stage: "round32", kickoff: "2026-06-30T01:00:00Z", stadium: "Houston Stadium", sources: [group("C", 1), group("F", 2)] },
  { match: 77, id: 537424, stage: "round32", kickoff: "2026-06-30T17:00:00Z", stadium: "New York New Jersey Stadium", sources: [group("I", 1), third("CDFGH")] },
  { match: 78, id: 537416, stage: "round32", kickoff: "2026-06-30T21:00:00Z", stadium: "Dallas Stadium", sources: [group("E", 2), group("I", 2)] },
  { match: 79, id: 537425, stage: "round32", kickoff: "2026-07-01T01:00:00Z", stadium: "Mexico City Stadium", sources: [group("A", 1), third("CEFHI")] },
  { match: 80, id: 537426, stage: "round32", kickoff: "2026-07-01T16:00:00Z", stadium: "Atlanta Stadium", sources: [group("L", 1), third("EHIJK")] },
  { match: 81, id: 537422, stage: "round32", kickoff: "2026-07-01T20:00:00Z", stadium: "San Francisco Bay Area Stadium", sources: [group("D", 1), third("BEFIJ")] },
  { match: 82, id: 537421, stage: "round32", kickoff: "2026-07-02T00:00:00Z", stadium: "Seattle Stadium", sources: [group("G", 1), third("AEHIJ")] },
  { match: 83, id: 537420, stage: "round32", kickoff: "2026-07-02T19:00:00Z", stadium: "Toronto Stadium", sources: [group("K", 2), group("L", 2)] },
  { match: 84, id: 537419, stage: "round32", kickoff: "2026-07-02T23:00:00Z", stadium: "Los Angeles Stadium", sources: [group("H", 1), group("J", 2)] },
  { match: 85, id: 537429, stage: "round32", kickoff: "2026-07-03T03:00:00Z", stadium: "BC Place Vancouver", sources: [group("B", 1), third("EFGIJ")] },
  { match: 86, id: 537428, stage: "round32", kickoff: "2026-07-03T18:00:00Z", stadium: "Miami Stadium", sources: [group("J", 1), group("H", 2)] },
  { match: 87, id: 537427, stage: "round32", kickoff: "2026-07-03T22:00:00Z", stadium: "Kansas City Stadium", sources: [group("K", 1), third("DEIJL")] },
  { match: 88, id: 537430, stage: "round32", kickoff: "2026-07-04T01:30:00Z", stadium: "Dallas Stadium", sources: [group("D", 2), group("G", 2)] },
  { match: 89, id: 537376, stage: "round16", kickoff: "2026-07-04T17:00:00Z", stadium: "Philadelphia Stadium", sources: [winner(74), winner(77)] },
  { match: 90, id: 537375, stage: "round16", kickoff: "2026-07-04T21:00:00Z", stadium: "Houston Stadium", sources: [winner(73), winner(75)] },
  { match: 91, id: 537377, stage: "round16", kickoff: "2026-07-05T20:00:00Z", stadium: "New York New Jersey Stadium", sources: [winner(76), winner(78)] },
  { match: 92, id: 537378, stage: "round16", kickoff: "2026-07-06T00:00:00Z", stadium: "Mexico City Stadium", sources: [winner(79), winner(80)] },
  { match: 93, id: 537379, stage: "round16", kickoff: "2026-07-06T19:00:00Z", stadium: "Dallas Stadium", sources: [winner(83), winner(84)] },
  { match: 94, id: 537380, stage: "round16", kickoff: "2026-07-07T00:00:00Z", stadium: "Seattle Stadium", sources: [winner(81), winner(82)] },
  { match: 95, id: 537381, stage: "round16", kickoff: "2026-07-07T16:00:00Z", stadium: "Atlanta Stadium", sources: [winner(86), winner(88)] },
  { match: 96, id: 537382, stage: "round16", kickoff: "2026-07-07T20:00:00Z", stadium: "BC Place Vancouver", sources: [winner(85), winner(87)] },
  { match: 97, id: 537383, stage: "quarter", kickoff: "2026-07-09T20:00:00Z", stadium: "Boston Stadium", sources: [winner(89), winner(90)] },
  { match: 98, id: 537384, stage: "quarter", kickoff: "2026-07-10T19:00:00Z", stadium: "Los Angeles Stadium", sources: [winner(93), winner(94)] },
  { match: 99, id: 537385, stage: "quarter", kickoff: "2026-07-11T21:00:00Z", stadium: "Miami Stadium", sources: [winner(91), winner(92)] },
  { match: 100, id: 537386, stage: "quarter", kickoff: "2026-07-12T01:00:00Z", stadium: "Kansas City Stadium", sources: [winner(95), winner(96)] },
  { match: 101, id: 537387, stage: "semi", kickoff: "2026-07-14T19:00:00Z", stadium: "Dallas Stadium", sources: [winner(97), winner(98)] },
  { match: 102, id: 537388, stage: "semi", kickoff: "2026-07-15T19:00:00Z", stadium: "Atlanta Stadium", sources: [winner(99), winner(100)] },
  { match: 103, id: 537389, stage: "third", kickoff: "2026-07-18T21:00:00Z", stadium: "Miami Stadium", sources: [loser(101), loser(102)] },
  { match: 104, id: 537390, stage: "final", kickoff: "2026-07-19T19:00:00Z", stadium: "New York New Jersey Stadium", sources: [winner(101), winner(102)] },
];

export default WORLD_CUP_KNOCKOUT_MATCHES;
