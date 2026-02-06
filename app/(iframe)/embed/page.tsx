import { headers } from 'next/headers';
import EmbedAgentClient from '@/components/embed-iframe/agent-client';
import { ApplyThemeScript } from '@/components/embed-iframe/theme-provider';
import { getAppConfig, getOrigin } from '@/lib/env';
import type { EmbedUserData } from '@/lib/types';

interface EmbedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Embed({ searchParams }: EmbedPageProps) {
  const hdrs = await headers();
  const origin = getOrigin(hdrs);
  const appConfig = await getAppConfig(origin);
  const params = await searchParams;

  const userData: EmbedUserData = {};
  const name = typeof params.name === 'string' ? params.name : undefined;
  const email = typeof params.email === 'string' ? params.email : undefined;
  if (name !== undefined) userData.name = name;
  if (email !== undefined) userData.email = email;
  if (Object.keys(userData).length > 0) {
    appConfig.userData = userData;
  }

  return (
    <>
      <ApplyThemeScript />
      <EmbedAgentClient appConfig={appConfig} />
    </>
  );
}
