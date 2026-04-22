/**
 * HoloPanel — holographic card/panel wrapper for the dashboard.
 * Applies the `holo-panel` CSS class (four-layer glass effect: translucent fill,
 * ::before gradient border via mask-composite, inset highlight, outer glow).
 * Corner accents are rendered as <span> elements (frees ::before for gradient border).
 * Not a replacement for the shared `Card` component — dashboard-only.
 */

/**
 * @param {{
 *   as?: keyof JSX.IntrinsicElements,
 *   className?: string,
 *   hoverable?: boolean,
 *   cornerAccents?: boolean,
 *   strong?: boolean,
 *   children: React.ReactNode,
 *   [key: string]: any,
 * }} props
 */
export default function HoloPanel({
  as: Tag = 'div',
  className = '',
  hoverable = false,
  cornerAccents = false,
  strong = false,
  children,
  ...rest
}) {
  const classes = [
    'holo-panel',
    hoverable && 'holo-panel-hover',
    strong && 'holo-panel--strong',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {cornerAccents && (
        <>
          <span className="holo-corner holo-corner--tl" aria-hidden="true" />
          <span className="holo-corner holo-corner--br" aria-hidden="true" />
        </>
      )}
      {children}
    </Tag>
  );
}
