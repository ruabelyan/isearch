import { MAX_RESULTS } from '../config';
import type { Lang, LatLng, Place } from '../types';
import { distanceMeters } from '../utils/geo';
import { ApiError, request } from './errors';

/**
 * Sights from Wikipedia's "articles near a point" search, in the app language.
 * Wikipedia also returns nearby articles that are not sights (ministries,
 * historical events, districts), so results are kept only when their title or
 * short description mentions a kind of sight.
 */
const SIGHT_WORDS: Record<Lang, string[]> = {
  en: [
    'museum',
    'gallery',
    'church',
    'cathedral',
    'monastery',
    'mosque',
    'temple',
    'chapel',
    'monument',
    'memorial',
    'statue',
    'sculpture',
    'square',
    'park',
    'garden',
    'fountain',
    'theatre',
    'theater',
    'opera',
    'fortress',
    'castle',
    'palace',
    'tower',
    'bridge',
    'cascade',
    'landmark',
    'archaeological',
    'zoo',
  ],
  hy: [
    'թանգարան',
    'պատկերասրահ',
    'եկեղեցի',
    'տաճար',
    'վանք',
    'մզկիթ',
    'մատուռ',
    'հուշարձան',
    'հուշահամալիր',
    'արձան',
    'քանդակ',
    'հրապարակ',
    'այգի',
    'պուրակ',
    'շատրվան',
    'թատրոն',
    'օպերա',
    'ամրոց',
    'բերդ',
    'պալատ',
    'աշտարակ',
    'կամուրջ',
    'կասկադ',
    'հնավայր',
  ],
  ru: [
    'музей',
    'галере',
    'церковь',
    'собор',
    'монастырь',
    'мечеть',
    'храм',
    'часовня',
    'памятник',
    'мемориал',
    'статуя',
    'скульптур',
    'площадь',
    'парк',
    'сад',
    'фонтан',
    'театр',
    'опер',
    'крепость',
    'замок',
    'дворец',
    'башня',
    'мост',
    'каскад',
    'достопримечательность',
  ],
};

interface WikiResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        description?: string;
        coordinates?: { lat: number; lon: number }[];
        thumbnail?: { source: string };
      }
    >;
  };
}

export async function fetchWikipediaSights(
  center: LatLng,
  lang: Lang,
  radiusMeters: number,
): Promise<Place[]> {
  const params = [
    'action=query',
    'format=json',
    'origin=*',
    'generator=geosearch',
    `ggscoord=${center.latitude}%7C${center.longitude}`,
    // The API allows 10 m to 10 km and 50 detailed results per request.
    `ggsradius=${Math.round(Math.min(Math.max(radiusMeters, 10), 10000))}`,
    'ggslimit=50',
    'prop=coordinates%7Cpageimages%7Cdescription',
    'colimit=50',
    'piprop=thumbnail',
    'pithumbsize=400',
    'pilimit=50',
  ];
  const response = await request(`https://${lang}.wikipedia.org/w/api.php?${params.join('&')}`);
  if (!response.ok) throw new ApiError(`Wikipedia HTTP ${response.status}`);
  const data = (await response.json()) as WikiResponse;

  const words = SIGHT_WORDS[lang];
  const sights: (Place & { distance: number })[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const coordinates = page.coordinates?.[0];
    if (!coordinates) continue;
    const text = `${page.title} ${page.description ?? ''}`.toLowerCase();
    if (!words.some((word) => text.includes(word))) continue;

    const location = { latitude: coordinates.lat, longitude: coordinates.lon };
    sights.push({
      id: `wiki-${lang}-${page.pageid}`,
      name: page.title.replace(/\s*\([^)]*\)$/, ''),
      category: 'sights',
      location,
      address: page.description,
      photoUrl: page.thumbnail?.source,
      distance: distanceMeters(center, location),
    });
  }

  return sights
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_RESULTS.sights)
    .map(({ distance, ...place }) => place);
}
