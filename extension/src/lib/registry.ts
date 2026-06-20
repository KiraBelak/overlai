import React from 'react'
import { ScoreboardWidget } from '../widgets/Scoreboard'

type WidgetComponent = React.ComponentType<{ data: any }>

const registry: Record<string, WidgetComponent> = {
  scoreboard: ScoreboardWidget,
}

export function getWidget(type: string): WidgetComponent | null {
  return registry[type] ?? null
}
