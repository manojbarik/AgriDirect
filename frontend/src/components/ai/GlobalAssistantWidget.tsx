import React from 'react'
import { AgriDirectAssistantLauncher } from './AgriDirectAssistantLauncher'
import { AssistantPanel } from './AssistantPanel'

export const GlobalAssistantWidget: React.FC = () => {
  return (
    <>
      <AgriDirectAssistantLauncher />
      <AssistantPanel />
    </>
  )
}
