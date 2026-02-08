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
  const user_id = typeof params.user_id === 'string' ? params.user_id : undefined;
  if (user_id !== undefined) userData.user_id = user_id;
  if (user_id !== undefined) appConfig.userData = userData;

  return (
    <>
      <ApplyThemeScript />
      <EmbedAgentClient appConfig={appConfig} />
    </>
  );
}
