/**
 * ImageWithFallback
 *
 * Renders an image if it loads successfully; otherwise renders a themed
 * icon tile. This lets recipe/exercise cards reference image paths that
 * don't exist yet (e.g. before Ali has uploaded real photos to /public)
 * without ever showing a broken image icon.
 */
export default function ImageWithFallback({ src, alt, icon = '🌿', gradientFrom = 'from-endo-purple/15', gradientTo = 'to-endo-pink/15', className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientTo} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          const fallback = e.currentTarget.nextSibling
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      <div className="hidden absolute inset-0 items-center justify-center text-4xl" aria-hidden="true">
        {icon}
      </div>
    </div>
  )
}
