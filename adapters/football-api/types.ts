export interface FixturesResponse {
    get:        string;
    parameters: Parameters;
    errors:     any[];
    results:    number;
    paging:     Paging;
    response:   Response[];
}

export interface Paging {
    current: number;
    total:   number;
}

export interface Parameters {
    season: string;
    team:   string;
}

export interface Response {
    fixture: Fixture;
    league:  League;
    teams:   Goals;
    goals:   Goals;
    score:   Score;
}

export interface Fixture {
    id:        number;
    referee:   null | string;
    timezone:  Timezone;
    date:      Date;
    timestamp: number;
    periods:   Periods;
    venue:     Venue;
    status:    Status;
}

export interface Periods {
    first:  number | null;
    second: number | null;
}

export interface Status {
    long:    Long;
    short:   Short;
    elapsed: number | null;
}

export enum Long {
    MatchFinished = "Match Finished",
    NotStarted = "Not Started",
}

export enum Short {
    Ft = "FT",
    NS = "NS",
}

export enum Timezone {
    UTC = "UTC",
}

export interface Venue {
    id:   number | null;
    name: null | string;
    city: null | string;
}

export interface Goals {
    home: AwayClass | number | null;
    away: AwayClass | number | null;
}

export interface AwayClass {
    id:     number;
    name:   string;
    logo:   string;
    winner: boolean | null;
}

export interface League {
    id:      number;
    name:    Name;
    country: Country;
    logo:    string;
    flag:    null | string;
    season:  number;
    round:   string;
}

export enum Country {
    England = "England",
    World = "World",
}

export enum Name {
    FACup = "FA Cup",
    FATrophy = "FA Trophy",
    FriendliesClubs = "Friendlies Clubs",
    NationalLeagueSouth = "National League - South",
}

export interface Score {
    halftime:  Goals;
    fulltime:  Goals;
    extratime: Goals;
    penalty:   Goals;
}
