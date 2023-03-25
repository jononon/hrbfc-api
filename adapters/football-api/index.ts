import got from 'got';
import { FixturesResponse } from "./types";

const season = 2022;
const teamId = 4680;

const httpClient = got.extend({
    prefixUrl: 'https://api-football-v1.p.rapidapi.com/v3/',
  });

const getFixtures = async () => {
    const response = await httpClient.get('fixtures', {
        headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
        searchParams: {
            team: teamId,
            season: season,
        },
    }).json<FixturesResponse>();

    return response
}

export default { getFixtures }
