import got from 'got';
import { FixturesResponse } from "./fixturesResponseTypes";
import { TeamsResponse } from './teamsResponseTypes';

const season = 2024;
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

const getTeams = async (leagueId: number) => {
    const response = await httpClient.get('teams', {
        headers: {
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
        searchParams: {
            league: leagueId,
            season: season,
        },
    }).json<TeamsResponse>();

    return response
}

export default { getFixtures, getTeams }
