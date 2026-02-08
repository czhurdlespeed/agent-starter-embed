import { NextResponse } from 'next/server';
import {
  AccessToken,
  type AccessTokenOptions,
  AgentDispatchClient,
  type VideoGrant,
} from 'livekit-server-sdk';

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Sandbox-Id',
  'Access-Control-Max-Age': '86400',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse agent configuration and optional user data from request body
    const body = await req.json();
    const agentName: string | undefined = body?.room_config?.agents?.[0]?.agent_name;
    const userData = body?.user_id ? { user_id: body.user_id } : undefined;
    const agentMetadata = userData ? JSON.stringify(userData) : '';

    const participantName = typeof body?.name === 'string' && body.name ? body.name : 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    // Use explicit dispatch so metadata is sent to the agent (token roomConfig metadata is not forwarded in some setups).
    if (agentName) {
      const agentDispatch = new AgentDispatchClient(LIVEKIT_URL, API_KEY, API_SECRET);
      await agentDispatch.createDispatch(roomName, agentName, {
        metadata: agentMetadata,
      });
    }

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  }
}

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
