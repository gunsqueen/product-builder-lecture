interface StateBlockProps {
  title: string
  description: string
}

export const StateBlock = ({ title, description }: StateBlockProps) => (
  <div className="state-block">
    <h2>{title}</h2>
    <p>{description}</p>
  </div>
)
