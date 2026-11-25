import { findChampionsHighlight } from './championsHighlights';
const { readHighlightCards } = require('../netlify/functions/champions-highlights');

const kickoff = '2026-11-24T20:00:00Z';
const path = '/uefachampionsleague/video/highlights/02ab-2226ac39f420-1c5c72baa84c-1000--champions-league-highlights-man-city-2-2-napoli/';
const match = { utcDate: kickoff, homeTeam: { name: 'Manchester City FC' }, awayTeam: { name: 'SSC Napoli' } };
const thumbnail = 'https://editorial.uefa.com/resources/clip/photo.jpeg?imwidth=158';
const card = { path, publishedAt: Date.parse('2026-11-25T00:08:00Z'), thumbnail };

test('extracts direct links and dates from official highlight cards', () => {
  const html = `<a href="${path}"><picture><source data-srcset="${thumbnail} 158w"></picture>
    <span data-options="{&quot;targetDate&quot;:&quot;2026-11-25T00:08:00&#x2B;00:00&quot;}"></span></a>`;
  expect(readHighlightCards(html)).toEqual([card]);
  expect(readHighlightCards(`<a href="${path}">Undated link</a>`)).toEqual([]);
});

test('matches team aliases only when the published clip belongs to this fixture window', () => {
  expect(findChampionsHighlight([card], match)).toEqual({ url: `https://www.uefa.com${path}`, thumbnail });
  expect(findChampionsHighlight([{ ...card, publishedAt: Date.parse('2026-11-04T00:08:00Z') }], match)).toBeNull();
  expect(findChampionsHighlight([card], { ...match, homeTeam: { name: 'Manchester United FC' } })).toBeNull();
  expect(findChampionsHighlight([{ ...card, path: `https://other.example${path}` }], match)).toBeNull();
});
