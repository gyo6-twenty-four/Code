import { useId } from 'react'
import './writing-workspace.css'

export function WritingWorkspace({ source, result }) {
  return <div className="writing-workspace">{source}{result}</div>
}

export function WritingPane({ title, description, actions, variant, children, footer }) {
  const id = useId()
  return <section className={`writing-pane writing-pane--${variant}`} aria-labelledby={id}>
    <header className="writing-pane-heading">
      <div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>
      {actions}
    </header>
    <div className="writing-pane-body">{children}</div>
    {footer && <footer className="writing-pane-footer">{footer}</footer>}
  </section>
}
