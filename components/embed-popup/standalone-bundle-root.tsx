import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { getAppConfig } from '@/lib/env';
import type { EmbedUserData } from '@/lib/types';
import globalCss from '@/styles/globals.css';
import EmbedFixedAgentClient from './agent-client';

const scriptTag = document.querySelector<HTMLScriptElement>('script[data-lk-sandbox-id]');
const sandboxIdAttribute = scriptTag?.dataset.lkSandboxId;

if (sandboxIdAttribute) {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('id', 'lk-embed-wrapper');
  document.body.appendChild(wrapper);

  // Use a shadow root so that any relevant css classes don't leak out and effect the broader page
  const shadowRoot = wrapper.attachShadow({ mode: 'open' });

  // Include all app styles into the shadow root
  // FIXME: this includes styles for the welcome page / etc, not just the popup embed!
  const styleTag = document.createElement('style');
  styleTag.textContent = globalCss;
  shadowRoot.appendChild(styleTag);

  const reactRoot = document.createElement('div');
  shadowRoot.appendChild(reactRoot);

  // Optional user data from script tag: data-lk-name, data-lk-email (passed to agent as job metadata)
  const userData: EmbedUserData = {};
  const name = scriptTag?.dataset.lkName;
  const email = scriptTag?.dataset.lkEmail;
  if (name !== undefined) userData.name = name;
  if (email !== undefined) userData.email = email;

  getAppConfig(window.location.origin, sandboxIdAttribute)
    .then((appConfig) => {
      if (Object.keys(userData).length > 0) {
        appConfig.userData = userData;
      }
      const root = ReactDOM.createRoot(reactRoot);
      root.render(<EmbedFixedAgentClient appConfig={appConfig} />);
    })
    .catch((err) => {
      console.error('LiveKit popup embed error - Error loading app config:', err);
    });
} else {
  console.error(
    'LiveKit popup embed error - no data-lk-sandbox-id attribute found on script tag. This is required!'
  );
}
