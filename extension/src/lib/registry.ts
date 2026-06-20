import React from 'react'
import { ScoreboardWidget } from '../widgets/Scoreboard'
import { TimerWidget } from '../widgets/Timer'
import { StatPanelWidget } from '../widgets/StatPanel'
import { AlertWidget } from '../widgets/Alert'

type WidgetComponent = React.ComponentType<{ data: any }>

const registry: Record<string, WidgetComponent> = {
  scoreboard: ScoreboardWidget,
  timer: TimerWidget,
  statpanel: StatPanelWidget,
  alert: AlertWidget,
}

export function getWidget(type: string): WidgetComponent | null {
  return registry[type] ?? null
}
