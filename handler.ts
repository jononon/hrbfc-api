import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import footballApi from "./adapters/football-api";
import { DynamoDBClient, PutItemCommand, GetItemCommand, ArchivalSummaryFilterSensitiveLog } from "@aws-sdk/client-dynamodb";
import { Fixture, Response, FixturesResponse } from "./adapters/football-api/fixturesResponseTypes";

const team_id = 4680;

const update = async () => {
  const cacheTableName = process.env.CACHED_TABLE_NAME;

  const client = new DynamoDBClient({ region: "us-east-1" });

  const data = await footballApi.getFixtures();
  
  let lastGame: Fixture | null = null;
  let nextGame: Fixture | null = null;
  let currentGame: Fixture | null = null;
  
  let fixtureList = data.response.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  for (const item of fixtureList) {
    if (["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD"].includes(item.fixture.status.short)) {
      lastGame = item.fixture;
    }

    if (item.fixture.status.short === "NS") {
      nextGame = item.fixture;
      break;
    }

    if ([ "1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE" ].includes(item.fixture.status.short)) {
      currentGame = item.fixture;
    }
  }

  const day = 1000 * 60 * 60 * 24;
  const minute = 1000 * 60;

  
  let dataExpiryTime = new Date(new Date().getTime() + day);
  if (currentGame) {
    dataExpiryTime = new Date(new Date().getTime() + minute);
  } else if (nextGame) {
    const nextGameDate = new Date(nextGame.date);
    //if next game was scheduled to start but has not yet started, set expiry to 1 minute
    if(nextGameDate < new Date()) {
      dataExpiryTime = new Date(new Date().getTime() + minute);
    } else if (nextGameDate < dataExpiryTime) {
      dataExpiryTime = nextGameDate;
    }
  }


  const command = new PutItemCommand({
    TableName: cacheTableName,
    Item: {
      "key": {
        S: "latest"
      } ,
      "data": {
        S: JSON.stringify(data)
      },
      "time_fetched": {
        S: new Date().toISOString()
      },
      "data_expiry_time": {
        S: dataExpiryTime.toISOString()
      }
    }
  });

  await client.send(command);

  return data
}

const getLatestFixtures = async () => {
  const cacheTableName = process.env.CACHED_TABLE_NAME;

  const client = new DynamoDBClient({ region: "us-east-1" });
  const command = new GetItemCommand({
    TableName: cacheTableName,
    Key: {
      "key": {
        S: "latest"
      }
    }
  });

  const cacheEntry = await client.send(command) as any

  let fixtures: FixturesResponse;

  if (cacheEntry.Item && new Date(cacheEntry.Item.data_expiry_time.S) > new Date()) {
    fixtures = JSON.parse(cacheEntry.Item.data.S);
  } else {
    fixtures = await update();
  }

  return fixtures;
}

export const getTeamNames = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const cacheTableName = process.env.CACHED_TABLE_NAME;

  const client = new DynamoDBClient({ region: "us-east-1" });
  const command = new GetItemCommand({
    TableName: cacheTableName,
    Key: {
      "key": {
        S: "teamNames"
      }
    }
  });

  const cacheEntry = await client.send(command) as any

  let teamNames;
  if (cacheEntry.Item && new Date(cacheEntry.Item.data_expiry_time.S) > new Date()) {
    teamNames = JSON.parse(cacheEntry.Item.data.S);
  } else {

    const fixtures = await getLatestFixtures();
    const leagueIds = [...new Set(fixtures.response.map((item) => item.league.id))];

    teamNames = {};


    for (const leagueId of leagueIds) {
      const data = await footballApi.getTeams(leagueId);
      
      for (const item of data.response) {
        teamNames[item.team.id] = {
          "long": item.team.name,
          "short": item.team.code
        }
      }
    }

    const command = new PutItemCommand({
      TableName: cacheTableName,
      Item: {
        "key": {
          S: "teamNames"
        } ,
        "data": {
          S: JSON.stringify(teamNames)
        },
        "time_fetched": {
          S: new Date().toISOString()
        },
        "data_expiry_time": {
          S: new Date(new Date().getTime() + (1000 * 60 * 60 * 24)).toISOString()
        }
      }
    });

    await client.send(command);

    return teamNames;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: teamNames,
        input: event,
      },
    ),
  };
}

export const updateCache = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

  const data = await update();

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: data,
        input: event,
      },
    ),
  };
};

export const getCurrentOrNextGame = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

  const fixtures = await getLatestFixtures();

  let lastGame: Response | null = null;
  let nextGame: Response | null = null;
  let currentGame: Response | null = null;

  let fixtureList = fixtures.response.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  for (const item of fixtureList) {
    if (["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD"].includes(item.fixture.status.short)) {
      lastGame = item;
    }

    if (item.fixture.status.short === "NS") {
      nextGame = item;
      break;
    }

    if ([ "1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE" ].includes(item.fixture.status.short)) {
      currentGame = item;
    }
  }
  
  const currentTime = new Date().getTime();
  let gameToReturn;

  if (currentGame) {
    gameToReturn = currentGame;
  } else if (lastGame && 
      nextGame &&
      Math.abs(new Date(lastGame.fixture.date).getTime() - currentTime) < Math.abs(new Date(nextGame.fixture.date).getTime() - currentTime) ) {
    gameToReturn = lastGame;
  } else {
    gameToReturn = nextGame;
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: gameToReturn,
        input: event,
      },
    ),
  };
};


export const getLatest = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

  const cacheTableName = process.env.CACHED_TABLE_NAME;

  const client = new DynamoDBClient({ region: "us-east-1" });
  const command = new GetItemCommand({
    TableName: cacheTableName,
    Key: {
      "key": {
        S: "latest"
      }
    }
  });

  const cacheEntry = await client.send(command) as any

  let fixtures;

  if (cacheEntry.Item) {
    fixtures = JSON.parse(cacheEntry.Item.data.S);
  } else {
    fixtures = await update();
  }

  let fixtureList = fixtures.response.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  const dataExpiryTime = new Date(cacheEntry.Item.data_expiry_time.S);

  if (dataExpiryTime < new Date()) {
    console.log("Fetching new data from football api")
    fixtures = await update();
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: fixtureList,
        input: event,
      },
    ),
  };
};
